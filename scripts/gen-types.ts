import { writeFile } from "node:fs/promises";

import { testDatabaseClient } from "./lib/db";

type Column = {
  table_name: string;
  column_name: string;
  sql_type: string;
  not_null: boolean;
  default_expression: string | null;
  generated: string;
};

type Enum = { name: string; values: string[] };
type Relationship = {
  table_name: string;
  foreign_key_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
};

const APP_TABLES = [
  "profiles",
  "companies",
  "categories",
  "tags",
  "packages",
  "jobs",
  "job_tags",
  "orders",
  "payment_webhook_events",
  "admin_actions",
  "subscribers",
  "applications",
  "site_settings",
  "rate_limits",
  "email_queue",
] as const;

function quote(value: string): string {
  return JSON.stringify(value);
}

function typeScriptType(sqlType: string, enumNames: Set<string>): string {
  if (sqlType.endsWith("[]")) {
    return `${typeScriptType(sqlType.slice(0, -2), enumNames)}[]`;
  }
  const enumName = sqlType.startsWith("public.") ? sqlType.slice("public.".length) : sqlType;
  if (enumNames.has(enumName)) {
    return `Database["public"]["Enums"][${quote(enumName)}]`;
  }
  if (["smallint", "integer", "bigint", "numeric", "real", "double precision"].includes(sqlType)) {
    return "number";
  }
  if (["boolean"].includes(sqlType)) return "boolean";
  if (["json", "jsonb"].includes(sqlType)) return "Json";
  if (
    [
      "uuid",
      "text",
      "character varying",
      "character",
      "date",
      "timestamp with time zone",
      "timestamp without time zone",
      "time with time zone",
      "time without time zone",
      "tsvector",
      "bytea",
    ].includes(sqlType)
  ) {
    return "string";
  }
  return "string";
}

function nullableType(column: Column, enumNames: Set<string>): string {
  const type = typeScriptType(column.sql_type, enumNames);
  return column.not_null ? type : `${type} | null`;
}

function rowType(columns: Column[], enumNames: Set<string>): string {
  return columns
    .map((column) => `          ${quote(column.column_name)}: ${nullableType(column, enumNames)};`)
    .join("\n");
}

function insertType(columns: Column[], enumNames: Set<string>): string {
  return columns
    .filter((column) => !column.generated)
    .map((column) => {
      const optional = !column.not_null || column.default_expression !== null;
      return `          ${quote(column.column_name)}${optional ? "?" : ""}: ${nullableType(column, enumNames)};`;
    })
    .join("\n");
}

function updateType(columns: Column[], enumNames: Set<string>): string {
  return columns
    .filter((column) => !column.generated)
    .map((column) => `          ${quote(column.column_name)}?: ${nullableType(column, enumNames)};`)
    .join("\n");
}

function relationshipType(tableName: string, relationships: Relationship[]): string {
  const tableRelationships = relationships.filter((item) => item.table_name === tableName);
  if (tableRelationships.length === 0) return "[]";
  return `[\n${tableRelationships
    .map(
      (item) =>
        `          { foreignKeyName: ${quote(item.foreign_key_name)}; columns: [${quote(item.column_name)}]; isOneToOne: false; referencedRelation: ${quote(item.foreign_table_name)}; referencedColumns: [${quote(item.foreign_column_name)}]; }`,
    )
    .join(",\n")}\n        ]`;
}

async function main() {
  const client = testDatabaseClient();
  await client.connect();
  try {
    const { rows: columns } = await client.query<Column>(
      `
      select c.relname as table_name,
             a.attname as column_name,
             format_type(a.atttypid, a.atttypmod) as sql_type,
             a.attnotnull as not_null,
             pg_get_expr(ad.adbin, ad.adrelid) as default_expression,
             a.attgenerated as generated
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
      left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
      where n.nspname = 'public'
        and c.relkind = 'r'
        and a.attnum > 0
        and not a.attisdropped
        and c.relname = any($1::text[])
      order by c.relname, a.attnum
    `,
      [APP_TABLES],
    );
    const { rows: enumRows } = await client.query<{ name: string; value: string; sort: number }>(`
      select t.typname as name, e.enumlabel as value, e.enumsortorder as sort
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
      where n.nspname = 'public'
      order by t.typname, e.enumsortorder
    `);
    const { rows: relationships } = await client.query<Relationship>(`
      select child.relname as table_name,
             con.conname as foreign_key_name,
             child_attribute.attname as column_name,
             parent.relname as foreign_table_name,
             parent_attribute.attname as foreign_column_name
      from pg_constraint con
      join pg_class child on child.oid = con.conrelid
      join pg_namespace child_schema on child_schema.oid = child.relnamespace
      join pg_class parent on parent.oid = con.confrelid
      join pg_namespace parent_schema on parent_schema.oid = parent.relnamespace
      join unnest(con.conkey) with ordinality child_key(attnum, position) on true
      join unnest(con.confkey) with ordinality parent_key(attnum, position)
        on parent_key.position = child_key.position
      join pg_attribute child_attribute
        on child_attribute.attrelid = child.oid and child_attribute.attnum = child_key.attnum
      join pg_attribute parent_attribute
        on parent_attribute.attrelid = parent.oid and parent_attribute.attnum = parent_key.attnum
      where con.contype = 'f'
        and child_schema.nspname = 'public'
        and parent_schema.nspname = 'public'
      order by child.relname, con.conname, child_key.position
    `);
    const enums: Enum[] = [];
    for (const row of enumRows) {
      const current = enums.find((item) => item.name === row.name);
      if (current) current.values.push(row.value);
      else enums.push({ name: row.name, values: [row.value] });
    }
    const enumNames = new Set(enums.map((item) => item.name));
    const tableBlocks = APP_TABLES.map((tableName) => {
      const tableColumns = columns.filter((column) => column.table_name === tableName);
      return `      ${quote(tableName)}: {\n        Row: {\n${rowType(tableColumns, enumNames)}\n        };\n        Insert: {\n${insertType(tableColumns, enumNames)}\n        };\n        Update: {\n${updateType(tableColumns, enumNames)}\n        };\n        Relationships: ${relationshipType(tableName, relationships)};\n      };`;
    }).join("\n");
    const enumBlock = enums
      .map((item) => `      ${quote(item.name)}: ${item.values.map(quote).join(" | ")};`)
      .join("\n");
    const output = `// Generated by pnpm gen:types from the live public schema. Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
${tableBlocks}
    };
    Views: { [_ in never]: never };
    Functions: {
      search_public_jobs: {
        Args: { p_filters?: Json; p_page?: number; p_page_size?: number };
        Returns: Json;
      };
      get_public_job_by_slug: {
        Args: { p_slug: string };
        Returns: Json;
      };
      get_public_job_facets: {
        Args: { p_filters?: Json };
        Returns: Json;
      };
      get_public_company_by_slug: {
        Args: { p_slug: string };
        Returns: Json;
      };
      list_public_companies: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_public_board_stats: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      increment_job_counter: {
        Args: { p_job_id: string; p_kind: string };
        Returns: number;
      };
      create_company_for_profile: {
        Args: {
          p_name: string;
          p_website: string | null;
          p_location: string | null;
          p_description: string | null;
        };
        Returns: string;
      };
      close_employer_job: {
        Args: { p_job_id: string };
        Returns: boolean;
      };
      process_paid_order: {
        Args: {
          p_provider: string;
          p_job_id: string;
          p_provider_order_id: string;
          p_provider_customer_id: string | null;
          p_package_id: string | null;
          p_provider_variant_id: string | null;
          p_amount_cents: number;
          p_currency: string;
          p_raw: Json;
        };
        Returns: Json;
      };
      process_refunded_order: {
        Args: {
          p_provider: string;
          p_provider_order_id: string;
          p_job_id: string | null;
          p_raw: Json;
        };
        Returns: Json;
      };
      admin_approve_job: {
        Args: { p_job_id: string };
        Returns: Json;
      };
      admin_reject_job: {
        Args: { p_job_id: string; p_reason: string };
        Returns: Json;
      };
      admin_set_job_featured: {
        Args: { p_job_id: string; p_featured: boolean };
        Returns: Json;
      };
      admin_extend_job: {
        Args: { p_job_id: string; p_days: number };
        Returns: Json;
      };
      admin_force_expire_job: {
        Args: { p_job_id: string };
        Returns: Json;
      };
      admin_delete_job: {
        Args: { p_job_id: string };
        Returns: Json;
      };
      admin_upsert_package: {
        Args: {
          p_id: string | null;
          p_name: string;
          p_price_cents: number;
          p_currency: string;
          p_duration_days: number;
          p_is_featured: boolean;
          p_ls_variant_id: string;
          p_is_active: boolean;
          p_sort: number;
        };
        Returns: Json;
      };
      admin_delete_package: {
        Args: { p_id: string };
        Returns: Json;
      };
      admin_upsert_category: {
        Args: { p_id: string | null; p_name: string; p_slug: string; p_description: string | null; p_sort: number };
        Returns: Json;
      };
      admin_merge_category: {
        Args: { p_source_id: string; p_target_id: string };
        Returns: Json;
      };
      admin_delete_category: {
        Args: { p_id: string; p_reassign_to: string | null };
        Returns: Json;
      };
      admin_upsert_tag: {
        Args: { p_id: string | null; p_name: string; p_slug: string };
        Returns: Json;
      };
      admin_merge_tag: {
        Args: { p_source_id: string; p_target_id: string };
        Returns: Json;
      };
      admin_delete_tag: {
        Args: { p_id: string; p_reassign_to: string | null };
        Returns: Json;
      };
      admin_update_site_settings: {
        Args: { p_settings: Json };
        Returns: Json;
      };
      subscribe_to_alerts: {
        Args: { p_email: string; p_categories?: string[]; p_frequency?: Database["public"]["Enums"]["alert_frequency"] };
        Returns: Json;
      };
      confirm_alert_subscription: {
        Args: { p_email: string; p_token: string };
        Returns: boolean;
      };
      unsubscribe_alert_subscription: {
        Args: { p_email: string; p_token: string };
        Returns: boolean;
      };
      expire_due_jobs: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      enqueue_due_digests: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      enqueue_renewal_nudges: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      claim_email_queue: {
        Args: { p_limit?: number; p_claim_token?: string };
        Returns: Json;
      };
      mark_email_sent: {
        Args: { p_id: string; p_claim_token: string; p_provider_message_id?: string | null };
        Returns: boolean;
      };
      mark_email_failed: {
        Args: { p_id: string; p_claim_token: string; p_error: string };
        Returns: boolean;
      };
      get_public_seo_catalog: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      consume_rate_limit: {
        Args: { p_key: string; p_limit?: number; p_window_seconds?: number };
        Returns: boolean;
      };
    };
    Enums: {
${enumBlock}
    };
    CompositeTypes: { [_ in never]: never };
  };
};
`;
    await writeFile("src/lib/supabase/types.ts", output, "utf8");
    console.log("✓ Generated src/lib/supabase/types.ts");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("✖ type generation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
