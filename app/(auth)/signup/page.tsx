import Link from "next/link";
import { Suspense } from "react";
import { isSignupOpen } from "@/app/actions/invite";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SignupPage() {
  // No invite code configured means the door is shut, not wide open.
  const open = await isSignupOpen();

  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center justify-center px-4 py-12">
      {open ? (
        <Suspense>
          <SignupForm />
        </Suspense>
      ) : (
        <Card className="border-border/60 w-full max-w-sm shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Invite only</CardTitle>
            <CardDescription>
              New accounts aren&apos;t open at the moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              This app is shared with a small number of people at a time. Ask for a spot and
              someone will follow up when one is free.
            </p>
            <Link
              href="/how-it-works#request-access"
              className={cn(buttonVariants(), "min-h-11 w-full font-normal")}
            >
              Request access
            </Link>
            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
