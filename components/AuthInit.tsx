"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthInit() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.rpc("ensure_profile").then(() => {});
      }
    });
  }, []);
  return null;
}
