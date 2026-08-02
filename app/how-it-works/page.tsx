import Link from "next/link";
import { AccessRequestForm } from "@/components/marketing/access-request-form";
import { HowItWorksAccordion } from "@/components/marketing/how-it-works-accordion";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { HOW_IT_WORKS_PAGE } from "@/lib/marketing/how-it-works";
import { cn } from "@/lib/utils";

export default function HowItWorksPage() {
  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-2xl font-medium tracking-tight">{HOW_IT_WORKS_PAGE.brand}</p>
          <h1 className="text-xl font-medium">{HOW_IT_WORKS_PAGE.title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {HOW_IT_WORKS_PAGE.subtitle}
          </p>
        </header>

        <section className="space-y-2">
          <p className="text-muted-foreground text-center text-xs">Appearance</p>
          <ThemeToggle />
        </section>

        <HowItWorksAccordion />

        <section
          id="request-access"
          className="border-border/60 space-y-3 rounded-lg border bg-card px-4 py-4"
        >
          <h2 className="text-sm font-medium">Want access?</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This is a private app. If you&apos;d like to use it, submit a short request —
            someone will follow up when a spot is available.
          </p>
          <AccessRequestForm />
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 flex-1 font-normal")}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ variant: "ghost" }), "min-h-11 flex-1 font-normal")}
          >
            Create account
          </Link>
        </div>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          Already invited? Sign in above. New accounts may need confirmation before they work.
        </p>
      </div>
    </div>
  );
}
