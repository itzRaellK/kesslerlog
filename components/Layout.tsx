"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  Gamepad2,
  Home,
  Library,
  Clapperboard,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems: {
  label: string;
  path: string;
  icon: LucideIcon;
  /** rótulo curto na barra inferior */
  shortLabel: string;
}[] = [
  { label: "Home", path: "/", icon: Home, shortLabel: "Home" },
  { label: "Jogos", path: "/jogos", icon: Library, shortLabel: "Jogos" },
  {
    label: "Sessões & Reviews",
    path: "/sessoes",
    icon: Clapperboard,
    shortLabel: "Sessões",
  },
  { label: "Stats", path: "/stats", icon: BarChart3, shortLabel: "Stats" },
  {
    label: "Configurações",
    path: "/configuracoes",
    icon: Settings,
    shortLabel: "Ajustes",
  },
];

function isNavActive(path: string, pathname: string) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function navLinkClass(active: boolean) {
  return cn(
    "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
    active
      ? "border border-emerald-500/45 bg-emerald-500/10 text-emerald-800 shadow-sm dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "border border-transparent text-muted-foreground hover:border-emerald-500/15 hover:bg-emerald-500/5 hover:text-foreground",
  );
}

function navIconClass(active: boolean) {
  return cn(
    "h-4 w-4 shrink-0 transition-colors",
    active
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-muted-foreground group-hover:text-emerald-700/80 dark:group-hover:text-emerald-400/90",
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-emerald-500/15 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 sm:px-8">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 rounded-lg border border-transparent px-1 py-1 font-semibold tracking-tight transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/5"
          >
            <Gamepad2 className="h-5 w-5 text-emerald-600 transition-colors group-hover:text-emerald-500 dark:text-emerald-400" />
            <span className="hidden text-sm sm:inline">KesslerLog</span>
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.path, pathname);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn("group shrink-0", navLinkClass(active))}
                >
                  <Icon className={navIconClass(active)} aria-hidden />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              suppressHydrationWarning
              aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
            >
              {!mounted ? (
                <span className="inline-block h-4 w-4" aria-hidden />
              ) : theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <button
              type="button"
              className="flex h-9 w-9 cursor-default items-center justify-center rounded-lg border border-emerald-500/35 bg-emerald-500/10 text-xs font-semibold text-emerald-800 tabular-nums dark:border-emerald-500/30 dark:text-emerald-300"
              aria-label="Conta"
            >
              U
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pb-24 pt-6 sm:px-8 md:pb-6">
        {children}
      </main>

      {/* Barra inferior (mobile): mesma hierarquia e destaque esmeralda */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-emerald-500/20 bg-background/90 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-md md:hidden"
        aria-label="Navegação principal"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item.path, pathname);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
                active
                  ? "border border-emerald-500/45 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/35 dark:text-emerald-300"
                  : "border border-transparent text-muted-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
                aria-hidden
              />
              <span className="max-w-full truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
