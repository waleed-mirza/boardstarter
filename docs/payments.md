# Payments

Boardstarter uses Lemon Squeezy as the merchant of record behind a small provider
adapter. The webhook is the only path that can turn a draft into a paid listing.

## Configure Lemon Squeezy

1. Create a Lemon Squeezy store and enable test mode while developing.
2. Create one product with three variants matching the seeded `packages` rows.
   The value in `packages.ls_variant_id` must be the corresponding Lemon variant
   ID (the seed uses readable IDs for local/test environments).
3. Set the webhook URL to
   `https://<your-domain>/api/webhooks/lemonsqueezy` and subscribe to
   `order_created` and `order_refunded`.
4. Copy the store ID, API key, and webhook signing secret into the environment:

   ```text
   PAYMENT_PROVIDER=lemonsqueezy
   LEMONSQUEEZY_API_KEY=...
   LEMONSQUEEZY_STORE_ID=...
   LEMONSQUEEZY_WEBHOOK_SECRET=...
   ```

   The webhook secret is server-only. It must never use a `NEXT_PUBLIC_` name or
   be logged.

For local webhook development, expose the local server with a tunnel and use
the tunnel URL in Lemon Squeezy. Test-mode orders do not charge a real card.

## Payment flow

`createCheckout` is a server action. It authorizes the employer and reads the
job and package from Supabase through RLS. Only the trusted package row supplies
the price, duration, featured flag, currency, and Lemon variant ID. The browser
can select a package UUID, but cannot submit a price or duration.

The provider adapter sends the job ID and package ID in checkout custom data and
returns the provider checkout URL. The success page shows a processing state
until the signed webhook has completed.

The webhook route reads the raw request text, verifies `X-Signature` with
HMAC-SHA256 and a timing-safe comparison, then normalizes the provider payload.
The service-role-only database function performs the order insert and protected
job transition atomically:

- a matching `order_created` creates a paid order and publishes the job, or puts
  it in `pending_review` when `auto_publish_on_payment` is disabled;
- a featured package sets `featured_until` to the payment expiry;
- a renewal extends from `greatest(now(), expires_at)`;
- an amount/currency mismatch creates a `disputed` order and never publishes;
- `order_refunded` marks the order refunded and expires the job;
- a refund received before payment is kept as a durable tombstone, so a late
  payment cannot publish the listing.

`payment_webhook_events` and the unique provider order ID make retries and
concurrent duplicate deliveries safe. Every webhook emits a redacted
structured log containing the event, order ID, job ID, and result.

## Local fake provider

Use the deterministic adapter for local and E2E runs:

```text
PAYMENT_PROVIDER=fake
LEMONSQUEEZY_WEBHOOK_SECRET=local-test-secret
```

`FakePaymentProvider` records checkout inputs and accepts the same signed,
Lemon-shaped envelopes as the real adapter. It is intentionally opt-in; a
production deployment defaults to Lemon Squeezy and requires all three Lemon
configuration variables.

## Tests

Run the focused adapter suite and the full gates with:

```bash
pnpm test:payments
pnpm test:unit
pnpm test:int
pnpm test:db
pnpm test:e2e
```

The database tests cover publication, review mode, refunds, amount mismatch,
duplicate deliveries, refund-before-payment, and service-role privileges. The
integration tests additionally send ten concurrent identical deliveries and
assert one order and one publication.

## Swapping providers

Implement `PaymentProvider` in `src/lib/payments/types.ts`:

```ts
type PaymentProvider = {
  createCheckout(input: CheckoutInput): Promise<{ url: string }>;
  parseWebhook(request: Request): Promise<WebhookEvent>;
};
```

The adapter must verify its own webhook signature and normalize events to
`order_paid`, `order_refunded`, `subscription_changed`, or `ignore`. Add the
provider to `getPaymentProvider` in `src/lib/payments/index.ts`; route handlers,
actions, and the database transition do not need provider-specific changes.
