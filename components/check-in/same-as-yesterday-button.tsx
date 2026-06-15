"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SameAsYesterdayButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export function SameAsYesterdayButton({
  onClick,
  disabled,
  className,
}: SameAsYesterdayButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "border-info/30 bg-info/10 text-info-foreground hover:bg-info/15 h-11 w-full gap-2 text-sm font-medium",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Check className="size-4" aria-hidden />
      Same as yesterday
    </Button>
  );
}
