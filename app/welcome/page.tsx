"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/supabase/auth-url";
import { formatAuthError } from "@/lib/supabase/auth-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Landing page for a freshly-invited account. An invite link signs someone in
 * immediately but leaves no password and no linked provider — without this,
 * the first session expiring is a dead end with only "forgot password" (which
 * does work, since Supabase treats it the same regardless of whether a
 * password was ever set) to get back in. Reachable any time from Settings, not
 * just right after the invite.
 */
export default function WelcomePage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);
  const passwordSubmitting = useRef(false);

  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  async function handleSetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwordSubmitting.current || passwordPending) return;

    if (password !== confirmation) {
      setPasswordError("Those two passwords don't match.");
      return;
    }

    setPasswordError(null);
    passwordSubmitting.current = true;
    setPasswordPending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setPasswordError(formatAuthError(error.message));
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      passwordSubmitting.current = false;
      setPasswordPending(false);
    }
  }

  async function handleLinkGoogle() {
    if (googlePending) return;

    setGoogleError(null);
    setGooglePending(true);

    const supabase = createClient();
    // Attaches Google to *this* account rather than creating or switching to a
    // different one — requires manual identity linking enabled in Supabase
    // (Authentication settings). Redirects the browser; nothing after this
    // runs unless it fails before the redirect fires.
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: getAuthCallbackUrl() },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      setGoogleError(
        lower.includes("manual linking")
          ? "Google sign-in linking isn't turned on for this app yet. Set a password below instead, or ask whoever runs the app to enable it."
          : lower.includes("already")
            ? "That Google account is already linked elsewhere. Set a password below instead."
            : formatAuthError(error.message),
      );
      setGooglePending(false);
    }
  }

  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        <Card className="border-border/60 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-medium">You&apos;re in</CardTitle>
            <CardDescription>
              One thing before you start — choose how you&apos;ll sign back in next time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full font-normal"
                disabled={googlePending}
                onClick={handleLinkGoogle}
              >
                {googlePending ? "Redirecting…" : "Continue with Google"}
              </Button>
              {googleError ? (
                <p className="text-destructive text-sm" role="alert">
                  {googleError}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-xs">or set a password</span>
              <div className="bg-border h-px flex-1" />
            </div>

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              {passwordError ? (
                <p className="text-destructive text-sm" role="alert">
                  {passwordError}
                </p>
              ) : null}
              <Button type="submit" className="min-h-11 w-full" disabled={passwordPending}>
                {passwordPending ? "Saving…" : "Set password"}
              </Button>
            </form>

            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              Skipping for now?{" "}
              <Link href="/" className="text-foreground underline-offset-4 hover:underline">
                Go to today
              </Link>{" "}
              — you can come back to this page any time from Settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
