"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/supabase/auth-url";
import { formatAuthError } from "@/lib/supabase/auth-errors";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const authError = searchParams.get("error");
    if (authError === "confirmation_link_invalid") {
      return "That confirmation link is invalid or has expired. Request a fresh one below.";
    }
    if (authError === "auth_callback_failed") {
      return "Sign-in didn't complete. Try Google again, or use email below.";
    }
    return null;
  });
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || pending) return;

    setError(null);
    setInfo(null);
    submittingRef.current = true;
    setPending(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const needsConfirmation =
          authError.message.toLowerCase().includes("email not confirmed") ||
          authError.message.toLowerCase().includes("not confirmed");

        if (needsConfirmation) {
          setError("Confirm your email first, then sign in.");
          setInfo(
            "Check junk/spam for mail from Supabase. Use the latest link, resend once below, or continue with Google.",
          );
        } else {
          setError(formatAuthError(authError.message));
        }
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  async function handleResend() {
    if (!email || resendPending) return;

    setError(null);
    setInfo(null);
    setResendPending(true);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });

    setResendPending(false);

    if (resendError) {
      setError(formatAuthError(resendError.message));
      return;
    }

    setInfo("A fresh confirmation email is on its way. Use that link — not an older one.");
  }

  const showResend = Boolean(error || info);

  return (
    <Card className="border-border/60 w-full max-w-sm shadow-none">
      <CardHeader>
        <CardTitle className="text-xl font-medium">Sign in</CardTitle>
        <CardDescription>Private recovery logging — your data stays yours.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton />
        <AuthDivider />
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-muted-foreground text-sm" role="status">
              {info}
            </p>
          ) : null}
          {showResend ? (
            <Button
              type="button"
              variant="outline"
              className="w-full font-normal"
              disabled={resendPending || !email}
              onClick={handleResend}
            >
              {resendPending ? "Sending…" : "Resend confirmation email"}
            </Button>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          No account?{" "}
          <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
