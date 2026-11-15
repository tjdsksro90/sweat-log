"use client";

import { CalendarDotsIcon, GearSixIcon, HouseIcon, type Icon, UsersThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";

const TABS: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "홈", icon: HouseIcon },
  { href: "/workouts", label: "기록", icon: CalendarDotsIcon },
  { href: "/crews", label: "크루", icon: UsersThreeIcon },
  { href: "/settings", label: "설정", icon: GearSixIcon },
];

const isActiveTab = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function BottomNavigation() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, icon: TabIcon, label }) => {
          const isActive = isActiveTab(pathname, href);

          return (
            <li key={href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
                href={href}
              >
                <TabIcon
                  aria-hidden="true"
                  className={isActive ? "rounded-lg bg-primary p-1 text-primary-foreground" : "p-1"}
                  size={32}
                  weight={isActive ? "fill" : "regular"}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
