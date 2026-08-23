#!/usr/bin/env python3
"""Monthly-day counters (user ask 2026-08-22): schema+server+client+i18n patches."""
import json, os
os.chdir(os.path.expanduser("~/Documents/Claude/GranWatch data from Manus"))

# ── 1. schema ────────────────────────────────────────────────────────────────
s = open("drizzle/schema.ts").read()
old = '''  /** Target interval in days: 7 = weekly, 91 = quarterly, 1–365 allowed */
  intervalDays: int("intervalDays").notNull(),'''
new = old + '''
  /** Calendar-anchored counters (user ask 2026-08-22: "pay the pharmacy bill
   *  on the 7th"): when set (1–31), the counter is due on this day of every
   *  month (clamped to the month's last day) instead of every intervalDays. */
  monthlyDay: int("monthlyDay"),'''
if "monthlyDay" not in s:
    assert s.count(old) == 1
    s = s.replace(old, new)
    open("drizzle/schema.ts", "w").write(s)
print("schema ok")

# ── 2. counterRouter: accept monthlyDay on add + update ─────────────────────
r = open("server/counterRouter.ts").read()
r = r.replace('''      intervalDays: z.number().int().min(1).max(365),''',
'''      intervalDays: z.number().int().min(1).max(365),
      monthlyDay: z.number().int().min(1).max(31).nullable().optional(),''')
r = r.replace('''        intervalDays: input.intervalDays,''',
'''        intervalDays: input.intervalDays,
        monthlyDay: input.monthlyDay ?? null,''')
r = r.replace('''        .set({ name: input.name, emoji: input.emoji, intervalDays: input.intervalDays })''',
'''        .set({ name: input.name, emoji: input.emoji, intervalDays: input.intervalDays, monthlyDay: input.monthlyDay ?? null })''')
open("server/counterRouter.ts", "w").write(r)
print("router ok")

# ── 3. cron: calendar-due branch before the interval logic ──────────────────
c = open("server/cron.ts").read()
old = '''          const anchor = lastLog ? lastLog.loggedAt : counter.createdAt;
          const overdueDays = daysSince(anchor);
          if (overdueDays < counter.intervalDays) continue;'''
new = '''          // Calendar-anchored counter ("on the 7th of each month"): due from
          // 00:00 on the clamped Nth; push once per month-crossing.
          if (counter.monthlyDay) {
            const nowD = new Date();
            const lastDom = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate();
            const dueThis = new Date(nowD.getFullYear(), nowD.getMonth(), Math.min(counter.monthlyDay, lastDom));
            if (nowD < dueThis) continue;                                   // not due yet this month
            if (lastLog && lastLog.loggedAt >= dueThis) continue;           // handled this month
            if (counter.lastNotifiedAt && counter.lastNotifiedAt >= dueThis) continue; // already pushed
            const mTargets = counter.scope === "private"
              ? (counter.ownerUserId ? [counter.ownerUserId] : [])
              : notifyableMembers.map((m) => m.userId);
            if (mTargets.length === 0) continue;
            const mPushed = await pushToUsers(db, mTargets, {
              title: `${counter.emoji} ${counter.name} — due today`,
              body: counter.scope === "private"
                ? `Your monthly task (day ${counter.monthlyDay}) for ${elder.name} is due. Tap to log it.`
                : `The family's monthly task (day ${counter.monthlyDay}) for ${elder.name} is due. Tap to log it.`,
              data: { path: `/elder/${elder.id}` },
            });
            await db
              .update(elderCounters)
              .set({ lastNotifiedAt: new Date() })
              .where(eq(elderCounters.id, counter.id));
            totalPushSent += mPushed;
            console.log(`[Cron] Elder ${elder.id} — counter "${counter.name}" (monthly day ${counter.monthlyDay}): ${mPushed} push`);
            continue;
          }

          const anchor = lastLog ? lastLog.loggedAt : counter.createdAt;
          const overdueDays = daysSince(anchor);
          if (overdueDays < counter.intervalDays) continue;'''
assert c.count(old) == 1
c = c.replace(old, new)
open("server/cron.ts", "w").write(c)
print("cron ok")

# ── 4. client: emoji, add-dialog mode, save, edit-prefill, row rendering ────
u = open("client/src/components/CustomCounters.tsx").read()
u = u.replace('const EMOJI_PRESETS = ["\U0001F49A", "\U0001F4DE", "\U0001F4AC", "\U0001F697", "\U0001F333", "☕", "\U0001F370", "\U0001F4F8", "\U0001F490", "\U0001F3B2", "\U0001F64F", "✈️"];',
'const EMOJI_PRESETS = ["\U0001F49A", "\U0001F4DE", "\U0001F4AC", "\U0001F697", "\U0001F333", "☕", "\U0001F370", "\U0001F4F8", "\U0001F490", "\U0001F3B2", "\U0001F64F", "✈️", "\U0001F9FE"];')
assert "\U0001F9FE" in u

u = u.replace('''  const [useCustom, setUseCustom] = useState(false);''',
'''  const [useCustom, setUseCustom] = useState(false);
  // Calendar-anchored mode: "on day N of each month" (e.g. pharmacy bill on the 7th)
  const [monthlyMode, setMonthlyMode] = useState(false);
  const [monthDay, setMonthDay] = useState("7");''')

old_submit = '''  const submitAdd = () => {
    const days = useCustom ? parseInt(customDays, 10) : intervalDays;
    if (!name.trim()) { toast.error(t("counters.errName")); return; }
    if (!days || days < 1 || days > 365) { toast.error(t("counters.errInterval")); return; }
    if (editingId !== null) {
      updateCounter.mutate({ counterId: editingId, name: name.trim(), emoji, intervalDays: days });
    } else {
      addCounter.mutate({ elderId, name: name.trim(), emoji, intervalDays: days, scope });
    }
  };'''
new_submit = '''  const submitAdd = () => {
    if (!name.trim()) { toast.error(t("counters.errName")); return; }
    let days = 30;                       // display fallback for monthly counters
    let mDay: number | null = null;
    if (monthlyMode) {
      mDay = parseInt(monthDay, 10);
      if (!mDay || mDay < 1 || mDay > 31) { toast.error(t("counters.errDay")); return; }
    } else {
      days = useCustom ? parseInt(customDays, 10) : intervalDays;
      if (!days || days < 1 || days > 365) { toast.error(t("counters.errInterval")); return; }
    }
    if (editingId !== null) {
      updateCounter.mutate({ counterId: editingId, name: name.trim(), emoji, intervalDays: days, monthlyDay: mDay });
    } else {
      addCounter.mutate({ elderId, name: name.trim(), emoji, intervalDays: days, scope, monthlyDay: mDay });
    }
  };'''
assert u.count(old_submit) == 1
u = u.replace(old_submit, new_submit)

old_edit = '''    if (preset) { setIntervalDays(c.intervalDays); setUseCustom(false); setCustomDays(""); }
    else { setUseCustom(true); setCustomDays(String(c.intervalDays)); }
    setAddOpen(true);'''
new_edit = '''    if (preset) { setIntervalDays(c.intervalDays); setUseCustom(false); setCustomDays(""); }
    else { setUseCustom(true); setCustomDays(String(c.intervalDays)); }
    setMonthlyMode(!!c.monthlyDay);
    setMonthDay(c.monthlyDay ? String(c.monthlyDay) : "7");
    setAddOpen(true);'''
assert u.count(old_edit) == 1
u = u.replace(old_edit, new_edit)

# row rendering: calendar math for monthly counters
old_row = '''        const neverLogged = !c.lastLog;
        const pct = c.daysSince / c.intervalDays;
        const remaining = Math.max(0, 1 - pct);
        const color = barColor(pct, neverLogged);
        const overdue = !neverLogged && pct >= 1;'''
new_row = '''        const neverLogged = !c.lastLog;
        let pct = c.daysSince / c.intervalDays;
        let overdue = !neverLogged && pct >= 1;
        let monthlyStatus: string | null = null;
        if (c.monthlyDay) {
          const now = new Date();
          const clamp = (y: number, m: number) => Math.min(c.monthlyDay, new Date(y, m + 1, 0).getDate());
          const dueThis = new Date(now.getFullYear(), now.getMonth(), clamp(now.getFullYear(), now.getMonth()));
          const last = c.lastLog ? new Date(c.lastLog.loggedAt) : null;
          const duePassed = now.getTime() >= dueThis.getTime();
          overdue = !neverLogged && duePassed && (!last || last.getTime() < dueThis.getTime());
          let next = dueThis;
          if (duePassed && !overdue) next = new Date(now.getFullYear(), now.getMonth() + 1, clamp(now.getFullYear(), now.getMonth() + 1));
          const prev = new Date(next.getFullYear(), next.getMonth() - 1, clamp(next.getFullYear(), next.getMonth() - 1));
          pct = overdue ? 1 : Math.min(1, Math.max(0, (now.getTime() - prev.getTime()) / (next.getTime() - prev.getTime())));
          monthlyStatus = overdue
            ? t("counters.monthlyOverdue", { day: c.monthlyDay })
            : (last && last.getTime() >= prev.getTime())
              ? t("counters.monthlyDone", { day: c.monthlyDay })
              : t("counters.monthlyDue", { day: c.monthlyDay });
        }
        const remaining = Math.max(0, 1 - pct);
        const color = barColor(pct, neverLogged);'''
assert u.count(old_row) == 1
u = u.replace(old_row, new_row)

old_status = '''                  {neverLogged
                    ? t("counters.notLogged")
                    : overdue
                      ? t("counters.overdueOf", { days: c.daysSince, interval: c.intervalDays })
                      : `${c.daysSince === 0 ? t("counters.doneToday") : t("counters.dAgo", { count: c.daysSince })} · ${t("counters.everyD", { count: c.intervalDays })}`}'''
new_status = '''                  {neverLogged
                    ? t("counters.notLogged")
                    : monthlyStatus !== null
                      ? monthlyStatus
                      : overdue
                        ? t("counters.overdueOf", { days: c.daysSince, interval: c.intervalDays })
                        : `${c.daysSince === 0 ? t("counters.doneToday") : t("counters.dAgo", { count: c.daysSince })} · ${t("counters.everyD", { count: c.intervalDays })}`}'''
assert u.count(old_status) == 1
u = u.replace(old_status, new_status)

# how-often chips: add the "day of month" chip + day input after the Custom button
old_chip = '''                <button
                  onClick={() => setUseCustom(true)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${useCustom ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                >
                  {t("counters.custom")}
                </button>
              </div>'''
new_chip = '''                <button
                  onClick={() => { setUseCustom(true); setMonthlyMode(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${useCustom && !monthlyMode ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                >
                  {t("counters.custom")}
                </button>
                <button
                  onClick={() => { setMonthlyMode(true); setUseCustom(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${monthlyMode ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}
                >
                  {t("counters.dayOfMonth")}
                </button>
              </div>
              {monthlyMode && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    value={monthDay}
                    onChange={(e) => setMonthDay(e.target.value)}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground">{t("counters.ofEachMonth")}</span>
                </div>
              )}'''
assert u.count(old_chip) == 1
u = u.replace(old_chip, new_chip)

# preset chips must also switch monthly mode off
u = u.replace('onClick={() => { setIntervalDays(p.days); setUseCustom(false); }}',
              'onClick={() => { setIntervalDays(p.days); setUseCustom(false); setMonthlyMode(false); }}')
# preset highlight should not show while monthly mode active
u = u.replace('${!useCustom && intervalDays === p.days ?',
              '${!useCustom && !monthlyMode && intervalDays === p.days ?')
open("client/src/components/CustomCounters.tsx", "w").write(u)
print("client ok")

# ── 5. i18n ×8 ──────────────────────────────────────────────────────────────
K = {
 "en":  {"dayOfMonth":"Day of month","ofEachMonth":"of each month (1–31)","monthlyDue":"Due on day {{day}} · monthly","monthlyDone":"Done ✓ · next on day {{day}}","monthlyOverdue":"Overdue — was due on day {{day}}","errDay":"Choose a day between 1 and 31"},
 "af":  {"dayOfMonth":"Dag van die maand","ofEachMonth":"van elke maand (1–31)","monthlyDue":"Betaalbaar op dag {{day}} · maandeliks","monthlyDone":"Gedoen ✓ · volgende op dag {{day}}","monthlyOverdue":"Agterstallig — was dag {{day}}","errDay":"Kies 'n dag tussen 1 en 31"},
 "nl":  {"dayOfMonth":"Dag van de maand","ofEachMonth":"van elke maand (1–31)","monthlyDue":"Gepland op dag {{day}} · maandelijks","monthlyDone":"Gedaan ✓ · volgende op dag {{day}}","monthlyOverdue":"Achterstallig — was dag {{day}}","errDay":"Kies een dag tussen 1 en 31"},
 "fr":  {"dayOfMonth":"Jour du mois","ofEachMonth":"de chaque mois (1–31)","monthlyDue":"Prévu le jour {{day}} · mensuel","monthlyDone":"Fait ✓ · prochain le jour {{day}}","monthlyOverdue":"En retard — prévu le jour {{day}}","errDay":"Choisissez un jour entre 1 et 31"},
 "de":  {"dayOfMonth":"Tag des Monats","ofEachMonth":"jedes Monats (1–31)","monthlyDue":"Fällig am Tag {{day}} · monatlich","monthlyDone":"Erledigt ✓ · nächster am Tag {{day}}","monthlyOverdue":"Überfällig — war Tag {{day}}","errDay":"Wähle einen Tag zwischen 1 und 31"},
 "es":  {"dayOfMonth":"Día del mes","ofEachMonth":"de cada mes (1–31)","monthlyDue":"Vence el día {{day}} · mensual","monthlyDone":"Hecho ✓ · próximo el día {{day}}","monthlyOverdue":"Atrasado — vencía el día {{day}}","errDay":"Elige un día entre 1 y 31"},
 "pt":  {"dayOfMonth":"Dia do mês","ofEachMonth":"de cada mês (1–31)","monthlyDue":"Vence no dia {{day}} · mensal","monthlyDone":"Feito ✓ · próximo no dia {{day}}","monthlyOverdue":"Atrasado — vencia no dia {{day}}","errDay":"Escolha um dia entre 1 e 31"},
 "fil": {"dayOfMonth":"Araw ng buwan","ofEachMonth":"ng bawat buwan (1–31)","monthlyDue":"Takda sa araw {{day}} · buwanan","monthlyDone":"Tapos ✓ · susunod sa araw {{day}}","monthlyOverdue":"Lampas na — takda noong araw {{day}}","errDay":"Pumili ng araw sa pagitan ng 1 at 31"},
}
for lang, kv in K.items():
    p = f"client/src/locales/{lang}.json"
    d = json.load(open(p, encoding="utf-8"))
    d.setdefault("counters", {}).update(kv)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")
print("i18n ok")
