import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="border-border/60 bg-card w-full max-w-sm space-y-4 rounded-lg border px-5 py-6">
        <div className="space-y-2">
          <h1 className="text-lg font-medium">Nothing here</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            That page doesn&apos;t exist — the link may be old, or slightly mistyped.
          </p>
        </div>
        <Link href="/" className={cn(buttonVariants(), "min-h-11 w-full font-normal")}>
          Back to today
        </Link>
      </div>
    </div>
  );
}
