"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/tasks", label: "All Tasks", match: (path: string) => path === "/tasks" },
  {
    href: "/tasks/my",
    label: "My Tasks",
    match: (path: string) => path === "/tasks/my",
  },
] as const;

export function StandaloneTasksTabs() {
  const pathname = usePathname();

  return (
    <div className="w-full min-w-0 shrink-0 border-b bg-background px-6">
      <nav
        className="-mb-px flex gap-6"
        aria-label="Standalone task lists"
      >
        {tabs.map((tab) => {
          const isActive = tab.match(pathname);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "border-b-2 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
