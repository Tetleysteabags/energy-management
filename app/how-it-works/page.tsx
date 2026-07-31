import Link from "next/link";
import { HowItWorksAccordion } from "@/components/marketing/how-it-works-accordion";
import { buttonVariants } from "@/components/ui/button";
import { getAccessRequestUrl } from "@/lib/marketing/access-request";
import { HOW_IT_WORKS_PAGE } from "@/lib/marketing/how-it-works";
import { cn } from "@/lib/utils";

export default function HowItWorksPage() {
  const accessRequestUrl = getAccessRequestUrl();

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

        <HowItWorksAccordion />

        <section className="border-border/60 space-y-3 rounded-lg border bg-card px-4 py-4">
          <h2 className="text-sm font-medium">Want access?</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This is a private app. If you&apos;d like to use it, submit a short request form —
            someone will follow up when a spot is available.
          </p>
          <a
            href={accessRequestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "default" }), "min-h-11 w-full font-normal")}
          >
            Request access
          </a>
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
