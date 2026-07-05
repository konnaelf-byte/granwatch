import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Star, Users, Sparkles, Split, CreditCard, XCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocalizedPricing } from "@/utils/geolocation";
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
  "Gran Care: medication tracking",
  "Gran Care: doctor appointments",
  "Care notes visible to all visitors",
  "Photos on visit logs",
  "Mood notes & mood trend insights",
  "Unlimited family members",
];

export function GranPlusModal({ open, onOpenChange, elderId, elderName, isAdmin = false }: GranPlusModalProps) {
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

  const toggleContribution = trpc.subscription.toggleContribution.useMutation({
    onSuccess: () => {
      const wasContributing = subStatus?.amIContributing;
      toast.success(wasContributing ? "You've left the split." : "You've joined the split! 💚");
      utils.subscription.status.invalidate({ elderId });
    },
    onError: (e) => toast.error(e.message),
  });

  const requestCancellation = trpc.subscription.requestCancellation.useMutation({
    onSuccess: () => {
      toast.success("Cancellation request sent. Gran+ stays active until confirmed.");
      utils.subscription.status.invalidate({ elderId });
      utils.elders.get.invalidate({ elderId });
      setCancelDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubscribe = () => {
    if (!termsAccepted) {
      toast.error("Please accept the terms before subscribing.");
      return;
    }
    if (!user) {
      toast.error("Please sign in to subscribe.");
      return;
    }
    createCheckout.mutate({ elderId });
  };

  const handleJoinSplit = () => {
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    toggleContribution.mutate({ elderId }, {
      onSuccess: () => {
        createCheckout.mutate({ elderId });
      },
    });
  };

  // Localised pricing — falls back to ZAR R79 while loading
  const totalDisplay = pricing.priceDisplay;          // e.g. "R79", "£3.99"
  const symbol       = pricing.currencySymbol;        // e.g. "R", "£"
  const totalAmount  = parseFloat(pricing.priceAmount); // e.g. 79, 3.99

  const contributorCount = subStatus?.contributorCount ?? 1;
  // Divide the localised total price by contributor count for the split display
  const perPersonDisplay = `${symbol}${(totalAmount / contributorCount).toFixed(2)}`;
  const isPaid = subStatus?.isPaid ?? false;
  const cancellationPending = !!subStatus?.cancellationRequestedAt;

  return (
    <>
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
            <div className="text-3xl font-bold text-primary">{totalDisplay}</div>
            <div className="text-sm text-muted-foreground">per month</div>
            {subStatus && subStatus.contributorCount > 1 && (
              <div className="mt-2 text-sm font-semibold text-primary">
                = {perPersonDisplay} each with {subStatus.contributorCount} contributors
              </div>
            )}
          </div>

          {/* Active status badge */}
          {isPaid && (
            <div className="flex items-center justify-center gap-2 mb-2">
              {cancellationPending ? (
                <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  Cancellation requested
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Gran+ is active
                </div>
              )}
            </div>
          )}

          {/* Split payment section */}
          <div className="bg-card border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Split className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Split with the family</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              The more family members who chip in, the cheaper it gets for everyone.
              {!isPaid && subStatus?.contributorCount === 0 && " Be the first to contribute!"}
            </p>

            {subStatus && subStatus.contributors.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {subStatus.contributors.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{c.isMe ? "You" : c.userName}</span>
                    <span className="text-muted-foreground">{perPersonDisplay}/mo</span>
                  </div>
                ))}
              </div>
            )}

            {isPaid ? (
              subStatus?.amIContributing ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => toggleContribution.mutate({ elderId })}
                  disabled={toggleContribution.isPending}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {toggleContribution.isPending ? "Updating..." : "Leave the split"}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={handleJoinSplit}
                  disabled={toggleContribution.isPending || createCheckout.isPending}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {createCheckout.isPending ? "Redirecting..." : `Join split — ${symbol}${(totalAmount / (contributorCount + 1)).toFixed(2)}/mo`}
                </Button>
              )
            ) : (
              <Button
                variant={subStatus?.amIContributing ? "outline" : "default"}
                size="sm"
                className="w-full"
                onClick={() => toggleContribution.mutate({ elderId })}
                disabled={toggleContribution.isPending}
              >
                <Users className="w-4 h-4 mr-2" />
                {subStatus?.amIContributing ? "Remove my contribution" : "Add my contribution"}
              </Button>
            )}
          </div>

          {/* Features list */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground mb-2">What you unlock:</p>
            <ul className="space-y-1.5">
              {FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Star className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5 fill-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom action area */}
          <div className="space-y-3">
            {!isPaid ? (
              <>
                <div className="flex items-start gap-3 bg-muted/50 rounded-xl p-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(v === true)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    I understand that Gran+ subscriptions are <strong className="text-foreground">non-refundable</strong>. Payments are charged monthly and you may cancel at any time to stop future charges. No refunds are issued for partial months.
                  </label>
                </div>

                <Button
                  className="w-full h-12 font-semibold gap-2"
                  onClick={handleSubscribe}
                  disabled={!termsAccepted || createCheckout.isPending}
                >
                  <CreditCard className="w-4 h-4" />
                  {createCheckout.isPending ? "Redirecting..." : `Subscribe — ${perPersonDisplay}/mo`}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Secure payment via Lemon Squeezy. Cancel anytime.
                  {contributorCount > 1 && ` Your share: ${perPersonDisplay}/month (${contributorCount} contributors).`}
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
                    Cancel Gran+
                  </Button>
                )}
                {cancellationPending && (
                  <p className="text-xs text-amber-600 text-center px-2">
                    Cancellation has been requested. Gran+ will stay active until the end of the billing period. No further charges will be made.
                  </p>
                )}
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground text-center px-2">
                    Only the profile admin can cancel Gran+. Contact your family admin if you need to cancel.
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
              Cancel Gran+ for {elderName}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                A cancellation request will be sent to the GranWatch owner, who will cancel the subscription in Lemon Squeezy.
              </span>
              <span className="block font-medium text-foreground">
                Gran+ features remain active until the end of the current billing period. No refund will be issued for partial months.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Gran+</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => requestCancellation.mutate({ elderId })}
              disabled={requestCancellation.isPending}
            >
              {requestCancellation.isPending ? "Sending request..." : "Yes, request cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
