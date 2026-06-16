import {
  CalendarDays,
  Home,
  LineChart,
  MoreHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const homeActive = (pathname: string) =>
  pathname === "/" || pathname.startsWith("/check-in");

const trendsActive = (pathname: string) => pathname.startsWith("/trends");

const moreActive = (pathname: string) =>
  pathname.startsWith("/more") ||
  pathname.startsWith("/help") ||
  pathname.startsWith("/settings") ||
  pathname.startsWith("/explore") ||
  pathname.startsWith("/reports") ||
  pathname.startsWith("/import") ||
  pathname.startsWith("/wearables") ||
  pathname.startsWith("/dashboard");

export const mobileNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home, isActive: homeActive },
  { href: "/trends", label: "Trends", icon: LineChart, isActive: trendsActive },
  { href: "/more", label: "More", icon: MoreHorizontal, isActive: moreActive },
];

export const desktopNavLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home, isActive: homeActive },
  { href: "/trends", label: "Trends", icon: LineChart, isActive: trendsActive },
  {
    href: "/analysis",
    label: "Patterns",
    icon: Sparkles,
    isActive: (pathname) => pathname.startsWith("/analysis"),
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
    isActive: (pathname) => pathname.startsWith("/events"),
  },
  { href: "/more", label: "More", icon: MoreHorizontal, isActive: moreActive },
];
