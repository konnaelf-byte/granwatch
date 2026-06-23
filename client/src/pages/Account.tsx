import { useAuth } from "@/_core/hooks/useAuth";
import { getSignInUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Heart, ArrowLeft, LogOut, Mail, User, Share2, Trash2, Check } from "lucide-react";
import { ReferralCard } from "@/components/ReferralCard";
import { useEffect, useState } from "react";
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

// A name is considered "missing" if it's empty or just a placeholder dash.
// This is common for Sign in with Apple + Private Relay, where Apple only
// shares the name on first auth.
function isNameMissing(name: string | null | undefined): boolean {
  const trimmed = (name ?? "").trim();
  return trimmed === "" || trimmed === "-" || trimmed === "—";
}

export default function Account() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation();

  const utils = trpc.useUtils();
  const [nameInput, setNameInput] = useState("");
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();

  // Pre-fill the name field once the user loads (and keep in sync if it changes).
  useEffect(() => {
    if (isNameMissing(user?.name)) {
      setNameInput("");
    } else {
      setNameInput(user?.name ?? "");
    }
  }, [user?.name]);

  const nameMissing = isNameMissing(user?.name);
  const trimmedName = nameInput.trim();
  const nameChanged = trimmedName !== (user?.name ?? "").trim();
  const canSaveName =
    trimmedName.length > 0 && trimmedName.length <= 100 && nameChanged && !updateProfileMutation.isPending;

  async function handleSaveName() {
    if (!canSaveName) return;
    try {
      const updated = await updateProfileMutation.mutateAsync({ name: trimmedName });
      // Update the cached current user so the new name shows immediately.
      utils.auth.me.setData(undefined, updated);
      await utils.auth.me.invalidate().catch(() => {});
      toast.success("Name saved 💛");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save your name. Please try again.");
    }
  }

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
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
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
          <h1 className="text-xl font-bold text-foreground">
            {nameMissing ? "Welcome 💛" : user?.name}
          </h1>
        </div>

        {/* Gentle prompt when the name is missing (common for Apple Private Relay) */}
        {nameMissing && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-4">
            <p className="text-sm font-medium text-foreground mb-0.5">Add your name</p>
            <p className="text-xs text-muted-foreground">
              Looks like we don't have your name yet. Adding it helps your family
              recognise your visits and notes. You can set it below 👇
            </p>
          </div>
        )}

        {/* Details card */}
        <div className="bg-card border rounded-2xl divide-y">
          {/* Editable full name */}
          <div className="flex items-start gap-4 px-5 py-4">
            <User className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-6" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <Label htmlFor="account-name" className="text-xs text-muted-foreground mb-1.5 block">
                Full name
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="account-name"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleSaveName();
                  }}
                  placeholder="Your name"
                  maxLength={100}
                  autoComplete="name"
                  className="flex-1"
                />
                <Button onClick={handleSaveName} disabled={!canSaveName} className="flex-shrink-0">
                  {updateProfileMutation.isPending ? (
                    "Saving…"
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5" aria-hidden="true" />
                      Save
                    </>
                  )}
                </Button>
              </div>
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

        {/* Referral program */}
        <ReferralCard />

        {/* Share GranWatch (simple fallback share) */}
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
