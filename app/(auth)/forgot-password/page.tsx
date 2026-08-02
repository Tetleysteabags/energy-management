"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPasswordResetUrl } from "@/lib/supabase/auth-url";
import { formatAuthError } from "@/lib/supabase/auth-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(() =>
    searchParams.get("error") === "reset_link_invalid"
      ? "That reset link has expired or was already used. Request a fresh one below."
      : null,
  );
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || pending) return;

    setError(null);
    submittingRef.current = true;
    setPending(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getPasswordResetUrl(),
      });

      if (resetError) {
        setError(formatAuthError(resetError.message));
        return;
      }

      setSent(true);
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  return (
      <Card className="border-border/60 w-full max-w-sm shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Reset your password</CardTitle>
          <CardDescription>
            We&apos;ll email you a link to set a new one. Your logs stay exactly as they are.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="space-y-4">
              {/*
                Deliberately the same message whether or not the address exists —
                otherwise this page becomes a way to test who has an account.
              */}
              <p className="text-sm leading-relaxed" role="status">
                If an account exists for that address, a reset link is on its way. Check junk or
                spam too — and use the most recent email, as older links stop working.
              </p>
              <Link href="/login" className="block">
                <Button type="button" variant="outline" className="min-h-11 w-full font-normal">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="min-h-11 w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}

          <p className="text-muted-foreground text-center text-sm">
            Remembered it?{" "}
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
