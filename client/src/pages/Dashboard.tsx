import { useAuth } from "@/_core/hooks/useAuth";
import { getSignInUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Heart, Plus, Bell, Crown, Cake } from "lucide-react";
import StatusRing from "@/components/StatusRing";
import type { VisitStatus } from "@/components/StatusRing";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  // Attribute referral signup — fire once if user arrived via a ref link
  const recordSignup = trpc.referral.recordSignup.useMutation();
  useEffect(() => {
    if (!isAuthenticated) return;
    const ref = sessionStorage.getItem("granwatch_ref");
    if (!ref) return;
    sessionStorage.removeItem("granwatch_ref"); // consume immediately to prevent re-firing
    recordSignup.mutate({ code: ref });
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: elders, isLoading } = trpc.elders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: notifs } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const unreadCount = notifs?.filter(n => !n.read).length ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Heart className="w-8 h-8 text-primary fill-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Button asChild><a href={getSignInUrl()}>Sign in</a></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary fill-primary" />
          <span className="font-bold text-foreground">GranWatch</span>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              title="Admin dashboard"
            >
              <Crown className="w-5 h-5 text-amber-500" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate("/notifications")}
            aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : "Notifications"}
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          <button
            onClick={() => navigate("/account")}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
            aria-label="My account"
          >
            {user?.name ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "?"}
          </button>
        </div>
      </header>

      <main id="main-content" className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Hello, {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's how your grans are doing today.
          </p>
        </div>

        {/* Gran cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : elders && elders.length > 0 ? (
          <div className="space-y-4">
            {elders.map((elder) => {
              // Birthday proximity badge (≤7 days)
              let birthdayDaysUntil: number | null = null;
              if (elder.birthday) {
                const today = new Date();
                const [mm, dd] = (elder.birthday as string).split("-").map(Number);
                const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const bdThisYear = new Date(today.getFullYear(), mm - 1, dd);
                const nextBd = bdThisYear >= todayMid ? bdThisYear : new Date(today.getFullYear() + 1, mm - 1, dd);
                const days = Math.round((nextBd.getTime() - todayMid.getTime()) / 86400000);
                if (days <= 7) birthdayDaysUntil = days;
              }
              return (
                <button
                  key={elder.id}
                  onClick={() => navigate(`/elder/${elder.id}`)}
                  className="w-full bg-card border rounded-2xl p-5 flex items-center gap-5 text-left hover:shadow-md transition-shadow active:scale-[0.99]"
                  aria-label={`${elder.name} — ${elder.status === "green" ? "All good" : elder.status === "yellow" ? "Due soon" : elder.status === "orange" ? "Overdue" : "Alert"} — ${elder.daysSinceVisit === 0 ? "visited today" : elder.daysSinceVisit === 1 ? "1 day since last visit" : `${elder.daysSinceVisit} days since last visit`}`}
                >
                  <StatusRing
                    photoUrl={elder.photoUrl}
                    name={elder.name}
                    daysSinceVisit={elder.daysSinceVisit}
                    status={elder.status as VisitStatus}
                    size={90}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-foreground truncate">{elder.name}</h2>
                      {birthdayDaysUntil !== null && (
                        <Cake className="w-4 h-4 text-pink-500 flex-shrink-0" title={birthdayDaysUntil === 0 ? "Birthday today!" : `Birthday in ${birthdayDaysUntil} days`} />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {elder.memberCount} family member{elder.memberCount !== 1 ? "s" : ""}
                    </p>
                    {elder.lastVisitDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last visit: {new Date(elder.lastVisitDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            elder.status === "green" ? "rgba(34,197,94,0.15)" :
                            elder.status === "yellow" ? "rgba(234,179,8,0.15)" :
                            elder.status === "orange" ? "rgba(249,115,22,0.15)" :
                            "rgba(239,68,68,0.15)",
                          color:
                            elder.status === "green" ? "#16a34a" :
                            elder.status === "yellow" ? "#a16207" :
                            elder.status === "orange" ? "#c2410c" :
                            "#dc2626",
                        }}
                      >
                        {elder.status === "green" ? "All good" :
                         elder.status === "yellow" ? "Due soon" :
                         elder.status === "orange" ? "Overdue" :
                         "⚠ Alert!"}
                      </span>
                      {birthdayDaysUntil === 0 && (
                        <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">🎂 Today!</span>
                      )}
                      {birthdayDaysUntil !== null && birthdayDaysUntil > 0 && (
                        <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">🎂 {birthdayDaysUntil}d</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h2 className="font-semibold text-foreground mb-2">No gran profiles yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Create a profile for your gran, or join an existing family with an invite code.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Add a Gran
              </Button>
              <Button variant="outline" onClick={() => navigate("/join")}>
                Join Family
              </Button>
            </div>
          </div>
        )}

        {/* Add button (when profiles exist) */}
        {elders && elders.length > 0 && (
          <div className="mt-6 flex gap-3">
            <Button className="flex-1" onClick={() => navigate("/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Add a Gran
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/join")}>
              Join Family
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
