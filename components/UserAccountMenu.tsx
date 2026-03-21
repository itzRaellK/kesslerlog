"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastSuccess, toastError, getErrorMessage } from "@/lib/toast";
import { cn } from "@/lib/utils";

const PROFILE_QUERY_KEY = ["profile", "me"] as const;

function getInitial(
  displayName: string | null | undefined,
  email: string | null | undefined,
) {
  const dn = displayName?.trim();
  if (dn) return dn[0]!.toUpperCase();
  const local = email?.split("@")[0]?.trim();
  if (local) return local[0]!.toUpperCase();
  return "?";
}

export function UserAccountMenu() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  const { data: account, isLoading } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      await supabase.rpc("ensure_profile");
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) return null;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return { user, profile };
    },
  });

  useEffect(() => {
    if (dialogOpen && account?.profile) {
      setDraftName(account.profile.display_name?.trim() ?? "");
    }
  }, [dialogOpen, account?.profile]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const updateMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) throw new Error("Não autenticado");
      const trimmed = displayName.trim();
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: trimmed.length > 0 ? trimmed : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      toastSuccess("Nome atualizado");
      setDialogOpen(false);
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  function openProfileDialog() {
    setMenuOpen(false);
    setDialogOpen(true);
  }

  const email = account?.profile?.email ?? account?.user.email ?? "";
  const initial = getInitial(account?.profile?.display_name, email);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={isLoading}
          className={cn(
            "flex h-9 items-center gap-0.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 pl-2 pr-1 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-500/15 disabled:opacity-60 dark:border-emerald-500/30 dark:text-emerald-300",
          )}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Menu da conta"
        >
          <span className="flex h-7 w-7 items-center justify-center tabular-nums">{initial}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-emerald-700/80 transition-transform dark:text-emerald-400/90",
              menuOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-orientation="vertical"
            className="absolute right-0 top-[calc(100%+6px)] z-[60] min-w-[200px] overflow-hidden rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={openProfileDialog}
            >
              <User className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Minha conta
            </button>
            <div className="my-0.5 h-px bg-border" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Sair
            </button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Minha conta
            </DialogTitle>
            <DialogDescription>
              Defina como quer ser chamado no app. O e-mail vem da conta de login e não pode ser
              alterado aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="display-name">Nome de exibição</Label>
              <Input
                id="display-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Seu nome"
                maxLength={80}
                autoComplete="name"
              />
              <p className="text-xs text-muted-foreground">
                Usado na inicial do avatar. Se estiver vazio, usamos a primeira letra do e-mail.
              </p>
            </div>
            <div className="space-y-1 rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">E-mail</p>
              <p className="text-sm">{email || "—"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => updateMutation.mutate(draftName)}
              disabled={updateMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
