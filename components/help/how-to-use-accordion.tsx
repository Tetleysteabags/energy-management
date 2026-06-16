"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { HOW_TO_SECTIONS } from "@/lib/help/how-to-use";
import { cn } from "@/lib/utils";

type HowToUseAccordionProps = {
  wearableConnected: boolean;
};

export function HowToUseAccordion({ wearableConnected }: HowToUseAccordionProps) {
  return (
    <div className="border-border/60 divide-border/60 divide-y rounded-lg border">
      {HOW_TO_SECTIONS.map((section) => {
        const Icon = section.icon;

        return (
          <details
            key={section.id}
            open={section.defaultOpen}
            className="group px-4"
          >
            <summary
              className={cn(
                "flex min-h-11 cursor-pointer list-none items-center gap-3 py-3",
                "[&::-webkit-details-marker]:hidden",
              )}
            >
              <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="flex-1 text-sm font-medium">{section.title}</span>
              <ChevronDown
                className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>

            <div className="text-muted-foreground space-y-3 pb-4 text-sm leading-relaxed">
              {section.blocks.map((block, index) => {
                if (block.type === "paragraph") {
                  return <p key={`${section.id}-p-${index}`}>{block.text}</p>;
                }

                if (block.type === "bullets") {
                  return (
                    <ul key={`${section.id}-ul-${index}`} className="space-y-1.5">
                      {block.items.map((item) => (
                        <li key={item}>· {item}</li>
                      ))}
                    </ul>
                  );
                }

                if (block.type === "steps") {
                  return (
                    <ol
                      key={`${section.id}-ol-${index}`}
                      className="list-decimal space-y-1.5 pl-4"
                    >
                      {block.items.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  );
                }

                if (block.type === "wearables-link" && !wearableConnected) {
                  return (
                    <Link
                      key={`${section.id}-wearables`}
                      href="/wearables"
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "min-h-10 w-full font-normal",
                      )}
                    >
                      Connect wearables
                    </Link>
                  );
                }

                return null;
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
