import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bell, BellOff, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  nudge: { label: "Gentle nudge", icon: "💛", color: "text-yellow-600" },
  red_alert: { label: "Red alert!", icon: "🚨", color: "text-red-600" },
  weekly_digest: { label: "Weekly update", icon: "📋", color: "text-blue-600" },
};

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();

  const { data: notifs, isLoading } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      utils.notifications.list.invalidate();
    },
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const unread = notifs?.filter(n => !n.read) ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-foreground">Notifications</h1>
        {unread.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate({})}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            All read
          </Button>
        ) : (
          <div className="w-20" />
        )}
      </header>

      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifs && notifs.length > 0 ? (
          <div className="space-y-2">
            {notifs.map((n: any) => {
              const meta = TYPE_LABELS[n.type] ?? { label: n.type, icon: "🔔", color: "text-foreground" };
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markRead.mutate({ notificationId: n.id });
                  }}
                  className={`w-full text-left bg-card border rounded-xl p-4 flex items-start gap-3 transition-opacity ${
                    n.read ? "opacity-60" : "border-primary/30 shadow-sm"
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold text-sm ${meta.color}`}>{meta.label}</p>
                      <p className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(n.sentAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-1" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BellOff className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h2 className="font-semibold text-foreground mb-2">All quiet</h2>
            <p className="text-sm text-muted-foreground">
              No notifications yet. You'll hear from us when Gran needs attention.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
