/**
 * usePurchaseHealer — finishes Gran+ purchases that were orphaned by an app
 * restart mid-payment (Android recreates the activity while Google's payment
 * sheet is up, killing the JS that would have called activateNative; found
 * live 2026-08-20).
 *
 * On native: configures RevenueCat for the signed-in user, then checks the
 * persisted pending-purchase flag. If the store granted the entitlement but
 * the server was never told, it activates now and refreshes the caches.
 *
 * Mount once per page that a returning purchaser can land on
 * (Dashboard, ElderProfile, ElderSettings). No-op on web.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { isNativeApp } from "@/utils/platform";
import { initRevenueCat, syncPendingPurchase } from "@/utils/iap";

// Module-level guard: run the heal at most once per app session, no matter
// how many pages mount the hook.
let healAttempted = false;

export function usePurchaseHealer(): void {
  const { t } = useTranslation();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const activateNative = trpc.revenueCat.activateNative.useMutation();
  const activateRef = useRef(activateNative);
  activateRef.current = activateNative;

  useEffect(() => {
    if (!isNativeApp || !user?.openId || healAttempted) return;
    healAttempted = true;

    void (async () => {
      try {
        await initRevenueCat(user.openId);
        const healed = await syncPendingPurchase(async (input) => {
          await activateRef.current.mutateAsync(input);
          await Promise.all([
            utils.subscription.invalidate(),
            utils.elders.invalidate(),
          ]);
        });
        if (healed) toast.success(t("plus.toastActive"));
      } catch (err) {
        // Never let healing break the page; it retries on next app launch.
        console.error("[PurchaseHealer] failed:", err);
        healAttempted = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.openId]);
}
