"use client";

import { useState, useTransition } from "react";
import { deleteAccountAndRedirect } from "@/app/actions/account";
import { DELETE_CONFIRMATION, isDeletionConfirmed } from "@/lib/account/deletion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountForm() {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAndRedirect(confirmation);
      if (result?.error) setError(result.error);
    });
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full font-normal"
        onClick={() => setConfirming(true)}
      >
        Delete my account
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed">
        This deletes your account and every check-in, event, note and wearable reading attached to
        it. It cannot be undone. If you want a copy first, download your CSV above.
      </p>
      <div className="space-y-2">
        <Label htmlFor="delete-confirmation">
          Type {DELETE_CONFIRMATION} to confirm
        </Label>
        <Input
          id="delete-confirmation"
          value={confirmation}
          autoComplete="off"
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1 font-normal"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setConfirmation("");
            setError(null);
          }}
        >
          Keep my account
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-1"
          disabled={pending || !isDeletionConfirmed(confirmation)}
          onClick={handleDelete}
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
      </div>
    </div>
  );
}
