import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Users, Share2, Check, CheckCircle2, Star, Settings, Copy, Sparkles, ShieldCheck, Trash2, Cake, Pill, Gift, Lock, ImagePlus, X, Loader2, UserMinus, MessageCircle } from "lucide-react";
import { GranPlusModal } from "@/components/GranPlusModal";
import { NativeGranPlusModal } from "@/components/NativeGranPlusModal";
import { CareSchedulePanel } from "@/components/CareSchedulePanel";
import { CustomCounters } from "@/components/CustomCounters";
import { TrialBadge } from "@/components/TrialBadge";
import { isNativeApp } from "@/utils/platform";
import { usePurchaseHealer } from "@/hooks/usePurchaseHealer";
import StatusRing from "@/components/StatusRing";
import type { VisitStatus } from "@/components/StatusRing";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export default function ElderProfile() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const elderId = parseInt(id ?? "0");
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  const [logVisitOpen, setLogVisitOpen] = useState(false);
  const [bookVisitOpen, setBookVisitOpen] = useState(false);
  const [granPlusOpen, setGranPlusOpen] = useState(false);
  const [nativeGranPlusOpen, setNativeGranPlusOpen] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [wellbeingScore, setWellbeingScore] = useState<number | null>(null);
  const [moodEmoji, setMoodEmoji] = useState<string | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [visitPhotoUrl, setVisitPhotoUrl] = useState<string | null>(null);
  const [visitPhotoUploading, setVisitPhotoUploading] = useState(false);
  // Backdated visit logging (Konna, 2026-08-21: "they visit impromptu, then
  // forget to log"). Default "today" needs no extra tap; "other" reveals a
  // NATIVE date input (standing lesson: no Radix Select) capped at 3 months back.
  const [visitDay, setVisitDay] = useState<"today" | "other">("today");
  const [visitDate, setVisitDate] = useState(""); // YYYY-MM-DD when visitDay === "other"
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>(""); // "" = no specific time; else "HH:00"
  const [bookedDate, setBookedDate] = useState<Date | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ userId: number; name: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ userId: number; name: string } | null>(null);
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Gift buttons resolve server-side from the partner registry, based on the
  // GRAN'S country (delivery destination) — local deals beat global fallbacks.
  // See server/giftPartners.ts. On native, window.open opens the system browser.
  const { data: giftOptions } = trpc.gifts.optionsForElder.useQuery({ elderId }, { enabled: elderId > 0 });
  const flowersOption = giftOptions?.find((o) => o.category === "flowers");
  const giftOption = giftOptions?.find((o) => o.category === "gift");

  // Reuse the existing Gran+ upsell modal (web = Lemon Squeezy, native = RevenueCat).
  const openGranPlus = () => (isNativeApp ? setNativeGranPlusOpen(true) : setGranPlusOpen(true));

  // Fixed mood set — kept in sync with ALLOWED_MOOD_EMOJIS in server/routers.ts.
  const MOOD_OPTIONS = [
    { emoji: "🤒", label: t("elder.mood1"), score: 1 },
    { emoji: "😔", label: t("elder.mood2"), score: 2 },
    { emoji: "😕", label: t("elder.mood3"), score: 3 },
    { emoji: "😊", label: t("elder.mood4"), score: 4 },
    { emoji: "😄", label: t("elder.mood5"), score: 5 },
    { emoji: "🥰", label: t("elder.mood6"), score: 6 },
  ];
  const MOOD_SCORE: Record<string, number> = Object.fromEntries(MOOD_OPTIONS.map((m) => [m.emoji, m.score]));

  // Configure RevenueCat on native (keyed to the Clerk user id) and finish any
  // Gran+ purchase orphaned by a mid-payment app restart. No-op on web.
  usePurchaseHealer();

  const { data: elder, isLoading } = trpc.elders.get.useQuery(
    { elderId },
    { enabled: isAuthenticated && elderId > 0 }
  );

  const { data: visitHistory } = trpc.visits.list.useQuery(
    { elderId, limit: 20 },
    { enabled: isAuthenticated && elderId > 0 }
  );

  const { data: giftHistory } = trpc.gifts.list.useQuery(
    { elderId, limit: 20 },
    { enabled: isAuthenticated && elderId > 0 }
  );

  const { data: planned } = trpc.planned.list.useQuery(
    { elderId },
    { enabled: isAuthenticated && elderId > 0 }
  );

  const { data: members } = trpc.elders.members.useQuery(
    { elderId },
    { enabled: isAuthenticated && elderId > 0 }
  );

  const logVisit = trpc.visits.log.useMutation({
    onSuccess: () => {
      toast.success(t("elder.toastVisitLogged"));
      utils.elders.get.invalidate({ elderId });
      utils.visits.list.invalidate({ elderId });
      utils.elders.list.invalidate();
      setLogVisitOpen(false);
      setVisitNotes("");
      setWellbeingScore(null);
      setMoodEmoji(null);
      setMoodNote("");
      setVisitPhotoUrl(null);
      setVisitDay("today");
      setVisitDate("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Visit photo (Gran+): downscale client-side (camera photos easily exceed the
  // server's 5MB cap), then upload via the existing /api/upload/photo route.
  const handleVisitPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error(t("elder.selectImage")); return; }
    setVisitPhotoUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Could not process photo")), "image/jpeg", 0.82)
      );
      const formData = new FormData();
      formData.append("photo", new File([blob], "visit.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/upload/photo", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }
      const { url } = await res.json();
      setVisitPhotoUrl(url);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setVisitPhotoUploading(false);
    }
  };

  const bookVisit = trpc.planned.book.useMutation({
    onSuccess: (_data, variables) => {
      utils.planned.list.invalidate({ elderId });
      setBookedDate(new Date(variables.plannedDate));
      setBookVisitOpen(false);
      setSelectedDate(undefined);
      setSelectedTime("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Midnight = "no specific time" (how visits without a chosen time are stored).
  const hasTime = (d: Date) => d.getHours() !== 0 || d.getMinutes() !== 0;

  const addToCalendar = (date: Date, elderName: string) => {
    // Served by the backend (/api/calendar/visit.ics) because blob downloads
    // don't work inside the native webview. window.open goes to the system
    // browser on native, which hands the .ics to the Calendar app.
    const start = new Date(date);
    if (!hasTime(start)) start.setHours(10, 0, 0, 0); // default 10:00 when no time chosen
    const url = `${window.location.origin}/api/calendar/visit.ics?gran=${encodeURIComponent(elderName)}&start=${encodeURIComponent(start.toISOString())}`;
    window.open(url, "_blank");
    toast.success(isNativeApp ? t("elder.toastCalendarNative") : t("elder.toastCalendarWeb"));
  };

  const logGift = trpc.gifts.log.useMutation({
    onSuccess: () => {
      utils.gifts.list.invalidate({ elderId });
    },
    // Error is shown as a toast below; we still open the partner URL regardless
    onError: (e) => toast.error("Couldn't log gift: " + e.message),
  });

  const handleSendFlowers = async () => {
    if (!flowersOption) return;
    // Log first (best-effort, with partner attribution), then open URL regardless
    try { await logGift.mutateAsync({ elderId, giftType: "flowers", partnerName: flowersOption.id }); } catch { /* already toasted */ }
    window.open(flowersOption.url, "_blank", "noopener,noreferrer");
  };

  const handleSendGift = async () => {
    if (!giftOption) return;
    try { await logGift.mutateAsync({ elderId, giftType: "gift", partnerName: giftOption.id }); } catch { /* already toasted */ }
    window.open(giftOption.url, "_blank", "noopener,noreferrer");
  };

  const cancelPlanned = trpc.planned.cancel.useMutation({
    onSuccess: () => {
      toast.success(t("elder.toastVisitCancelled"));
      utils.planned.list.invalidate({ elderId });
      setDeleteVisitId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const transferAdmin = trpc.elders.transferAdmin.useMutation({
    onSuccess: () => {
      toast.success(t("elder.toastAdminTransferred"));
      utils.elders.get.invalidate({ elderId });
      utils.elders.members.invalidate({ elderId });
      setTransferTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = trpc.elders.removeMember.useMutation({
    onSuccess: () => {
      toast.success(t("elder.toastMemberRemoved"));
      utils.elders.members.invalidate({ elderId });
      setRemoveTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // (regenerateInviteCode mutation + confirm dialog moved to ElderSettings, 2026-08-21)

  const inviteUrl = elder ? `${window.location.origin}/api/og/invite/${elder.inviteCode}` : "";
  // Warm prefilled invite text — WhatsApp is the family channel (98% open rates).
  const inviteText = elder
    ? t("elder.inviteMsg", { name: elder.name, url: inviteUrl })
    : "";

  const handleShare = () => {
    if (!elder) return;
    // Native share sheet first (mobile: WhatsApp/iMessage with prefilled text).
    if (navigator.share) {
      navigator.share({ text: inviteText }).catch(() => {/* user dismissed */});
      return;
    }
    // Desktop fallback: copy the rich-preview link.
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast.success(t("elder.toastLinkCopied"));
    });
  };

  const handleWhatsAppShare = () => {
    if (!elder) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteText)}`, "_blank");
  };

  const handleCopy = () => {
    if (!elder) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast.success(t("elder.toastLinkCopied"));
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-5 py-6 max-w-lg mx-auto">
        <Skeleton className="h-8 w-24 mb-6" />
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-44 h-44 rounded-full" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!elder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("elder.granNotFound")}</p>
      </div>
    );
  }

  const statusColor = {
    green: "#16a34a",
    yellow: "#a16207",
    orange: "#c2410c",
    red: "#dc2626",
  }[elder.status as VisitStatus];

  return (
    // overflow-x-hidden: belt-and-braces — a single overflowing element used to
    // make the whole page horizontally pannable on phones, which also
    // mis-centered dialogs on Android (Konna, 2026-08-21).
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Button>
        <h1 className="font-bold text-foreground">{elder.name}</h1>
        <div className="flex items-center gap-1">
          {/* Gran+ entry point — visible to EVERY family member (not just
              admins) whenever the profile has no real subscription, INCLUDING
              during the free trial, so anyone can subscribe at any time. */}
          {!elder.actuallyPaid && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (isNativeApp ? setNativeGranPlusOpen(true) : setGranPlusOpen(true))}
              className="text-primary font-semibold"
              aria-label="Upgrade to Gran Plus"
            >
              <Sparkles className="w-4 h-4 mr-1" aria-hidden="true" />
              Gran+
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => navigate(`/elder/${elderId}/settings`)} aria-label="Gran settings">
            <Settings className="w-5 h-5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare} aria-label="Copy invite link">
            <Share2 className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <main id="main-content" className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        {/* Status Ring — hero */}
        <div className="flex flex-col items-center mb-8">
          <StatusRing
            photoUrl={elder.photoUrl}
            name={elder.name}
            daysSinceVisit={elder.daysSinceVisit}
            status={elder.status as VisitStatus}
            threshold={elder.alertThresholdDays}
            myDaysSince={elder.myDaysSince}
            size={200}
          />

          {/* My personal stats */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {elder.myLastVisitDate
                ? t("elder.myLastVisit", { date: new Date(elder.myLastVisitDate).toLocaleDateString(i18n.language, { weekday: "short", day: "numeric", month: "short" }), ago: elder.myDaysSince === 0 ? t("elder.today") : t("elder.daysAgo", { count: elder.myDaysSince }) })
                : t("elder.notVisitedYet")}
            </p>
          </div>
        </div>

        {/* Custom counters — Gran+ horizontal drain bars (near the ring, per spec) */}
        <CustomCounters
          elderId={elderId}
          locked={!elder.isPaid}
          onUnlock={openGranPlus}
          isAdmin={elder.memberRole === "admin"}
          currentUserId={user?.id}
        />

        {/* Red alert banner — only once there's a real visit baseline.
            New profiles (no visit yet, daysSinceVisit === 999) stay calm. */}
        {elder.status === "red" && elder.daysSinceVisit < 999 && (
          <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
            <p className="font-semibold text-destructive text-sm">
              {t("elder.alertBanner", { name: elder.name, count: elder.daysSinceVisit })}
            </p>
            <p className="text-xs text-destructive/80 mt-1">{t("elder.alertBannerSub")}</p>
          </div>
        )}

        {/* Birthday banner — shown 7 days before and on the day */}
        {elder.birthday && (() => {
          const today = new Date();
          const [mm, dd] = elder.birthday.split("-").map(Number);
          const thisYear = new Date(today.getFullYear(), mm - 1, dd);
          const nextYear = new Date(today.getFullYear() + 1, mm - 1, dd);
          const next = thisYear >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisYear : nextYear;
          const daysUntil = Math.round((next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
          if (daysUntil > 7) return null;
          const isToday = daysUntil === 0;
          return (
            <div className={`mb-6 rounded-xl p-4 text-center flex items-center justify-center gap-3 ${isToday ? "bg-pink-50 border border-pink-200" : "bg-amber-50 border border-amber-200"}`}>
              <Cake className={`w-5 h-5 flex-shrink-0 ${isToday ? "text-pink-500" : "text-amber-500"}`} />
              <div>
                <p className={`font-semibold text-sm ${isToday ? "text-pink-700" : "text-amber-700"}`}>
                  {isToday ? t("elder.bdayToday", { name: elder.name }) : t("elder.bdayIn", { name: elder.name, count: daysUntil })}
                </p>
                <p className={`text-xs mt-0.5 ${isToday ? "text-pink-600" : "text-amber-600"}`}>
                  {isToday ? t("elder.bdayTodaySub") : t("elder.bdayPlanSub")}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            size="lg"
            className="h-14 text-base font-semibold"
            onClick={() => setLogVisitOpen(true)}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {t("elder.logVisit")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 text-base font-semibold"
            onClick={() => setBookVisitOpen(true)}
          >
            <Calendar className="w-5 h-5 mr-2" />
            {t("elder.bookVisit")}
          </Button>
        </div>

        {/* Gift / affiliate buttons — free tier, shown to all family members.
            Rendered only when the partner registry has coverage for the gran's
            country (server/giftPartners.ts). */}
        {(flowersOption || giftOption) && (
          <div className="mb-5">
            <p className="text-xs text-muted-foreground text-center mb-2.5 font-medium uppercase tracking-wide">
              {t("elder.showLove")}
            </p>
            <div className={`grid gap-3 ${flowersOption && giftOption ? "grid-cols-2" : "grid-cols-1"}`}>
              {flowersOption && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 text-sm font-semibold border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-900 dark:text-pink-300 dark:hover:bg-pink-950"
                  onClick={handleSendFlowers}
                  disabled={logGift.isPending}
                >
                  {t("elder.sendFlowers")}
                </Button>
              )}
              {giftOption && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 text-sm font-semibold border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950"
                  onClick={handleSendGift}
                  disabled={logGift.isPending}
                >
                  <Gift className="w-4 h-4 mr-1.5" />
                  {t("elder.sendGift")}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Invite code */}
        <div className="mb-6 bg-card border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{t("elder.inviteCode")}</p>
            <p className="font-mono font-bold text-lg text-foreground tracking-widest">{elder.inviteCode}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleWhatsAppShare} className="text-green-600 hover:text-green-700">
              <MessageCircle className="w-4 h-4 mr-1.5" />
              WhatsApp
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-1.5" />
              {t("elder.copyLink")}
            </Button>
            {/* Regenerate-code control moved to ElderSettings (2026-08-21,
                Konna): as a third control it overflowed the row on phones,
                making the whole page horizontally pannable for admins — which
                also mis-centered every dialog on Android (dialogs center on
                the layout viewport, not the visual one). */}
          </div>
        </div>

        {/* Tabs: Visits / History / Family / Care (Care last; gated as Gran+ teaser on free) */}
        <Tabs defaultValue="planned">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="planned" className="flex-1">
              <Calendar className="w-4 h-4 mr-1" />
              {t("elder.tabVisits")}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {t("elder.tabHistory")}
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1">
              <Users className="w-4 h-4 mr-1" />
              {t("elder.tabFamily")}
            </TabsTrigger>
            <TabsTrigger
              value="care"
              className={`flex-1 ${!elder.isPaid ? "text-muted-foreground/70" : ""}`}
            >
              {elder.isPaid ? (
                <Pill className="w-4 h-4 mr-1" />
              ) : (
                <Lock className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              )}
              {t("elder.tabCare")}
            </TabsTrigger>
          </TabsList>

          {/* Planned visits */}
          <TabsContent value="planned">
            {planned && planned.length > 0 ? (
              <div className="space-y-2">
                {planned.map((p: any) => {
                  // Check if this visit falls within the threshold window (would keep Gran green)
                  const daysUntilVisit = Math.ceil((new Date(p.plannedDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const threshold = elder.alertThresholdDays ?? 21;
                  const keepsGranGreen = (elder.daysSinceVisit + daysUntilVisit) <= threshold;
                  return (
                    <div
                      key={p.id}
                      className="bg-card rounded-xl p-4 flex items-center justify-between"
                      style={{
                        border: keepsGranGreen ? "1.5px solid #22c55e" : "1px solid hsl(var(--border))",
                        boxShadow: keepsGranGreen ? "0 0 0 1px rgba(34,197,94,0.15)" : undefined,
                      }}
                    >
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                            {new Date(p.plannedDate).toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long" })}
                            {hasTime(new Date(p.plannedDate)) && (
                              <span className="text-muted-foreground font-normal">
                                {" "}· {new Date(p.plannedDate).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.visitorName}</p>
                        {p.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{p.notes}"</p>}
                      </div>
                      {p.isMe && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => setDeleteVisitId(p.id)}
                          aria-label="Cancel this planned visit"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t("elder.noUpcoming")}</p>
                <Button variant="link" size="sm" onClick={() => setBookVisitOpen(true)}>
                  {t("elder.bookFirst")}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Activity history — visits + gifts merged into one timeline */}
          <TabsContent value="history">
            {(() => {
              // Build a unified chronological timeline
              const visitEvents = (visitHistory ?? []).map((v: any) => ({
                _type: "visit" as const,
                _key: `v-${v.id}`,
                _date: new Date(v.visitedAt),
                visitorName: v.visitorName as string,
                notes: v.notes as string | null,
                wellbeingScore: v.wellbeingScore as number | null,
                moodEmoji: v.moodEmoji as string | null,
                moodNote: v.moodNote as string | null,
                photoUrl: v.photoUrl as string | null,
              }));
              const giftEvents = (giftHistory ?? []).map((g: any) => ({
                _type: "gift" as const,
                _key: `g-${g.id}`,
                _date: new Date(g.sentAt),
                senderName: g.senderName as string,
                giftType: g.giftType as "flowers" | "gift",
              }));
              const timeline = [...visitEvents, ...giftEvents]
                .sort((a, b) => b._date.getTime() - a._date.getTime());

              if (timeline.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{t("elder.noActivity")}</p>
                    <Button variant="link" size="sm" onClick={() => setLogVisitOpen(true)}>
                      {t("elder.logFirst")}
                    </Button>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {timeline.map((item) => {
                    const dateStr = item._date.toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" });

                    if (item._type === "visit") {
                      return (
                        <div key={item._key} className="bg-card border rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              {t("elder.visitedGran", { name: item.visitorName })}
                              {item.moodEmoji && <span className="text-base leading-none ml-0.5">{item.moodEmoji}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{dateStr}</p>
                          </div>
                          {item.moodNote && (
                            <p className="text-xs text-muted-foreground ml-5 mb-1">{t("elder.moodNoteLine", { note: item.moodNote })}</p>
                          )}
                          {item.wellbeingScore && (
                            <div className="flex gap-0.5 mb-1 ml-5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= item.wellbeingScore! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic ml-5">"{item.notes}"</p>
                          )}
                          {item.photoUrl && (
                            <a href={item.photoUrl} target="_blank" rel="noopener noreferrer" className="block ml-5 mt-2">
                              <img
                                src={item.photoUrl}
                                alt={`Photo from ${item.visitorName}'s visit`}
                                loading="lazy"
                                className="rounded-lg border max-h-48 w-auto object-cover"
                              />
                            </a>
                          )}
                        </div>
                      );
                    }

                    // Gift event
                    const isFlowers = item.giftType === "flowers";
                    return (
                      <div
                        key={item._key}
                        className={`rounded-xl p-4 border flex items-center justify-between ${
                          isFlowers
                            ? "bg-pink-50 border-pink-100 dark:bg-pink-950/30 dark:border-pink-900"
                            : "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900"
                        }`}
                      >
                        <p className={`font-semibold text-sm ${isFlowers ? "text-pink-800 dark:text-pink-300" : "text-amber-800 dark:text-amber-300"}`}>
                          {isFlowers ? t("elder.sentFlowersHist", { name: item.senderName }) : t("elder.sentGiftHist", { name: item.senderName })}
                        </p>
                        <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{dateStr}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          {/* Care schedule — visible to all, but non-functional (locked) on free elders */}
          <TabsContent value="care">
            <TrialBadge daysLeft={elder.trialDaysLeft} className="mb-2 px-1" />
            <CareSchedulePanel
              elderId={elderId}
              isAdmin={elder.memberRole === "admin"}
              locked={!elder.isPaid}
              onUnlock={openGranPlus}
            />
          </TabsContent>

          {/* Family members */}
          <TabsContent value="members">
            {members && members.length > 0 ? (
              <div className="space-y-2">
                {members.map((m: any) => {
                  const initials = (m.userName ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                  const dotColor = !m.lastVisitDate ? "#94a3b8" :
                    m.myDaysSince < 7 ? "#22c55e" :
                    m.myDaysSince < 14 ? "#eab308" :
                    m.myDaysSince < 21 ? "#f97316" : "#ef4444";
                  const isCurrentUser = m.userId === user?.id;
                  return (
                    <div key={m.id} className={`bg-card border rounded-xl p-4 flex items-center gap-3 ${isCurrentUser ? "border-primary/40 bg-primary/5" : ""}`}>
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: dotColor }}
                      >
                        {initials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">
                            {m.userName}{isCurrentUser ? " " + t("elder.youSuffix") : ""}
                          </p>
                          {m.role === "admin" && (
                            <Badge variant="secondary" className="text-xs">{t("elder.adminBadge")}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.lastVisitDate
                            ? m.myDaysSince === 0 ? t("elder.visitedToday") :
                              m.myDaysSince === 1 ? t("elder.visitedYesterday") :
                              t("elder.lastVisitedDaysAgo", { count: m.myDaysSince })
                            : t("elder.memberNotVisited")}
                        </p>
                      </div>
                      {/* Admin controls for non-admin members: promote or remove */}
                      {elder.memberRole === "admin" && !isCurrentUser && m.role !== "admin" && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-primary px-2"
                            onClick={() => setTransferTarget({ userId: m.userId, name: m.userName })}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            {t("elder.makeAdmin")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveTarget({ userId: m.userId, name: m.userName })}
                            aria-label={`Remove ${m.userName} from the family`}
                          >
                            <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t("elder.noMembers")}</p>
              </div>
            )}
            <Button variant="outline" className="w-full mt-3" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              {t("elder.inviteMembers")}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Mood trend — Gran+ only. Free elders see a locked teaser. Relocated to bottom of page. */}
        {elder.isPaid ? (() => {
          const moodVisits = (visitHistory ?? [])
            .filter((v: any) => v.moodEmoji && MOOD_SCORE[v.moodEmoji])
            .slice(0, 14)
            .reverse(); // oldest → newest, left → right
          if (moodVisits.length === 0) return null;
          return (
            <div className="mt-6 bg-card border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                {t("elder.moodTrend")}
              </p>
              <TrialBadge daysLeft={elder.trialDaysLeft} className="mb-2" />
              <div className="flex items-end justify-between gap-1.5 h-20">
                {moodVisits.map((v: any, i: number) => {
                  const score = MOOD_SCORE[v.moodEmoji]; // 1..6
                  const heightPct = Math.round((score / 6) * 100); // ~17%..100%
                  const color =
                    score >= 5 ? "#22c55e" : score >= 3 ? "#eab308" : "#f97316";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      <span className="text-xs mb-1">{v.moodEmoji}</span>
                      <div
                        className="w-full rounded-t-md"
                        style={{ height: `${heightPct}%`, background: color, minHeight: 6 }}
                        title={new Date(v.visitedAt).toLocaleDateString(i18n.language, { day: "numeric", month: "short" })}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                {t("elder.moodTrendCount", { count: moodVisits.length })}
              </p>
            </div>
          );
        })() : (
          <button
            type="button"
            onClick={openGranPlus}
            className="mt-6 w-full text-left bg-card border border-dashed border-primary/40 rounded-xl p-4 flex items-center gap-3 hover:bg-primary/5 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t("elder.moodTeaserTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("elder.moodTeaserSub")}
              </p>
            </div>
          </button>
        )}
      </main>

      {/* Gran+ Modal — web uses Lemon Squeezy; native uses RevenueCat IAP. */}
      {isNativeApp ? (
        <NativeGranPlusModal
          open={nativeGranPlusOpen}
          onOpenChange={setNativeGranPlusOpen}
          elderId={elderId}
          elderName={elder.name}
        />
      ) : (
        <GranPlusModal
          open={granPlusOpen}
          onOpenChange={setGranPlusOpen}
          isAdmin={elder?.memberRole === "admin"}
          elderId={elderId}
          elderName={elder.name}
        />
      )}

      {/* Log Visit Modal */}
      <Dialog open={logVisitOpen} onOpenChange={setLogVisitOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{t("elder.logVisitTitle", { name: elder.name })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* When was the visit? "Today" preselected (zero extra taps for the
                normal case); "Other day" reveals a native date input, ≤3 months back. */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("elder.visitWhenQ")}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setVisitDay("today"); setVisitDate(""); }}
                  className={`flex items-center justify-center gap-1.5 h-11 rounded-xl border text-sm font-medium transition-all ${
                    visitDay === "today"
                      ? "border-green-600 bg-green-600/10 text-foreground ring-1 ring-green-600"
                      : "border-input text-muted-foreground hover:bg-muted"
                  }`}
                  aria-pressed={visitDay === "today"}
                >
                  {visitDay === "today" && <Check className="w-4 h-4 text-green-600" />}
                  {t("elder.visitToday")}
                </button>
                <button
                  type="button"
                  onClick={() => setVisitDay("other")}
                  className={`flex items-center justify-center gap-1.5 h-11 rounded-xl border text-sm font-medium transition-all ${
                    visitDay === "other"
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                      : "border-input text-muted-foreground hover:bg-muted"
                  }`}
                  aria-pressed={visitDay === "other"}
                >
                  {t("elder.visitOtherDay")}
                </button>
              </div>
              {visitDay === "other" && (
                <div className="mt-2 w-full min-w-0">
                  <div className="relative">
                    {/* iOS WebKit gives date inputs an intrinsic width that overflows
                        containers (poked out of the dialog on iPhone; on Android the
                        same overflow widened the layout viewport and shifted the whole
                        dialog off-center — same class of bug as the invite-icon one).
                        appearance-none + min-w-0 + max-w-full pins it inside. */}
                    <input
                      type="date"
                      aria-label={t("elder.visitWhenQ")}
                      className="block h-11 w-full min-w-0 max-w-full appearance-none rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ WebkitAppearance: "none" }}
                      value={visitDate}
                      min={(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); })()}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setVisitDate(e.target.value)}
                    />
                    {/* iOS only: appearance-none leaves an empty date input looking like
                        a blank box — overlay a label until a date is picked. Android
                        shows its own dd/mm/yyyy hint, so no overlay there. */}
                    {!visitDate && /iphone|ipad|ipod/i.test(navigator.userAgent) && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {t("elder.visitSelectDate")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("elder.visitBackdateHint")}</p>
                </div>
              )}
            </div>

            {/* Mood — emoji is free for everyone; selecting one is optional. Feeds the mood trend chart. */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("elder.moodQ")}</p>
              <div className="flex gap-2 justify-center">
                {MOOD_OPTIONS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setMoodEmoji(moodEmoji === emoji ? null : emoji)}
                    className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                      moodEmoji === emoji ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-muted"
                    }`}
                    aria-pressed={moodEmoji === emoji}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("elder.notesOptional")}</p>
              <Textarea
                placeholder={t("elder.notesPlaceholder")}
                value={visitNotes}
                onChange={e => setVisitNotes(e.target.value)}
                onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Visit photo — Gran+ feature. Free elders see a locked upsell. */}
            {elder.isPaid ? (
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{t("elder.photoOptional")}</p>
                <TrialBadge daysLeft={elder.trialDaysLeft} className="mb-2" />
                {visitPhotoUrl ? (
                  <div className="relative inline-block">
                    <img src={visitPhotoUrl} alt="Visit photo" className="h-24 w-24 object-cover rounded-xl border" />
                    <button
                      type="button"
                      onClick={() => setVisitPhotoUrl(null)}
                      className="absolute -top-2 -right-2 bg-foreground text-background rounded-full p-1 shadow"
                      aria-label="Remove photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 border border-dashed rounded-xl px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                    {visitPhotoUploading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("elder.uploading")}</>
                      : <><ImagePlus className="w-4 h-4 text-primary" /> {t("elder.addPhoto")}</>}
                    <input type="file" accept="image/*" className="hidden" onChange={handleVisitPhotoSelect} disabled={visitPhotoUploading} />
                  </label>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setLogVisitOpen(false); openGranPlus(); }}
                className="w-full text-left border border-dashed border-primary/40 rounded-xl px-4 py-3 flex items-center gap-2 hover:bg-primary/5 transition-colors"
              >
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {t("elder.photoTeaser")}
                </span>
              </button>
            )}
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 text-base"
              onClick={() => logVisit.mutate({
                elderId,
                // Backdated day → send noon LOCAL time so no timezone can shift
                // it onto a neighbouring day. "Today" omits visitedAt (server = now).
                visitedAt: visitDay === "other" && visitDate
                  ? new Date(`${visitDate}T12:00:00`).toISOString()
                  : undefined,
                notes: visitNotes || undefined,
                wellbeingScore: wellbeingScore ?? undefined,
                moodEmoji: (moodEmoji as any) ?? undefined,
                moodNote: elder.isPaid && moodNote ? moodNote : undefined,
                photoUrl: elder.isPaid && visitPhotoUrl ? visitPhotoUrl : undefined,
              })}
              disabled={logVisit.isPending || visitPhotoUploading || (visitDay === "other" && !visitDate)}
            >
              {logVisit.isPending ? t("elder.logging") : t("elder.logVisitBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Calendar prompt — shown after a visit is booked */}
      {bookedDate && elder && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-card border border-green-200 shadow-lg rounded-2xl px-5 py-4 flex items-center gap-4 max-w-sm w-[calc(100%-2rem)]">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">{t("elder.visitBooked")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bookedDate.toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long" })}
              {hasTime(bookedDate) && ` · ${bookedDate.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
          <button
            className="text-xs font-semibold text-primary underline underline-offset-2 whitespace-nowrap"
            onClick={() => addToCalendar(bookedDate, elder.name)}
          >
            {t("elder.addToCalendar")}
          </button>
          <button
            className="text-muted-foreground hover:text-foreground ml-1"
            onClick={() => setBookedDate(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Book Visit Modal */}
      <Dialog open={bookVisitOpen} onOpenChange={setBookVisitOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{t("elder.bookVisitTitle", { name: elder.name })}</DialogTitle>
          </DialogHeader>
          <div className="py-2 flex flex-col items-center gap-3">
            <CalendarUI
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-xl border"
            />
            <div className="w-full">
              <p className="text-xs font-medium text-foreground mb-1">{t("elder.timeOptional")}</p>
              <Select value={selectedTime || "none"} onValueChange={(v) => setSelectedTime(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("elder.noSpecificTime")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("elder.noSpecificTime")}</SelectItem>
                  {Array.from({ length: 14 }, (_, i) => i + 7).map((h) => {
                    const t = `${String(h).padStart(2, "0")}:00`;
                    return <SelectItem key={t} value={t}>{t}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 text-base"
              disabled={!selectedDate || bookVisit.isPending}
              onClick={() => {
                if (!selectedDate) return;
                const combined = new Date(selectedDate);
                if (selectedTime) {
                  const [h, m] = selectedTime.split(":").map(Number);
                  combined.setHours(h, m, 0, 0);
                } else {
                  combined.setHours(0, 0, 0, 0);
                }
                bookVisit.mutate({
                  elderId,
                  plannedDate: combined.toISOString(),
                });
              }}
            >
              {bookVisit.isPending ? t("elder.booking") : selectedDate
                ? t("elder.bookDate", { date: selectedDate.toLocaleDateString(i18n.language, { weekday: "short", day: "numeric", month: "short" }) + (selectedTime ? ` · ${selectedTime}` : "") })
                : t("elder.selectDate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Transfer Admin confirmation dialog */}
      <AlertDialog open={!!transferTarget} onOpenChange={(o) => { if (!o) setTransferTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t("elder.makeAdminTitle", { name: transferTarget?.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("elder.makeAdminDesc", { name: transferTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => transferTarget && transferAdmin.mutate({ elderId, newAdminUserId: transferTarget.userId })}
              disabled={transferAdmin.isPending}
            >
              {transferAdmin.isPending ? t("elder.promoting") : t("elder.yesMakeAdmin")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove member confirmation dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-destructive" />
              {t("elder.removeTitle", { name: removeTarget?.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("elder.removeDesc", { elderName: elder?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTarget && removeMember.mutate({ elderId, targetUserId: removeTarget.userId })}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? t("elder.removing") : t("elder.yesRemove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate invite code confirmation dialog: moved to ElderSettings (2026-08-21) */}

      {/* Delete planned visit confirmation dialog */}
      <AlertDialog open={deleteVisitId !== null} onOpenChange={(o) => { if (!o) setDeleteVisitId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              {t("elder.cancelVisitTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("elder.cancelVisitDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("elder.keepIt")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteVisitId !== null && cancelPlanned.mutate({ plannedVisitId: deleteVisitId })}
              disabled={cancelPlanned.isPending}
            >
              {cancelPlanned.isPending ? t("elder.cancelling") : t("elder.yesCancelVisit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
