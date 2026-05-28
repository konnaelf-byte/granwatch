import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Sparkles, Lock, Bell, BellOff, LogOut, AlertTriangle, Users, CheckCircle2, Cake } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GranPlusModal } from "@/components/GranPlusModal";
import { isNativeApp } from "@/utils/platform";
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

// Inline card component for Gran+ status in settings
function GranPlusSettingsCard({ elderId, elderName: _elderName, onManage }: { elderId: number; elderName: string; onManage: () => void }) {
  const { data: subStatus } = trpc.subscription.status.useQuery({ elderId });
  const cancellationPending = !!subStatus?.cancellationRequestedAt;
  const contributorCount = subStatus?.contributorCount ?? 0;
  const perPersonRands = subStatus ? (subStatus.perPersonCost / 100).toFixed(2) : "79.00";

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      cancellationPending ? "border-amber-300 bg-amber-50" : "border-primary/30 bg-primary/5"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-primary">Gran+ Active</Label>
        </div>
        {cancellationPending ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Cancellation pending
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {contributorCount > 0 ? `${contributorCount} contributor${contributorCount !== 1 ? "s" : ""}` : "No contributors yet"}
        </span>
        <span>R{perPersonRands}/person/mo</span>
      </div>
      {cancellationPending && (
        <p className="text-xs text-amber-700">
          Cancellation requested. Gran+ stays active until the end of the billing period.
        </p>
      )}
      <Button variant="outline" size="sm" className="w-full" onClick={onManage}>
        <Sparkles className="w-4 h-4 mr-2" />
        Manage Gran+ Subscription
      </Button>
    </div>
  );
}

export default function ElderSettings() {
  const { id } = useParams<{ id: string }>();
  const elderId = parseInt(id ?? "0");
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [granPlusOpen, setGranPlusOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState(21);
  const [wellbeingEnabled, setWellbeingEnabled] = useState(false);
  const [careNotes, setCareNotes] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [birthdayInput, setBirthdayInput] = useState(""); // "YYYY-MM-DD" for the input element
  const [initialized, setInitialized] = useState(false);

  const utils = trpc.useUtils();

  const { data: elder } = trpc.elders.get.useQuery(
    { elderId },
    { enabled: isAuthenticated && elderId > 0 }
  );

  useEffect(() => {
    if (elder && !initialized) {
      setName(elder.name);
      setThreshold(elder.alertThresholdDays);
      setWellbeingEnabled(elder.wellbeingEnabled);
      setCareNotes(elder.careNotes ?? "");
      setNotificationsEnabled(elder.notificationsEnabled ?? true);
      // birthday stored as "MM-DD", input needs "YYYY-MM-DD" (use a dummy year)
      setBirthdayInput(elder.birthday ? `2000-${elder.birthday}` : "");
      setInitialized(true);
    }
  }, [elder, initialized]);

  const testNotify = trpc.smartNotify.test.useMutation({
    onSuccess: (data) => {
      if (data.sent === 0) {
        toast.info(data.message);
      } else {
        toast.success(data.message);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const updateElder = trpc.elders.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved!");
      utils.elders.get.invalidate({ elderId });
      utils.elders.list.invalidate();
      navigate(`/elder/${elderId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateNotifPrefs = trpc.elders.updateNotificationPrefs.useMutation({
    onSuccess: () => {
      utils.elders.get.invalidate({ elderId });
    },
    onError: (e) => toast.error(e.message),
  });

  const leaveFamily = trpc.elders.leave.useMutation({
    onSuccess: () => {
      toast.success("You have left this family.");
      utils.elders.list.invalidate();
      navigate("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!elder) return null;

  const isAdmin = elder.memberRole === "admin";
  const isPaid = elder.isPaid;

  const handleSave = () => {
    // Save elder settings (admin only)
    if (isAdmin) {
      // Convert "YYYY-MM-DD" → "MM-DD", or null to clear
      const birthday = birthdayInput ? birthdayInput.slice(5) : null;
      updateElder.mutate({
        elderId,
        name: name.trim(),
        alertThresholdDays: threshold,
        birthday,
        wellbeingEnabled: isPaid ? wellbeingEnabled : undefined,
        careNotes: isPaid ? careNotes : undefined,
      });
    }
    // Save notification preference (all members)
    if (notificationsEnabled !== (elder.notificationsEnabled ?? true)) {
      updateNotifPrefs.mutate({ elderId, notificationsEnabled });
    }
    if (!isAdmin) {
      toast.success("Preferences saved!");
      navigate(`/elder/${elderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/elder/${elderId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-foreground">Settings</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full space-y-6">
        {!isAdmin && (
          <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground text-center">
            Only the profile admin can change gran's settings. You can update your personal preferences below.
          </div>
        )}

        {/* Photo — admin only */}
        {isAdmin && (
          <div className="flex justify-center">
            <PhotoUpload
              currentPhotoUrl={elder.photoUrl}
              name={elder.name}
              onUpload={(url) => {
                updateElder.mutate({ elderId, photoUrl: url });
              }}
              size={100}
            />
          </div>
        )}

        {/* Name — admin only */}
        {isAdmin && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Gran's name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-12"
            />
          </div>
        )}

        {/* Birthday — admin only */}
        {isAdmin && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Cake className="w-4 h-4 text-primary" />
              Gran's birthday <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="date"
              value={birthdayInput}
              onChange={e => setBirthdayInput(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">The whole family gets a reminder 3 days before her birthday. Leave blank to disable.</p>
          </div>
        )}

        {/* Alert threshold — admin only */}
        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Alert after</Label>
              <span className="text-primary font-bold text-sm">{threshold} days</span>
            </div>
            <Slider
              min={7}
              max={60}
              step={1}
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>7 days</span>
              <span>60 days</span>
            </div>
          </div>
        )}

        {/* ─── MY NOTIFICATION PREFERENCES (all members) ─── */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {notificationsEnabled
                  ? <Bell className="w-4 h-4 text-primary" />
                  : <BellOff className="w-4 h-4 text-muted-foreground" />
                }
                <Label className="text-sm font-semibold">My notifications</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {notificationsEnabled
                  ? "You'll receive nudges and alerts for this gran profile."
                  : "Notifications are off. You won't be nudged for this profile."}
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </div>

        {/* Wellbeing toggle — Gran+ only, admin only */}
        {isAdmin && (
          <div className={`rounded-xl border p-4 ${!isPaid ? "opacity-75" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">Wellbeing check-ins</Label>
                  {!isPaid && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ask visitors to rate Gran's mood (1–5) after each visit.
                </p>
              </div>
              <Switch
                checked={wellbeingEnabled}
                onCheckedChange={(v) => {
                  if (!isPaid) {
                    if (!isNativeApp) setGranPlusOpen(true);
                    return;
                  }
                  setWellbeingEnabled(v);
                }}
              />
            </div>
            {!isPaid && !isNativeApp && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-primary font-semibold p-0 h-auto"
                onClick={() => setGranPlusOpen(true)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Unlock with Gran+
              </Button>
            )}
          </div>
        )}

        {/* Care notes — Gran+ only, admin only */}
        {isAdmin && (
          <div className={`space-y-2 ${!isPaid ? "opacity-75" : ""}`}>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">Care notes</Label>
              {!isPaid && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <Textarea
              placeholder="Reminders for visitors — medication, dietary needs, things she loves..."
              value={careNotes}
              onChange={e => setCareNotes(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={!isPaid}
              onClick={() => { if (!isPaid && !isNativeApp) setGranPlusOpen(true); }}
            />
            {!isPaid && !isNativeApp && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary font-semibold p-0 h-auto"
                onClick={() => setGranPlusOpen(true)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Unlock with Gran+
              </Button>
            )}
          </div>
        )}

        {/* Gran+ subscription management — admin only, when paid, web only */}
        {isAdmin && isPaid && !isNativeApp && (
          <GranPlusSettingsCard elderId={elderId} elderName={elder.name} onManage={() => setGranPlusOpen(true)} />
        )}

        {/* Test notifications — admin only */}
        {isAdmin && (
          <div className="rounded-xl border border-dashed p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Test Notifications</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Fire smart notifications right now to test the system. Nudges go to the longest-absent members first. If a covering visit is already booked, no alerts are sent.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => testNotify.mutate({ elderId })}
              disabled={testNotify.isPending}
            >
              <Bell className="w-4 h-4 mr-2" />
              {testNotify.isPending ? "Sending..." : "Send Test Notifications"}
            </Button>
          </div>
        )}

        {/* Save */}
        <Button
          className="w-full h-12 font-semibold"
          onClick={handleSave}
          disabled={updateElder.isPending || updateNotifPrefs.isPending}
        >
          {updateElder.isPending || updateNotifPrefs.isPending ? "Saving..." : "Save Settings"}
        </Button>

        {/* Leave Family — non-admin members only */}
        {!isAdmin && (
          <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-destructive" />
              <Label className="text-sm font-semibold text-destructive">Leave this family</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              You'll be removed from {elder.name}'s profile and will no longer receive notifications or see visit history. You can rejoin with the invite code.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => setLeaveDialogOpen(true)}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave {elder.name}'s family
            </Button>
          </div>
        )}
      </main>

      {/* Gran+ Modal — web only; hidden in native app (Apple Reader App model) */}
      {!isNativeApp && (
        <GranPlusModal
          open={granPlusOpen}
          onOpenChange={setGranPlusOpen}
          elderId={elderId}
          elderName={elder.name}
          isAdmin={isAdmin}
        />
      )}

      {/* Leave family confirmation dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Leave {elder.name}'s family?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You'll be removed from this profile immediately. You can rejoin later using the family invite code, but your visit history will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => leaveFamily.mutate({ elderId })}
            >
              {leaveFamily.isPending ? "Leaving..." : "Yes, leave family"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
