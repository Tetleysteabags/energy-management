"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mobileNavLinks } from "@/components/dashboard/nav-links";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-border/60 bg-background/95 fixed inset-x-0 bottom-0 z-10 border-t backdrop-blur md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-lg grid-cols-3 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {mobileNavLinks.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
