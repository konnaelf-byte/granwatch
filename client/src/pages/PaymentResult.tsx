import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Heart, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export function PaymentSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const elderId = parseInt(params.get("elderId") ?? "0");
  const [, navigate] = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // Poll subscription status — Lemon Squeezy webhook activates Gran+ within seconds.
  const { data: subStatus } = trpc.subscription.status.useQuery(
    { elderId },
    {
      enabled: !!elderId,
      refetchInterval: (query) => {
        // Stop polling once active or after timeout
        if (query.state.data?.isPaid || timedOut) return false;
        return 2000; // poll every 2s
      },
    }
  );

  const activated = subStatus?.isPaid ?? false;

  // Fallback timeout — show success message after 20s regardless
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 20_000);
    return () => clearTimeout(timer);
  }, []);

  const showSuccess = activated || timedOut;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${showSuccess ? "bg-green-100" : "bg-muted"}`}>
            {showSuccess ? (
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            ) : (
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        <div>
          {activated ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">Gran+ activated! 🎉</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your payment was confirmed. Gran+ features are now unlocked for this profile.
              </p>
            </>
          ) : timedOut ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">Payment received! 🎉</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your payment was successful. Gran+ features will be activated shortly — this usually takes less than a minute.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">Confirming payment...</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We're waiting for payment confirmation. This usually takes just a few seconds.
              </p>
            </>
          )}
        </div>

        {showSuccess && (
          <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3">
            <Heart className="w-5 h-5 text-primary flex-shrink-0 fill-primary" />
            <p className="text-sm text-foreground font-medium">
              Thank you for keeping Gran connected and cared for.
            </p>
          </div>
        )}

        {timedOut && !activated && (
          <div className="bg-amber-50 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 text-left">
              If Gran+ isn't active within 10 minutes, please contact us at support@granwatch.app. Your payment is safe.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {elderId ? (
            <Button className="w-full" onClick={() => navigate(`/elder/${elderId}`)}>
              Go to Gran's profile
            </Button>
          ) : null}
          <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PaymentCancel() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const elderId = parseInt(params.get("elderId") ?? "0");
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Payment cancelled</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No charge was made. You can subscribe to Gran+ at any time from the gran's profile page.
          </p>
        </div>

        <div className="space-y-2">
          {elderId ? (
            <Button className="w-full" onClick={() => navigate(`/elder/${elderId}`)}>
              Back to Gran's profile
            </Button>
          ) : null}
          <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
