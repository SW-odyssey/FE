"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Home, Search } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/search", label: "검색", icon: Search },
  { href: "/my", label: "내 코스", icon: Bookmark },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 mt-auto flex shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-11",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("size-5", active && "fill-primary/10")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
