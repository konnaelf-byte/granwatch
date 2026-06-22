import { getSignInUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useClerk } from "@clerk/react";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getSignInUrl() } =
    options ?? {};
  const utils = trpc.useUtils();
  const clerk = useClerk();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    // Best-effort legacy/server session clear (no-op for Clerk-based sessions).
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        !(error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED")
      ) {
        console.warn("[useAuth] legacy logout failed (continuing):", error);
      }
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate().catch(() => {});
      // Clear the Clerk session — this is the real source of auth. With
      // afterSignOutUrl="/" on <ClerkProvider>, this also redirects home.
      try {
        await clerk.signOut();
      } catch (e) {
        console.error("[useAuth] clerk.signOut failed:", e);
        if (typeof window !== "undefined") window.location.href = "/";
      }
    }
  }, [logoutMutation, utils, clerk]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
