"use client";

import type { ReactNode } from "react";
import { Gamepad2 } from "lucide-react";

type AuthShellProps = {
  children: ReactNode;
  /** Texto abaixo do logo (ex.: “Entre na sua conta”). */
  subtitle?: string;
};

export function AuthShell({ children, subtitle }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute -left-[20%] top-[-10%] h-[min(480px,50vh)] w-[min(480px,90vw)] rounded-full bg-emerald-500/20 blur-3xl dark:bg-emerald-500/[0.12]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[15%] bottom-[-5%] h-[min(400px,45vh)] w-[min(400px,85vw)] rounded-full bg-emerald-600/15 blur-3xl dark:bg-emerald-400/[0.08]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <header className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] px-5 py-3 shadow-sm shadow-emerald-950/5 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:shadow-emerald-950/20">
              <Gamepad2
                className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <span className="text-xl font-semibold tracking-tight text-foreground">
                KesslerLog
              </span>
            </div>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </header>

          <div className="rounded-xl border border-emerald-500/25 bg-card/95 p-6 shadow-xl shadow-emerald-950/[0.07] backdrop-blur-sm dark:border-emerald-500/20 dark:bg-card dark:shadow-[0_1px_0_0_rgba(16,185,129,0.06),0_25px_50px_-12px_rgba(0,0,0,0.45)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
