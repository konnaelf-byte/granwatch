/**
 * CustomCounters — Gran+ feature (Konstand's spec, 2026-08-10).
 *
 * "One or two custom counters" per gran: any name + emoji, any interval in
 * days, drawn as a HORIZONTAL drain bar (deliberately different from the main
 * status ring). Bar drains as days pass; colours use the same banding as the
 * ring. Private counters show only to their owner (lock glyph) and their
 * logs never appear in the family feed.
 *
 * iOS note: the add dialog uses chip buttons + native inputs ONLY — no Radix
 * Select. (WKWebView eats dropdown item taps; see BirthdayPicker saga 2026-08.)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Lock, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

interface Props {
  elderId: number;
  /** Free elders: show a small teaser that opens the Gran+ upsell. */
  locked?: boolean;
  onUnlock?: () => void;
  /** Whether the current user is a family admin (may remove family counters). */
  isAdmin?: boolean;
  currentUserId?: number;
}

const EMOJI_PRESETS = ["💚", "📞", "💬", "🚗", "🌳", "☕", "🍰", "📸", "💐", "🎲", "🙏", "✈️"];

const INTERVAL_PRESETS = [
  { key: "counters.weekly", days: 7 },
  { key: "counters.twoWeeks", days: 14 },
  { key: "counters.monthly", days: 30 },
  { key: "counters.quarterly", days: 91 },
];

/** Same banding as the status ring; grey until first log. */
function barColor(pct: number, neverLogged: boolean): string {
  if (neverLogged) return "#94a3b8";       // slate — no baseline yet
  if (pct < 0.33) return "#22c55e";        // green
  if (pct < 0.66) return "#eab308";        // yellow
  if (pct < 1) return "#f97316";           // orange
  return "#ef4444";                        // red / overdue
}

export function CustomCounters({ elderId, locked = false, onUnlock, isAdmin = false, currentUserId }: Props) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Add-dialog state
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💚");
  const [intervalDays, setIntervalDays] = useState(7);
  const [customDays, setCustomDays] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [scope, setScope] = useState<"family" | "private">("family");

  const { data: counters = [], isLoading } =
    trpc.counters.list.useQuery({ elderId }, { enabled: !locked });

  const { data: history = [] } = trpc.counters.logs.useQuery(
    { counterId: expandedId ?? 0, limit: 10 },
    { enabled: expandedId !== null && !locked },
  );

  const invalidate = () => utils.counters.list.invalidate({ elderId });

  const addCounter = trpc.counters.add.useMutation({
    onSuccess: () => {
      toast.success(t("counters.toastAdded"));
      invalidate();
      setAddOpen(false);
      setName(""); setEmoji("💚"); setIntervalDays(7); setUseCustom(false); setCustomDays(""); setScope("family");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCounter = trpc.counters.update.useMutation({
    onSuccess: () => {
      toast.success(t("counters.toastUpdated"));
      invalidate();
      setAddOpen(false);
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const logCounter = trpc.counters.log.useMutation({
    onSuccess: () => {
      toast.success(t("counters.toastLogged"));
      invalidate();
      if (expandedId !== null) utils.counters.logs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeCounter = trpc.counters.remove.useMutation({
    onSuccess: () => { toast.success(t("counters.toastRemoved")); setExpandedId(null); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // ── Locked teaser ──────────────────────────────────────────────────────────
  if (locked) {
    return (
      <button
        onClick={() => onUnlock?.()}
        className="w-full mb-6 rounded-xl border border-dashed border-muted-foreground/30 p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Sparkles className="w-4 h-4 text-amber-500" />
        {t("counters.teaser")}
      </button>
    );
  }

  if (isLoading) return null;

  const familyCount = counters.filter((c: any) => c.scope === "family").length;
  const myPrivateCount = counters.filter((c: any) => c.scope === "private").length;
  const canAddFamily = familyCount < 2;
  const canAddPrivate = myPrivateCount < 2;
  const canAdd = canAddFamily || canAddPrivate;

  const submitAdd = () => {
    const days = useCustom ? parseInt(customDays, 10) : intervalDays;
    if (!name.trim()) { toast.error(t("counters.errName")); return; }
    if (!days || days < 1 || days > 365) { toast.error(t("counters.errInterval")); return; }
    if (editingId !== null) {
      updateCounter.mutate({ counterId: editingId, name: name.trim(), emoji, intervalDays: days });
    } else {
      addCounter.mutate({ elderId, name: name.trim(), emoji, intervalDays: days, scope });
    }
  };

  /** Open the dialog prefilled with an existing counter's values. */
  const openEdit = (c: any) => {
    setEditingId(c.id);
    setName(c.name);
    setEmoji(c.emoji);
    setScope(c.scope);
    const preset = INTERVAL_PRESETS.find(p => p.days === c.intervalDays);
    if (preset) { setIntervalDays(c.intervalDays); setUseCustom(false); setCustomDays(""); }
    else { setUseCustom(true); setCustomDays(String(c.intervalDays)); }
    setAddOpen(true);
  };

  return (
    <div className="mb-6 space-y-2">
      {counters.map((c: any) => {
        const neverLogged = !c.lastLog;
        const pct = c.daysSince / c.intervalDays;
        const remaining = Math.max(0, 1 - pct);
        const color = barColor(pct, neverLogged);
        const overdue = !neverLogged && pct >= 1;
        const expanded = expandedId === c.id;
        const canRemove = c.scope === "private"
          ? c.ownerUserId === currentUserId
          : c.createdByUserId === currentUserId || isAdmin;
        return (
          <div key={c.id} className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{c.emoji}</span>
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => setExpandedId(expanded ? null : c.id)}
              >
                <span className="text-sm font-medium truncate inline-flex items-center gap-1.5">
                  {c.name}
                  {c.scope === "private" && <Lock className="w-3 h-3 text-muted-foreground" aria-label="Private — only you see this" />}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {neverLogged
                    ? t("counters.notLogged")
                    : overdue
                      ? t("counters.overdueOf", { days: c.daysSince, interval: c.intervalDays })
                      : `${c.daysSince === 0 ? t("counters.doneToday") : t("counters.dAgo", { count: c.daysSince })} · ${t("counters.everyD", { count: c.intervalDays })}`}
                </span>
              </button>
              <Button
                size="sm"
                variant={overdue ? "default" : "outline"}
                className="h-8 px-3 text-xs flex-shrink-0"
                disabled={logCounter.isPending}
                onClick={() => logCounter.mutate({ counterId: c.id })}
              >
                {t("counters.logIt")}
              </Button>
              <button
                className="p-1 text-muted-foreground flex-shrink-0"
                onClick={() => setExpandedId(expanded ? null : c.id)}
                aria-label={expanded ? "Hide history" : "Show history"}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Horizontal drain bar — the whole point of the feature */}
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: neverLogged ? "100%" : `${Math.max(remaining * 100, overdue ? 0 : 4)}%`,
                  backgroundColor: color,
                  opacity: neverLogged ? 0.35 : 1,
                }}
              />
            </div>

            {expanded && (
              <div className="mt-3 pt-2 border-t space-y-1.5">
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("counters.noHistory")}</p>
                ) : (
                  history.map((h: any) => (
                    <p key={h.id} className="text-xs text-muted-foreground">
                      ✓ {h.byName} · {new Date(h.loggedAt).toLocaleDateString(i18next.language, { weekday: "short", day: "numeric", month: "short" })}
                      {h.note ? ` — ${h.note}` : ""}
                    </p>
                  ))
                )}
                {canRemove && (
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      className="text-xs text-muted-foreground inline-flex items-center gap-1"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="w-3 h-3" /> {t("counters.edit")}
                    </button>
                    <button
                      className="text-xs text-destructive/80 inline-flex items-center gap-1"
                      onClick={() => removeCounter.mutate({ counterId: c.id })}
                    >
                      <Trash2 className="w-3 h-3" /> {t("counters.removeCounter")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {canAdd && (
        <button
          onClick={() => {
            // Fresh add — clear any leftover edit state
            setEditingId(null);
            setName(""); setEmoji("💚"); setIntervalDays(7); setUseCustom(false); setCustomDays("");
            setScope(canAddFamily ? "family" : "private");
            setAddOpen(true);
          }}
          className="w-full rounded-xl border border-dashed border-muted-foreground/30 p-2.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {counters.length === 0 ? t("counters.addFirst") : t("counters.addAnother")}
        </button>
      )}

      {/* ── Add dialog — chips + native inputs only (iOS-safe) ── */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? t("counters.editTitle") : t("counters.newTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("counters.name")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder={t("counters.namePlaceholder")}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("counters.emoji")}</label>
              <div className="mt-1 grid grid-cols-6 gap-1.5">
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setEmoji(em)}
                    className={`text-xl p-1.5 rounded-lg border transition-colors ${emoji === em ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("counters.howOften")}</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {INTERVAL_PRESETS.map((p) => (
                  <button
                    key={p.days}
                    onClick={() => { setIntervalDays(p.days); setUseCustom(false); }}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${!useCustom && intervalDays === p.days ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                  >
                    {t(p.key)}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${useCustom ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                >
                  {t("counters.custom")}
                </button>
              </div>
              {useCustom && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder={t("counters.daysPlaceholder")}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">{t("counters.daysBetween")}</span>
                </div>
              )}
            </div>

            {/* Scope is fixed after creation (privacy of existing logs) — hidden when editing */}
            {editingId === null && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("counters.whoFor")}</label>
              <div className="mt-1 flex gap-1.5">
                <button
                  onClick={() => setScope("family")}
                  disabled={!canAddFamily}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs border transition-colors disabled:opacity-40 ${scope === "family" ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                >
                  {t("counters.wholeFamily")}
                  {!canAddFamily && <span className="block text-[10px] text-muted-foreground">{t("counters.limitReached")}</span>}
                </button>
                <button
                  onClick={() => setScope("private")}
                  disabled={!canAddPrivate}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs border transition-colors disabled:opacity-40 ${scope === "private" ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                >
                  {t("counters.justMe")}
                  {!canAddPrivate && <span className="block text-[10px] text-muted-foreground">{t("counters.limitReached")}</span>}
                </button>
              </div>
              {scope === "private" && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {t("counters.privateNote")}
                </p>
              )}
            </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditingId(null); }}>{t("common.cancel")}</Button>
            <Button onClick={submitAdd} disabled={addCounter.isPending || updateCounter.isPending}>
              {editingId !== null ? t("counters.saveChanges") : t("counters.addCounter")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
