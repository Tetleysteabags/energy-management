"use client";

import { ChevronDown } from "lucide-react";
import { DATA_PRIVACY } from "@/lib/marketing/data-privacy";
import { cn } from "@/lib/utils";

export function DataPrivacyAccordion() {
  const Icon = DATA_PRIVACY.icon;

  return (
    <div className="border-border/60 divide-border/60 divide-y rounded-lg border">
      <details className="group px-4">
        <summary
          className={cn(
            "flex min-h-11 cursor-pointer list-none items-center gap-3 py-3",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-sm font-medium">{DATA_PRIVACY.title}</span>
          <ChevronDown
            className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>

        <div className="space-y-4 pb-4">
          <p className="text-muted-foreground text-sm leading-relaxed">{DATA_PRIVACY.intro}</p>

          <div className="border-border/60 divide-border/60 divide-y rounded-lg border">
            {DATA_PRIVACY.sections.map((section) => (
              <details key={section.id} className="group/inner px-3">
                <summary
                  className={cn(
                    "flex min-h-11 cursor-pointer list-none items-center gap-2 py-2.5",
                    "[&::-webkit-details-marker]:hidden",
                  )}
                >
                  <span className="flex-1 text-sm font-medium">{section.title}</span>
                  <ChevronDown
                    className="text-muted-foreground size-3.5 shrink-0 transition-transform group-open/inner:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="text-muted-foreground space-y-2 pb-3 text-sm leading-relaxed">
                  {section.paragraphs.map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}
