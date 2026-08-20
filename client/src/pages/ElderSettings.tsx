import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Sparkles, Lock, Bell, BellOff, LogOut, AlertTriangle, CheckCircle2, Cake, Trash2 } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";
import { BirthdayPicker } from "@/components/BirthdayPicker";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GranPlusModal } from "@/components/GranPlusModal";
import { NativeGranPlusModal } from "@/components/NativeGranPlusModal";
import { isNativeApp } from "@/utils/platform";
import { usePurchaseHealer } from "@/hooks/usePurchaseHealer";
import { COUNTRIES } from "@/lib/countries";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { data: subStatus } = trpc.subscription.status.useQuery({ elderId });
  const cancellationPending = !!subStatus?.cancellationRequestedAt;
  const onTrial = !!subStatus?.trialActive;
  const trialDays = subStatus?.trialDaysLeft ?? null;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      cancellationPending ? "border-amber-300 bg-amber-50" : "border-primary/30 bg-primary/5"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold text-primary">
            {onTrial ? t("settings.granPlusTrial") : t("settings.granPlusActive")}
          </Label>
        </div>
        {cancellationPending ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> {t("settings.cancellationPending")}
          </span>
        ) : onTrial ? (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trialDays !== null && trialDays <= 30 ? "text-amber-700 bg-amber-100" : "text-green-700 bg-green-100"
          }`}>
            <CheckCircle2 className="w-3 h-3" /> {trialDays !== null ? t("settings.daysLeft", { count: trialDays }) : t("settings.activeBadge")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> {t("settings.activeBadge")}
          </span>
        )}
      </div>
      {onTrial && (
        <p className="text-xs text-muted-foreground">
          {t("settings.trialCardNote")}
        </p>
      )}

      {cancellationPending && (
        <p className="text-xs text-amber-700">
          {t("settings.cancelPendingNote")}
        </p>
      )}
      <Button variant="outline" size="sm" className="w-full" onClick={onManage}>
        <Sparkles className="w-4 h-4 mr-2" />
        {t("settings.manageSub")}
      </Button>
    </div>
  );
}

export default function ElderSettings() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const elderId = parseInt(id ?? "0");
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  const [granPlusOpen, setGranPlusOpen] = useState(false);
  const [nativeGranPlusOpen, setNativeGranPlusOpen] = useState(false);
  // Open the correct Gran+ upgrade UI: RevenueCat IAP on native, Lemon Squeezy on web.
  const openGranPlus = () => (isNativeApp ? setNativeGranPlusOpen(true) : setGranPlusOpen(true));
  // Configure RevenueCat on native so the upgrade modal can load pricing/purchase,
  // and finish any Gran+ purchase orphaned by a mid-payment app restart.
  usePurchaseHealer();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState(21);
  const [wellbeingEnabled, setWellbeingEnabled] = useState(false);
  const [careNotes, setCareNotes] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [socialNotificationsEnabled, setSocialNotificationsEnabled] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState(""); // "YYYY-MM-DD" for the input element
  const [country, setCountry] = useState(""); // ISO alpha-2 — for gift-delivery partners
  const [city, setCity] = useState("");
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
      setSocialNotificationsEnabled(elder.socialNotificationsEnabled ?? false);
      // birthday stored as "YYYY-MM-DD"; legacy records may be "MM-DD" — clear those so the user re-enters with year
      setBirthdayInput(elder.birthday && elder.birthday.length === 10 ? elder.birthday : "");
      setCountry(elder.country ?? "");
      setCity(elder.city ?? "");
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

  // Simulate the nightly logic at an arbitrary day count (owner-admin only).
  const [simReport, setSimReport] = useState<Record<string, unknown> | null>(null);
  const simulate = trpc.smartNotify.simulate.useMutation({
    onSuccess: (data) => {
      setSimReport(data as unknown as Record<string, unknown>);
      toast.success(
        data.emailsActuallySent > 0
          ? `Simulated day ${data.simulatedDaysSince} — ${data.emailsActuallySent} real email(s) sent!`
          : `Simulated day ${data.simulatedDaysSince} (dry run) — see report below.`
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const updateElder = trpc.elders.update.useMutation({
    onSuccess: () => {
      // Invalidate queries so all consumers get fresh data.
      // Navigation (if needed) is handled at the call site, not here —
      // this mutation is reused for both photo uploads and full settings saves.
      utils.elders.get.invalidate({ elderId });
      utils.elders.list.invalidate();
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
      toast.success(t("settings.toastLeft"));
      utils.elders.list.invalidate();
      navigate("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  const stepDown = trpc.elders.stepDownAsAdmin.useMutation({
    onSuccess: () => {
      toast.success(t("settings.toastSteppedDown"));
      utils.elders.get.invalidate({ elderId });
      utils.elders.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteElder = trpc.elders.delete.useMutation({
    onSuccess: () => {
      toast.success(t("settings.toastDeleted"));
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
      // Save full "YYYY-MM-DD", or null to clear
      const birthday = birthdayInput || null;
      updateElder.mutate({
        elderId,
        name: name.trim(),
        alertThresholdDays: threshold,
        birthday,
        country: country || null,
        city: city.trim() || null,
        wellbeingEnabled: isPaid ? wellbeingEnabled : undefined,
        careNotes: isPaid ? careNotes : undefined,
      }, {
        onSuccess: () => {
          toast.success(t("settings.toastSaved"));
          navigate(`/elder/${elderId}`);
        },
      });
    }
    // Save notification preferences (all members)
    if (
      notificationsEnabled !== (elder.notificationsEnabled ?? true) ||
      socialNotificationsEnabled !== (elder.socialNotificationsEnabled ?? false)
    ) {
      updateNotifPrefs.mutate({ elderId, notificationsEnabled, socialNotificationsEnabled });
    }
    if (!isAdmin) {
      toast.success(t("settings.toastPrefsSaved"));
      navigate(`/elder/${elderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/elder/${elderId}`)} aria-label="Back to gran profile">
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Button>
        <h1 className="font-bold text-foreground">{t("settings.title")}</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full space-y-6">
        {!isAdmin && (
          <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground text-center">
            {t("settings.adminOnly")}
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
            <Label className="text-sm font-semibold">{t("create.granName")}</Label>
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
              {t("create.granBirthday")} <span className="font-normal text-muted-foreground">{t("common.optional")}</span>
            </Label>
            <BirthdayPicker value={birthdayInput} onChange={setBirthdayInput} />
            <p className="text-xs text-muted-foreground">{t("settings.bdayHelp2")}</p>
          </div>
        )}

        {/* Location — for gift/flower delivery partners (admin only) */}
        {isAdmin && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("create.whereLive")} <span className="font-normal text-muted-foreground">{t("common.optional")}</span></Label>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("create.selectCountry")}</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <Input
              placeholder={t("create.cityPlaceholder")}
              value={city}
              onChange={e => setCity(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">{t("create.locationHelp")}</p>
          </div>
        )}

        {/* Alert threshold — admin only */}
        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">{t("create.alertAfter")}</Label>
              <span className="text-primary font-bold text-sm">{t("create.daysValue", { count: threshold })}</span>
            </div>
            <Slider
              min={7}
              max={60}
              step={1}
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("create.days7")}</span>
              <span>{t("create.days60")}</span>
            </div>
          </div>
        )}

        {/* ─── MY NOTIFICATION PREFERENCES (all members) ─── */}
        <div className="rounded-xl border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {notificationsEnabled
                  ? <Bell className="w-4 h-4 text-primary" />
                  : <BellOff className="w-4 h-4 text-muted-foreground" />
                }
                <Label className="text-sm font-semibold">{t("settings.myNotifications")}</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {notificationsEnabled ? t("settings.notifOn") : t("settings.notifOff")}
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
          {notificationsEnabled && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex-1">
                <Label className="text-sm font-semibold">{t("settings.familyUpdates")}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("settings.familyUpdatesSub", { name: elder.name })}
                </p>
              </div>
              <Switch
                checked={socialNotificationsEnabled}
                onCheckedChange={setSocialNotificationsEnabled}
              />
            </div>
          )}
        </div>


        {/* Care notes — Gran+ only, admin only */}
        {isAdmin && (
          <div className={`space-y-2 ${!isPaid ? "opacity-75" : ""}`}>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold">{t("settings.careNotes")}</Label>
              {!isPaid && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <Textarea
              placeholder={t("settings.careNotesPlaceholder")}
              value={careNotes}
              onChange={e => setCareNotes(e.target.value)}
              rows={4}
              className="resize-none"
              disabled={!isPaid}
              onClick={() => { if (!isPaid) openGranPlus(); }}
            />
            {!isPaid && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary font-semibold p-0 h-auto"
                onClick={openGranPlus}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {t("care.unlockCta")}
              </Button>
            )}
          </div>
        )}

        {/* Gran+ subscription management — admin only, when paid */}
        {isAdmin && isPaid && (
          <GranPlusSettingsCard elderId={elderId} elderName={elder.name} onManage={openGranPlus} />
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

            {/* Threshold simulator — verify 14-day (longest-absent only) and
                21-day (whole family) targeting without waiting weeks. */}
            <p className="text-xs text-muted-foreground pt-1">
              Simulate "days since last visit" to verify who would be notified (dry run — nothing sent):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" disabled={simulate.isPending}
                onClick={() => simulate.mutate({ elderId, simulatedDaysSince: 14 })}>
                Simulate day 14
              </Button>
              <Button variant="outline" size="sm" disabled={simulate.isPending}
                onClick={() => simulate.mutate({ elderId, simulatedDaysSince: 21 })}>
                Simulate day 21
              </Button>
            </div>
            {simReport && (
              <div className="text-xs bg-muted rounded-lg p-3 space-y-1 font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(simReport.report, null, 1)}
                <Button variant="outline" size="sm" className="w-full mt-2 font-sans" disabled={simulate.isPending}
                  onClick={() => simulate.mutate({ elderId, simulatedDaysSince: Number(simReport.simulatedDaysSince), sendEmails: true })}>
                  📧 Send these emails for real
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Save */}
        <Button
          className="w-full h-12 font-semibold"
          onClick={handleSave}
          disabled={updateElder.isPending || updateNotifPrefs.isPending}
        >
          {updateElder.isPending || updateNotifPrefs.isPending ? t("settings.saving") : t("settings.saveSettings")}
        </Button>

        {/* Delete this gran — admin only. Destructive: removes the profile and
            all its data for the WHOLE family. */}
        {isAdmin && (
          <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" />
              <Label className="text-sm font-semibold text-destructive">{t("settings.deleteGran")}</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.deleteGranDesc", { name: elder.name })}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("settings.deleteGranBtn", { name: elder.name })}
            </Button>
          </div>
        )}

        {/* Leave Family — everyone. Admins can leave (or step down) only when
            another admin exists; the server enforces it and explains why. */}
        <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-destructive" />
            <Label className="text-sm font-semibold text-destructive">{t("settings.leaveFamily")}</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings.leaveDesc", { name: elder.name })}
            {isAdmin && " " + t("settings.leaveAdminNote")}
          </p>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => stepDown.mutate({ elderId })}
              disabled={stepDown.isPending}
            >
              {stepDown.isPending ? t("settings.steppingDown") : t("settings.stepDown")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
            onClick={() => setLeaveDialogOpen(true)}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("settings.leaveBtn", { name: elder.name })}
          </Button>
        </div>
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
              {t("settings.leaveTitle", { name: elder.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.leaveDialogDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => leaveFamily.mutate({ elderId })}
            >
              {leaveFamily.isPending ? t("settings.leaving") : t("settings.yesLeave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete gran confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("settings.deleteTitle", { name: elder.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.deleteDialogDesc", { name: elder.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteElder.mutate({ elderId })}
            >
              {deleteElder.isPending ? t("settings.deleting") : t("settings.yesDeleteForever")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
