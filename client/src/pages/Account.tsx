import { useAuth } from "@/_core/hooks/useAuth";
import { getSignInUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Heart, ArrowLeft, LogOut, Mail, User, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const OG_SHARE_URL = "https://granwatch.app";

export default function Account() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccountMutation.mutateAsync();
      toast.success("Account deleted. Goodbye 💛");
      // Give toast time to show, then log out
      setTimeout(() => logout(), 1500);
    } catch (err: any) {
      toast.error(err.message ?? "Could not delete account. Please contact hello@granwatch.app");
      setDeleting(false);
    }
  }

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

        {/* Legal links */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
        </div>

        {/* Delete account — shown at bottom, low prominence */}
        <div className="pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all your personal data.
                  Any gran profiles you administer will also be deleted — make sure to
                  transfer admin rights first if someone else should keep the profile.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, delete everything"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
