import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Users, Share2, CheckCircle2, Star, Settings, Copy, Sparkles, ShieldCheck, Trash2, Cake, Pill, Gift } from "lucide-react";
import { GranPlusModal } from "@/components/GranPlusModal";
import { NativeGranPlusModal } from "@/components/NativeGranPlusModal";
import { CareSchedulePanel } from "@/components/CareSchedulePanel";
import { isNativeApp } from "@/utils/platform";
import { initRevenueCat } from "@/utils/iap";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function ElderProfile() {
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [bookedDate, setBookedDate] = useState<Date | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ userId: number; name: string } | null>(null);
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null);

  // Partner affiliate URLs — swap these env vars once deals are signed.
  // On native, window.open opens the system browser (Safari / Chrome) automatically.
  const FLOWERS_URL = import.meta.env.VITE_PARTNER_FLOWERS_URL || "https://petalandpost.co.za/product/todays-cape-town-posy/";
  const GIFT_URL = import.meta.env.VITE_PARTNER_GIFT_URL || "https://petalandpost.co.za/gifts-flowers/gift-set-hamper-delivery/";

  const utils = trpc.useUtils();

  // Reuse the existing Gran+ upsell modal (web = Lemon Squeezy, native = RevenueCat).
  const openGranPlus = () => (isNativeApp ? setNativeGranPlusOpen(true) : setGranPlusOpen(true));

  // Fixed mood set — kept in sync with ALLOWED_MOOD_EMOJIS in server/routers.ts.
  const MOOD_OPTIONS = [
    { emoji: "🤒", label: "Unwell", score: 1 },
    { emoji: "😔", label: "Poor", score: 2 },
    { emoji: "😕", label: "Low", score: 3 },
    { emoji: "😊", label: "Okay", score: 4 },
    { emoji: "😄", label: "Good", score: 5 },
    { emoji: "🥰", label: "Great", score: 6 },
  ];
  const MOOD_SCORE: Record<string, number> = Object.fromEntries(MOOD_OPTIONS.map((m) => [m.emoji, m.score]));

  // Configure RevenueCat once on native, keyed to the Clerk user id (openId).
  // No-op on web and after the first successful configure.
  useEffect(() => {
    if (!isNativeApp || !user?.openId) return;
    void initRevenueCat(user.openId);
  }, [user?.openId]);

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
      toast.success("Visit logged! Gran's clock has been reset 💚");
      utils.elders.get.invalidate({ elderId });
      utils.visits.list.invalidate({ elderId });
      utils.elders.list.invalidate();
      setLogVisitOpen(false);
      setVisitNotes("");
      setWellbeingScore(null);
      setMoodEmoji(null);
      setMoodNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const bookVisit = trpc.planned.book.useMutation({
    onSuccess: () => {
      utils.planned.list.invalidate({ elderId });
      setBookedDate(selectedDate ?? null);
      setBookVisitOpen(false);
      setSelectedDate(undefined);
    },
    onError: (e) => toast.error(e.message),
  });

  const addToCalendar = (date: Date, elderName: string) => {
    // Generate an .ics file for universal calendar support
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const start = new Date(date);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//GranWatch//EN",
      "BEGIN:VEVENT",
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:Visit ${elderName}`,
      `DESCRIPTION:Scheduled visit to ${elderName} via GranWatch`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visit-${elderName.toLowerCase().replace(/\s+/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar event downloaded! Open it to add to your calendar.");
  };

  const logGift = trpc.gifts.log.useMutation({
    onSuccess: () => {
      utils.gifts.list.invalidate({ elderId });
    },
    // Error is shown as a toast below; we still open the partner URL regardless
    onError: (e) => toast.error("Couldn't log gift: " + e.message),
  });

  const handleSendFlowers = async () => {
    // Log first (best-effort), then open URL regardless of outcome
    try { await logGift.mutateAsync({ elderId, giftType: "flowers" }); } catch { /* already toasted */ }
    window.open(FLOWERS_URL, "_blank", "noopener,noreferrer");
  };

  const handleSendGift = async () => {
    try { await logGift.mutateAsync({ elderId, giftType: "gift" }); } catch { /* already toasted */ }
    window.open(GIFT_URL, "_blank", "noopener,noreferrer");
  };

  const cancelPlanned = trpc.planned.cancel.useMutation({
    onSuccess: () => {
      toast.success("Visit cancelled");
      utils.planned.list.invalidate({ elderId });
      setDeleteVisitId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const transferAdmin = trpc.elders.transferAdmin.useMutation({
    onSuccess: () => {
      toast.success(`Admin rights transferred! You are now a regular member.`);
      utils.elders.get.invalidate({ elderId });
      utils.elders.members.invalidate({ elderId });
      setTransferTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleShare = () => {
    if (!elder) return;
    // Use /og/invite/:code so WhatsApp/iMessage generate a rich preview card.
    // That page sets OG meta tags and immediately redirects to /join/:code.
    const url = `${window.location.origin}/api/og/invite/${elder.inviteCode}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Invite link copied to clipboard!");
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
        <p className="text-muted-foreground">Gran not found.</p>
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Button>
        <h1 className="font-bold text-foreground">{elder.name}</h1>
        <div className="flex items-center gap-1">
          {!elder.isPaid && (
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
            size={200}
          />

          {/* My personal stats */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {elder.myLastVisitDate
                ? `Your last visit: ${new Date(elder.myLastVisitDate).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })} (${elder.myDaysSince === 0 ? "today" : `${elder.myDaysSince} days ago`})`
                : "You haven't visited yet"}
            </p>
          </div>
        </div>

        {/* Red alert banner — only once there's a real visit baseline.
            New profiles (no visit yet, daysSinceVisit === 999) stay calm. */}
        {elder.status === "red" && elder.daysSinceVisit < 999 && (
          <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
            <p className="font-semibold text-destructive text-sm">
              ⚠ {elder.name} hasn't had a visitor in {elder.daysSinceVisit} days!
            </p>
            <p className="text-xs text-destructive/80 mt-1">Please book a visit as soon as possible.</p>
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
                  {isToday ? `🎂 Happy Birthday, ${elder.name}!` : `🎂 ${elder.name}'s birthday is in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}!`}
                </p>
                <p className={`text-xs mt-0.5 ${isToday ? "text-pink-600" : "text-amber-600"}`}>
                  {isToday ? "Make it a special visit today." : "Plan a visit to make it memorable."}
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
            Log Visit
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 text-base font-semibold"
            onClick={() => setBookVisitOpen(true)}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Book Visit
          </Button>
        </div>

        {/* Mood trend — Gran+ only. Free elders see a locked teaser. */}
        {elder.isPaid ? (() => {
          const moodVisits = (visitHistory ?? [])
            .filter((v: any) => v.moodEmoji && MOOD_SCORE[v.moodEmoji])
            .slice(0, 14)
            .reverse(); // oldest → newest, left → right
          if (moodVisits.length === 0) return null;
          return (
            <div className="mb-6 bg-card border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Mood trend
              </p>
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
                        title={new Date(v.visitedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Last {moodVisits.length} visit{moodVisits.length !== 1 ? "s" : ""} with a mood logged
              </p>
            </div>
          );
        })() : (
          <button
            type="button"
            onClick={openGranPlus}
            className="mb-6 w-full text-left bg-card border border-dashed border-primary/40 rounded-xl p-4 flex items-center gap-3 hover:bg-primary/5 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">See Gran's mood trend</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track how Gran's been feeling over time with <span className="font-semibold text-primary">Gran+</span>
              </p>
            </div>
          </button>
        )}

        {/* Gift / affiliate buttons — free tier, shown to all family members */}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground text-center mb-2.5 font-medium uppercase tracking-wide">
            Show Gran some love 💌
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="outline"
              className="h-12 text-sm font-semibold border-pink-200 text-pink-700 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-900 dark:text-pink-300 dark:hover:bg-pink-950"
              onClick={handleSendFlowers}
              disabled={logGift.isPending}
            >
              🌸 Send Flowers
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 text-sm font-semibold border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950"
              onClick={handleSendGift}
              disabled={logGift.isPending}
            >
              <Gift className="w-4 h-4 mr-1.5" />
              Send a Gift
            </Button>
          </div>
        </div>

        {/* Invite code */}
        <div className="mb-6 bg-card border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Invite Code</p>
            <p className="font-mono font-bold text-lg text-foreground tracking-widest">{elder.inviteCode}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Copy className="w-4 h-4 mr-1.5" />
            Copy link
          </Button>
        </div>

        {/* Tabs: Upcoming / History / Care / Family */}
        <Tabs defaultValue="planned">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="planned" className="flex-1">
              <Calendar className="w-4 h-4 mr-1" />
              Visits
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              History
            </TabsTrigger>
            {elder.isPaid && (
              <TabsTrigger value="care" className="flex-1">
                <Pill className="w-4 h-4 mr-1" />
                Care
              </TabsTrigger>
            )}
            <TabsTrigger value="members" className="flex-1">
              <Users className="w-4 h-4 mr-1" />
              Family
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
                            {new Date(p.plannedDate).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
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
                <p className="text-sm">No upcoming visits booked.</p>
                <Button variant="link" size="sm" onClick={() => setBookVisitOpen(true)}>
                  Book the first one
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
                    <p className="text-sm">No activity yet.</p>
                    <Button variant="link" size="sm" onClick={() => setLogVisitOpen(true)}>
                      Log the first visit
                    </Button>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {timeline.map((item) => {
                    const dateStr = item._date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

                    if (item._type === "visit") {
                      return (
                        <div key={item._key} className="bg-card border rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              {item.visitorName} visited Gran
                              {item.moodEmoji && <span className="text-base leading-none ml-0.5">{item.moodEmoji}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{dateStr}</p>
                          </div>
                          {item.moodNote && (
                            <p className="text-xs text-muted-foreground ml-5 mb-1">Mood: "{item.moodNote}"</p>
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
                          {isFlowers ? "🌸" : "🎁"} {item.senderName} sent Gran {isFlowers ? "flowers" : "a gift"}
                        </p>
                        <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{dateStr}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          {/* Care schedule — Gran+ only */}
          {elder.isPaid && (
            <TabsContent value="care">
              <CareSchedulePanel
                elderId={elderId}
                isAdmin={elder.memberRole === "admin"}
              />
            </TabsContent>
          )}

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
                            {m.userName}{isCurrentUser ? " (you)" : ""}
                          </p>
                          {m.role === "admin" && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.lastVisitDate
                            ? m.myDaysSince === 0 ? "Visited today 💚" :
                              m.myDaysSince === 1 ? "Visited yesterday" :
                              `Last visited ${m.myDaysSince} days ago`
                            : "Not visited yet"}
                        </p>
                      </div>
                      {/* Make Admin button — only shown to current admin, for non-admin members */}
                      {elder.memberRole === "admin" && !isCurrentUser && m.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground hover:text-primary flex-shrink-0 px-2"
                          onClick={() => setTransferTarget({ userId: m.userId, name: m.userName })}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                          Make Admin
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No family members yet.</p>
              </div>
            )}
            <Button variant="outline" className="w-full mt-3" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Invite family members
            </Button>
          </TabsContent>
        </Tabs>
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
            <DialogTitle>Log a visit to {elder.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Mood — emoji is free for everyone; selecting one is optional. Feeds the mood trend chart. */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">How was Gran feeling?</p>
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
              <p className="text-sm font-medium text-foreground mb-2">Notes (optional)</p>
              <Textarea
                placeholder="How was the visit? Any updates to share with the family..."
                value={visitNotes}
                onChange={e => setVisitNotes(e.target.value)}
                onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 text-base"
              onClick={() => logVisit.mutate({
                elderId,
                notes: visitNotes || undefined,
                wellbeingScore: wellbeingScore ?? undefined,
                moodEmoji: (moodEmoji as any) ?? undefined,
                moodNote: elder.isPaid && moodNote ? moodNote : undefined,
              })}
              disabled={logVisit.isPending}
            >
              {logVisit.isPending ? "Logging..." : "✓ Log Visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Calendar prompt — shown after a visit is booked */}
      {bookedDate && elder && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-card border border-green-200 shadow-lg rounded-2xl px-5 py-4 flex items-center gap-4 max-w-sm w-[calc(100%-2rem)]">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground">Visit booked! 📅</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bookedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button
            className="text-xs font-semibold text-primary underline underline-offset-2 whitespace-nowrap"
            onClick={() => addToCalendar(bookedDate, elder.name)}
          >
            Add to calendar
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
            <DialogTitle>Book a visit to {elder.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 flex justify-center">
            <CalendarUI
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date()}
              className="rounded-xl border"
            />
          </div>
          <DialogFooter>
            <Button
              className="w-full h-12 text-base"
              disabled={!selectedDate || bookVisit.isPending}
              onClick={() => {
                if (!selectedDate) return;
                bookVisit.mutate({
                  elderId,
                  plannedDate: selectedDate.toISOString(),
                });
              }}
            >
              {bookVisit.isPending ? "Booking..." : selectedDate
                ? `Book ${selectedDate.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}`
                : "Select a date"}
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
              Make {transferTarget?.name} an admin?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {transferTarget?.name} will be promoted to admin. You'll keep your admin rights too — multiple admins are allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => transferTarget && transferAdmin.mutate({ elderId, newAdminUserId: transferTarget.userId })}
              disabled={transferAdmin.isPending}
            >
              {transferAdmin.isPending ? "Promoting..." : "Yes, make them admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete planned visit confirmation dialog */}
      <AlertDialog open={deleteVisitId !== null} onOpenChange={(o) => { if (!o) setDeleteVisitId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Cancel this visit?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your booked visit from the schedule. The family will no longer see it as a covered slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteVisitId !== null && cancelPlanned.mutate({ plannedVisitId: deleteVisitId })}
              disabled={cancelPlanned.isPending}
            >
              {cancelPlanned.isPending ? "Cancelling..." : "Yes, cancel visit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
