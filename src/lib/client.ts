"use client";
import { useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types";

// --- API helper ---
export async function api(path: string, options?: RequestInit) {
  const isFormData = options?.body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" };
  const res = await fetch(path, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Błąd serwera");
  return data;
}

// --- Hooks ---
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/auth/me")
      .then(d => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return { user, loading, logout };
}

export function useFetch<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    api(path).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [path]);

  useEffect(() => { refetch(); }, [refetch, ...deps]);

  return { data, loading, refetch };
}

// --- Formatters ---
export function fmtPLN(n: number) {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

export function fmtDate(d: string | Date) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
}

export function fmtTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// --- Field visibility ---
const RESTRICTED_FIELDS: Record<string, string[]> = {
  client: ["Admin", "Office"],
  price: ["Admin", "Office"],
  notatki: ["Admin", "Office"],
  laborCost: ["Admin"],
};

export function canViewField(field: string, role?: string): boolean {
  const allowed = RESTRICTED_FIELDS[field];
  if (!allowed) return true;
  return !!role && allowed.includes(role);
}
