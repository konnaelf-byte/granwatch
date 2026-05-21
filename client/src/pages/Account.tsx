import { useAuth } from "@/_core/hooks/useAuth";
import { getSignInUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Heart, ArrowLeft, LogOut, Mail, User, Share2 } from "lucide-react";
import { useState } from "react";

const OG_SHARE_URL = "https://granwatch.com/api/og/share";

export default function Account() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Heart className="w-8 h-8 text-primary fill-primary animate-pulse" />
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

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  async function handleShareApp() {
    const shareData = {
      title: "GranWatch",
      text: "Let's take good care of Gran 💛 — track family visits and make sure she's never forgotten.",
      url: OG_SHARE_URL,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed — fall back to clipboard
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(OG_SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard not available
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-bold text-foreground">My Account</span>
        </div>
      </header>

      <main className="flex-1 px-5 py-8 max-w-lg mx-auto w-full space-y-6">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold select-none">
            {initials}
          </div>
          <h1 className="text-xl font-bold text-foreground">{user?.name ?? "—"}</h1>
        </div>

        {/* Details card */}
        <div className="bg-card border rounded-2xl divide-y">
          <div className="flex items-center gap-4 px-5 py-4">
            <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Full name</p>
              <p className="text-sm font-medium text-foreground truncate">{user?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">Email address</p>
              <p className="text-sm font-medium text-foreground truncate">{user?.email ?? "—"}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center px-4">
          To update your name or email, visit your account settings.
        </p>

        {/* Share GranWatch */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleShareApp}
        >
          <Share2 className="w-4 h-4 mr-2" />
          {copied ? "Link copied!" : "Share GranWatch"}
        </Button>

        {/* Sign out */}
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </main>
    </div>
  );
}
