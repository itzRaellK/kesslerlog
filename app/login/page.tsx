"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fieldClass =
  "rounded-lg border-emerald-500/25 bg-background transition-colors hover:border-emerald-500/35 focus-visible:border-emerald-500/40 focus-visible:ring-emerald-500/35 dark:border-emerald-500/20 dark:hover:border-emerald-500/30";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell subtitle="Entre na sua conta para continuar.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className={cn(fieldClass)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-foreground">
            Senha
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(fieldClass)}
            autoComplete="current-password"
            required
          />
        </div>
        {error ? (
          <p
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className={cn(
            "h-11 w-full rounded-lg border border-emerald-500/20 bg-emerald-600 font-semibold text-white shadow-md shadow-emerald-900/30 transition hover:bg-emerald-500 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:shadow-emerald-950/40",
          )}
          disabled={loading}
        >
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}
