"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { desktopNavLinks } from "@/components/dashboard/nav-links";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border/60 bg-card/50 sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r md:flex">
      <div className="px-5 py-6">
        <p className="text-sm font-medium tracking-tight">Recovery tracker</p>
        <p className="text-muted-foreground mt-0.5 text-xs">Private pattern log</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Main">
        {desktopNavLinks.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
