"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LineChart, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/trends", label: "Trends", icon: LineChart },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-border/60 bg-background/95 fixed inset-x-0 bottom-0 z-10 border-t backdrop-blur"
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-lg grid-cols-3 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/" || pathname.startsWith("/check-in")
              : pathname.startsWith(href);

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
