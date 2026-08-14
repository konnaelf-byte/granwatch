import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Copy, Share2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * ReferralCard — shows the user's referral code and share options.
 * Drop this into the Account page or Dashboard.
 */
export function ReferralCard() {
  const { t } = useTranslation();
  const { data, isLoading } = trpc.referral.getMyCode.useQuery();

  const handleCopy = () => {
    if (!data?.shareUrl) return;
    navigator.clipboard.writeText(data.shareUrl).then(() => {
      toast.success(t("referral.toastCopied"));
    }).catch(() => {
      toast.error(t("referral.toastCopyFail"));
    });
  };

  const handleShare = async () => {
    if (!data?.shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "GranWatch",
          text: t("referral.shareText"),
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
        <span className="font-semibold text-foreground">{t("referral.title")}</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {t("referral.body")}
      </p>

      {/* Code display */}
      <div className="bg-muted rounded-lg px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("referral.yourCode")}</p>
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
          {t("referral.shareLink")}
        </Button>
        <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
          <Copy className="w-4 h-4" />
          {t("referral.copy")}
        </Button>
      </div>

      {/* Stats */}
      {(data.signupCount > 0 || data.convertedCount > 0) && (
        <div className="flex gap-4 pt-1 text-sm text-muted-foreground border-t">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {t("referral.signups", { count: data.signupCount })}
          </span>
          <span className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-primary" />
            {t("referral.rewards", { count: data.convertedCount })}
          </span>
        </div>
      )}
    </div>
  );
}
