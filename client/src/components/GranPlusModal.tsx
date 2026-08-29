import { TRIAL_MONTHS } from "@shared/const";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Star, Sparkles, CreditCard, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocalizedPricing } from "@/utils/geolocation";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GranPlusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elderId: number;
  elderName: string;
  isAdmin?: boolean;
}

const FEATURES = [
  "landing.plusFeat1",
  "landing.plusFeat2",
  "landing.plusFeat3",
  "landing.plusFeat4",
  "landing.plusFeat5",
  "landing.plusFeat6",
];

export function GranPlusModal({ open, onOpenChange, elderId, elderName, isAdmin = false }: GranPlusModalProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { user } = useAuth();
  const pricing = useLocalizedPricing();

  const { data: subStatus } = trpc.subscription.status.useQuery(
    { elderId },
    { enabled: open }
  );

  const createCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e) => toast.error(e.message),
  });

  const requestCancellation = trpc.subscription.requestCancellation.useMutation({
    onSuccess: () => {
      toast.success(t("plus.toastCancelSent"));
      utils.subscription.status.invalidate({ elderId });
      utils.elders.get.invalidate({ elderId });
      setCancelDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubscribe = () => {
    if (!termsAccepted) {
      toast.error(t("plus.errAcceptTerms"));
      return;
    }
    if (!user) {
      toast.error(t("plus.errSignIn"));
      return;
    }
    createCheckout.mutate({ elderId });
  };

  // Localised pricing — falls back to $2.99 while loading
  // One volunteer family member pays the full amount. The old "split the bill"
  // UI was removed 2026-07-31: it only divided the DISPLAYED price — checkout
  // always charged the full amount — so it promised a split that never happened.
  const totalDisplay = pricing.priceDisplay;          // e.g. "R79", "£3.99"
  // isPaid from the server is the EFFECTIVE entitlement (payment OR trial).
  // actuallyPaid distinguishes a real subscription from an active free trial:
  // trial users keep the subscribe path (billing starts immediately, countdown
  // disappears) and have nothing to cancel.
  const actuallyPaid = subStatus?.actuallyPaid ?? false;
  const onTrial = !!subStatus?.trialActive;
  const trialDays = subStatus?.trialDaysLeft ?? null;
  const cancellationPending = !!subStatus?.cancellationRequestedAt;

  return (
    <>
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
            <div className="text-3xl font-bold text-primary">{totalDisplay}</div>
            <div className="text-sm text-muted-foreground">{t("plus.perMonth")}</div>
            {onTrial && trialDays !== null && (
              <div className="mt-2 text-sm font-semibold text-primary">
                {t("plus.trialLine", { count: trialDays, months: TRIAL_MONTHS })}
              </div>
            )}
          </div>

          {/* Active status badge */}
          {actuallyPaid && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {cancellationPending ? (
                <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  {t("plus.cancellationRequested")}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  {t("plus.active")}
                </div>
              )}
            </div>
          )}

          {/* Features list */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground mb-2">{t("plus.whatYouUnlock")}</p>
            <ul className="space-y-1.5">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Star className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5 fill-primary" />
                  {t(f)}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom action area */}
          <div className="space-y-3">
            {!actuallyPaid ? (
              <>
                {onTrial && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("plus.trialSubscribeNote")}
                  </p>
                )}
                <div className="flex items-start gap-3 bg-muted/50 rounded-xl p-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(v === true)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    {t("plus.termsLabel")}
                  </label>
                </div>

                <Button
                  className="w-full h-12 font-semibold gap-2"
                  onClick={handleSubscribe}
                  disabled={!termsAccepted || createCheckout.isPending}
                >
                  <CreditCard className="w-4 h-4" />
                  {createCheckout.isPending ? t("plus.redirecting") : t("plus.subscribePrice", { price: totalDisplay })}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t("plus.securePayment")}
                </p>
              </>
            ) : (
              <>
                {isAdmin && !cancellationPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t("plus.cancelPlus")}
                  </Button>
                )}
                {cancellationPending && (
                  <p className="text-xs text-amber-600 text-center px-2">
                    {t("plus.cancellationPendingLong")}
                  </p>
                )}
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground text-center px-2">
                    {t("plus.onlyAdminCancel")}
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation confirmation dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("plus.cancelTitle", { name: elderName })}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t("plus.cancelDesc1")}
              </span>
              <span className="block font-medium text-foreground">
                {t("plus.cancelDesc2")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("plus.keepPlus")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => requestCancellation.mutate({ elderId })}
              disabled={requestCancellation.isPending}
            >
              {requestCancellation.isPending ? t("plus.sendingRequest") : t("plus.yesRequestCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
