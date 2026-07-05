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

interface NativeGranPlusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elderId: number;
  elderName: string;
}

const FEATURES = [
  "Gran Care: medication tracking",
  "Gran Care: doctor appointments",
  "Care notes visible to all visitors",
  "Photos on visit logs",
  "Mood notes & mood trend insights",
  "Unlimited family members",
];

export function NativeGranPlusModal({ open, onOpenChange, elderId, elderName }: NativeGranPlusModalProps) {
  const utils = trpc.useUtils();
  const { user } = useAuth();

  const [priceString, setPriceString] = useState<string | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: subStatus } = trpc.subscription.status.useQuery(
    { elderId },
    { enabled: open }
  );
  const isPaid = subStatus?.isPaid ?? false;

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
        // No price → surface the real RevenueCat reason so we know what to fix.
        if (!price) {
          const status = getRevenueCatStatus();
          if (status.error) setError(status.error);
          else if (!status.configured)
            setError("RevenueCat is still initializing — reopen in a moment.");
          else if (!offering)
            setError("No Gran+ offering is available from the store yet.");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        // getOfferings throws when the SDK isn't configured — show why.
        const status = getRevenueCatStatus();
        setError(status.error ?? (e instanceof Error ? e.message : "Could not load pricing."));
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
      toast.error("Please sign in to subscribe.");
      return;
    }
    setError(null);
    setPurchasing(true);
    try {
      await purchaseGranPlus(elderId, activate);
      toast.success("Gran+ is now active! 💚");
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
        toast.success("Purchases restored — Gran+ is active.");
        onOpenChange(false);
      } else {
        toast.info("No active Gran+ subscription found to restore.");
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
            Gran+ for {elderName}
          </DialogTitle>
        </DialogHeader>

        {/* Price */}
        <div className="bg-primary/10 rounded-xl p-4 text-center mb-2">
          <div className="text-3xl font-bold text-primary">
            {loadingOffering ? (
              <Loader2 className="w-7 h-7 animate-spin mx-auto" />
            ) : (
              priceString ?? "—"
            )}
          </div>
          <div className="text-sm text-muted-foreground">per month</div>
        </div>

        {/* Active status badge */}
        {isPaid && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Gran+ is active
            </div>
          </div>
        )}

        {/* Features list */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground mb-2">What you unlock:</p>
          <ul className="space-y-1.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Star className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5 fill-primary" />
                {f}
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
          {!isPaid && (
            <Button
              className="w-full h-12 font-semibold gap-2"
              onClick={handleSubscribe}
              disabled={purchasing || loadingOffering || !priceString}
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe{priceString ? ` — ${priceString}/mo` : ""}
                </>
              )}
            </Button>
          )}

          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-50"
            onClick={handleRestore}
            disabled={restoring}
          >
            {restoring ? "Restoring..." : "Restore purchases"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Billed through your {/* store */}app store. Cancel anytime in your device settings.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
