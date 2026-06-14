import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Copy, Share2, Users } from "lucide-react";

/**
 * ReferralCard — shows the user's referral code and share options.
 * Drop this into the Account page or Dashboard.
 */
export function ReferralCard() {
  const { data, isLoading } = trpc.referral.getMyCode.useQuery();

  const handleCopy = () => {
    if (!data?.shareUrl) return;
    navigator.clipboard.writeText(data.shareUrl).then(() => {
      toast.success("Link copied!");
    }).catch(() => {
      toast.error("Couldn't copy — try manually");
    });
  };

  const handleShare = async () => {
    if (!data?.shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "GranWatch",
          text: "Keep track of family visits to Gran — free app 💛",
          url: data.shareUrl,
        });
      } catch {
        // User cancelled share — no toast needed
      }
    } else {
      handleCopy();
    }
  };

  if (isLoading || !data) return null;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">Share GranWatch, earn rewards</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        When someone you invite subscribes to Gran+, you get <strong>1 month free</strong>.
        Share your link — it takes 30 seconds.
      </p>

      {/* Code display */}
      <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Your referral code</p>
          <p className="font-mono font-bold text-foreground text-lg tracking-widest">{data.code}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0">
          <Copy className="w-4 h-4" />
        </Button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <Button onClick={handleShare} className="flex-1 gap-2" size="sm">
          <Share2 className="w-4 h-4" />
          Share link
        </Button>
        <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy
        </Button>
      </div>

      {/* Stats */}
      {(data.signupCount > 0 || data.convertedCount > 0) && (
        <div className="flex gap-4 pt-1 text-sm text-muted-foreground border-t">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {data.signupCount} signup{data.signupCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-primary" />
            {data.convertedCount} reward{data.convertedCount !== 1 ? "s" : ""} earned
          </span>
        </div>
      )}
    </div>
  );
}
