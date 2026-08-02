"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/supabase/auth-errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;

type SessionState = "checking" | "ready" | "missing";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submittingRef = useRef(false);

  // Reaching this page means the recovery link already established a session.
  // Without one there is nothing to update, so say so rather than failing later.
  useEffect(() => {
    let active = true;

    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setSessionState(data.user ? "ready" : "missing");
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || pending) return;

    if (password !== confirmation) {
      setError("Those two passwords don't match.");
      return;
    }

    setError(null);
    submittingRef.current = true;
    setPending(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(formatAuthError(updateError.message));
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Card className="border-border/60 w-full max-w-sm shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Choose a new password</CardTitle>
          <CardDescription>At least {MIN_PASSWORD_LENGTH} characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionState === "missing" ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed" role="alert">
                That reset link has expired or was already used. Request a fresh one — only the
                most recent link works.
              </p>
              <Link href="/forgot-password" className="block">
                <Button type="button" variant="outline" className="min-h-11 w-full font-normal">
                  Request a new link
                </Button>
              </Link>
            </div>
          ) : null}

          {sessionState === "ready" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="confirm-password">Confirm new password</Label>
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
              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="min-h-11 w-full" disabled={pending}>
                {pending ? "Saving…" : "Save new password"}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
