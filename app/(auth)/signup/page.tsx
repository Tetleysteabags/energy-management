"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/supabase/auth-url";
import { formatAuthError, isRepeatedSignup } from "@/lib/supabase/auth-errors";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || pending) return;

    setError(null);
    setMessage(null);
    submittingRef.current = true;
    setPending(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        },
      });

      if (authError) {
        setError(formatAuthError(authError.message));
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      if (isRepeatedSignup(data.user)) {
        setMessage(
          "This email is already registered. No new confirmation email was sent. Try signing in, resend once below, or use Google.",
        );
        return;
      }

      setMessage(
        "Check your email for a confirmation link (including junk/spam). Use the latest email only.",
      );
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  async function handleResend() {
    if (!email || resendPending) return;

    setError(null);
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

    setMessage("A fresh confirmation email is on its way. Use that link — not an older one.");
  }

  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Card className="border-border/60 w-full max-w-sm shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Create account</CardTitle>
          <CardDescription>One person, one account. Health data stays private.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoogleSignInButton label="Sign up with Google" />
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
                autoComplete="new-password"
                minLength={8}
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
            {message ? (
              <div className="space-y-3" role="status">
                <p className="text-muted-foreground text-sm">{message}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full font-normal"
                  disabled={resendPending || !email}
                  onClick={handleResend}
                >
                  {resendPending ? "Sending…" : "Resend confirmation email"}
                </Button>
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
