"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { useState } from "react";
import { AuthInit } from "@/components/AuthInit";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AuthInit />
        {children}
        <Sonner
          richColors
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "group rounded-xl border border-border/80 bg-card text-foreground shadow-lg",
              title: "font-semibold",
              description: "text-muted-foreground",
              closeButton: "border-border bg-background",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
