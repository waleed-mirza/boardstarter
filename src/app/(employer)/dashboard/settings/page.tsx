import type { Metadata } from "next";

import { PageHeader } from "@/components/patterns/page-header";
import { CompanyProfileForm, ProfileForm } from "@/components/settings/account-forms";
import { Button } from "@/components/ui/button";
import { CompanyLogoUploader } from "@/components/settings/company-logo-uploader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOutAction } from "@/lib/actions/auth";
import { getOptionalUser } from "@/lib/auth/guards";
import { getCompanyById } from "@/lib/data/companies";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false },
};

/** Account settings (Week 3 task 10): name, company profile, sign out. */
export default async function SettingsPage() {
  const user = await getOptionalUser();
  if (!user) return null;

  const supabase = await createClient();
  const company = user.companyId ? await getCompanyById(supabase, user.companyId) : null;

  return (
    <>
      <PageHeader title="Settings" description="Your account and company profile." />
      <div className="flex max-w-[640px] flex-col gap-6">
        <ProfileForm fullName={user.fullName} />
        {company ? (
          <>
            <CompanyProfileForm company={company} />
            <Card>
              <CardHeader>
                <CardTitle>Branding</CardTitle>
                <CardDescription>Use a square mark so candidates recognize your company at a glance.</CardDescription>
              </CardHeader>
              <CardContent><CompanyLogoUploader company={company} /></CardContent>
            </Card>
          </>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Signed in as {user.email}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signOutAction}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
