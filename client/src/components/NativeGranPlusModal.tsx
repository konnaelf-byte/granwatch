/**
 * Native-only Gran+ subscription modal (iOS + Android).
 *
 * Uses RevenueCat for in-app purchases — pricing comes from the store offering
 * (localised currency automatically). Web users use GranPlusModal + Lemon
 * Squeezy instead; this component is only mounted when isNativeApp is true.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Star, Sparkles, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  getGranPlusOffering,
  getRevenueCatStatus,
  purchaseGranPlus,
  restorePurchases,
} from "@/utils/iap";
import { useTranslation } from "react-i18next";

interface NativeGranPlusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elderId: number;
  elderName: string;
}

const FEATURES = [
  "landing.plusFeat1",
  "landing.plusFeat2",
  "landing.plusFeat3",
  "landing.plusFeat4",
  "landing.plusFeat5",
  "landing.plusFeat6",
];

export function NativeGranPlusModal({ open, onOpenChange, elderId, elderName }: NativeGranPlusModalProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const { user } = useAuth();

  const [priceString, setPriceString] = useState<string | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True when in-app billing isn't available in this build (e.g. Android before
  // the Play billing setup is complete). We show a warm fallback instead of a
  // developer-facing error — the trial keeps everything unlocked anyway.
  const [billingUnavailable, setBillingUnavailable] = useState(false);

  const { data: subStatus } = trpc.subscription.status.useQuery(
    { elderId },
    { enabled: open }
  );
  // actuallyPaid distinguishes a real subscription from the free trial. During
  // the trial the subscribe path stays available to EVERY family member —
  // buying mid-trial starts billing immediately and removes the countdown.
  const actuallyPaid = subStatus?.actuallyPaid ?? false;
  const onTrial = !!subStatus?.trialActive;
  const trialDays = subStatus?.trialDaysLeft ?? null;

  const activateNative = trpc.revenueCat.activateNative.useMutation();

  const activate = async (input: { elderId: number; revenueCatUserId: string }) => {
    await activateNative.mutateAsync(input);
    utils.subscription.status.invalidate({ elderId });
    utils.elders.get.invalidate({ elderId });
  };

  // Fetch the localised Gran+ price from the RevenueCat offering when opened.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setBillingUnavailable(false);
    setLoadingOffering(true);
    getGranPlusOffering()
      .then((offering) => {
        if (cancelled) return;
        const pkg =
          offering?.availablePackages.find((p) => p.product.identifier === "gran_plus_monthly") ??
          offering?.availablePackages[0] ??
          null;
        const price = pkg?.product.priceString ?? null;
        setPriceString(price);
        // No price → billing isn't available in this build. Log the technical
        // reason to the console; show the user a warm fallback instead.
        if (!price) {
          const status = getRevenueCatStatus();
          console.warn("[Gran+] billing unavailable:", status.error ?? "no offering/package");
          setBillingUnavailable(true);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        // getOfferings throws when the SDK isn't configured — same fallback.
        const status = getRevenueCatStatus();
        console.warn("[Gran+] billing unavailable:", status.error ?? e);
        setBillingUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingOffering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error(t("plus.errSignIn"));
      return;
    }
    setError(null);
    setPurchasing(true);
    try {
      await purchaseGranPlus(elderId, activate);
      toast.success(t("plus.toastActive"));
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Purchase failed.";
      // RevenueCat throws a cancellation error when the user dismisses the sheet.
      if (/cancel/i.test(msg)) {
        setPurchasing(false);
        return;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setError(null);
    setRestoring(true);
    try {
      const restored = await restorePurchases(elderId, activate);
      if (restored) {
        toast.success(t("plus.toastRestored"));
        onOpenChange(false);
      } else {
        toast.info(t("plus.toastNoRestore"));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Restore failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("plus.title", { name: elderName })}
          </DialogTitle>
        </DialogHeader>

        {/* Price */}
        <div className="bg-primary/10 rounded-xl p-4 text-center mb-2">
          {loadingOffering ? (
            <>
              <div className="text-3xl font-bold text-primary">
                <Loader2 className="w-7 h-7 animate-spin mx-auto" />
              </div>
              <div className="text-sm text-muted-foreground">{t("plus.perMonth")}</div>
            </>
          ) : billingUnavailable ? null : (
            <>
              <div className="text-3xl font-bold text-primary">{priceString ?? "—"}</div>
              <div className="text-sm text-muted-foreground">{t("plus.perMonth")}</div>
            </>
          )}
          {onTrial && trialDays !== null && (
            <div className={`text-sm font-semibold text-primary ${loadingOffering || !billingUnavailable ? "mt-2" : ""}`}>
              {t("plus.trialLine", { count: trialDays })}
            </div>
          )}
        </div>

        {/* Active status badge */}
        {actuallyPaid && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {t("plus.active")}
            </div>
          </div>
        )}

        {/* Features list */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground mb-2">{t("plus.whatYouUnlock")}</p>
          <ul className="space-y-1.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Star className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5 fill-primary" />
                {t(f)}
              </li>
            ))}
          </ul>
        </div>

        {/* Error state */}
        {error && (
          <p className="text-xs text-destructive text-center px-2 mb-2">{error}</p>
        )}

        {/* Bottom action area */}
        <div className="space-y-3">
          {billingUnavailable && !actuallyPaid && (
            <p className="text-center text-sm text-muted-foreground bg-muted rounded-lg px-3 py-3">
              {onTrial ? t("plus.billingUnavailableTrial") : t("plus.billingUnavailable")}
            </p>
          )}
          {!actuallyPaid && !billingUnavailable && (
            <>
              {onTrial && (
                <p className="text-center text-xs text-muted-foreground">
                  {t("plus.trialSubscribeNote")}
                </p>
              )}
              <Button
              className="w-full h-12 font-semibold gap-2"
              onClick={handleSubscribe}
              disabled={purchasing || loadingOffering || !priceString}
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("plus.processing")}
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  {priceString ? t("plus.subscribePrice", { price: priceString }) : t("plus.subscribe")}
                </>
              )}
              </Button>
            </>
          )}

          {!billingUnavailable && (
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-50"
              onClick={handleRestore}
              disabled={restoring}
            >
              {restoring ? t("plus.restoring") : t("plus.restore")}
            </button>
          )}

          {/* Required subscription info (App Review 3.1.2c): title, length, price, legal links */}
          {!billingUnavailable && (
            <p className="text-center text-xs text-muted-foreground">
              {priceString ? t("plus.legalWithPrice", { price: priceString }) : t("plus.legalNoPrice")}
            </p>
          )}
          <p className="text-center text-xs">
            <button
              type="button"
              className="text-muted-foreground underline underline-offset-2"
              onClick={() => window.open("https://granwatch.app/terms", "_blank")}
            >
              {t("plus.termsOfUse")}
            </button>
            <span className="text-muted-foreground mx-2">·</span>
            <button
              type="button"
              className="text-muted-foreground underline underline-offset-2"
              onClick={() => window.open("https://granwatch.app/privacy", "_blank")}
            >
              {t("landing.footPrivacy")}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
