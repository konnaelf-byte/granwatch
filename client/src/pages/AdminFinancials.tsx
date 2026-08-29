import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Banknote } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";

/**
 * Financials (owner/admin only). Assumptions live server-side behind the
 * admin gate. Series palette: validated CVD-safe set shared with the
 * growth dashboard -- likely=green, optimistic=violet, pessimistic=blue.
 */
const S = { likely: "#1e8a4c", optimistic: "#7c3aed", pessimistic: "#0369a1" };
const GRID = "#e7e5e4";
const AXIS = { fontSize: 12, fill: "#78716c" };
const tooltipStyle = { borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12, background: "#fff" };

const fmtUsd = (n: number) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`
  : n >= 1000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
  : `$${Math.round(n)}`;
const fmtZar = (n: number) =>
  n >= 1000000000 ? `R${(n / 1000000000).toFixed(2)}bn`
  : n >= 1000000 ? `R${(n / 1000000).toFixed(1)}M`
  : n >= 1000 ? `R${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
  : `R${Math.round(n)}`;

export default function AdminFinancials() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.admin.financials.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  useEffect(() => {
    if (!loading && user && user.role !== "admin") navigate("/dashboard");
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  if (loading || !user || user.role !== "admin") {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="text-stone-400 text-sm">Loading…</div></div>;
  }

  const fx = data?.fx ?? 18;
  const zar = (usd: number) => fmtZar(usd * fx);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-stone-500 hover:text-stone-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5" style={{ color: S.likely }} />
            <h1 className="text-lg font-bold text-stone-800">Financials</h1>
          </div>
          <span className="ml-auto text-xs text-stone-400">FX assumption: R{fx.toFixed(2)}/$ · founder-book figures, not audited</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {isLoading || !data ? (
          <div className="text-stone-400 text-sm py-12 text-center">Opening the books…</div>
        ) : (
          <>
            {/* Costs to date */}
            <div className="grid md:grid-cols-3 gap-4">
              {([
                ["Once-off (to date)", data.onceOff, data.totals.onceOffUsd],
                ["Annual", data.annual, data.totals.annualUsd],
                ["Monthly (fixed)", data.monthly, data.totals.monthlyFixedUsd],
              ] as const).map(([title, rows, total]) => (
                <Card key={title}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {rows.map((r: any) => (
                      <div key={r.item} className="flex justify-between gap-2 text-sm">
                        <span className="text-stone-600">{r.item}{r.est ? " *" : ""}</span>
                        <span className="font-medium tabular-nums whitespace-nowrap">{fmtUsd(r.usd)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold">
                      <span>Total</span>
                      <span className="tabular-nums">{fmtUsd(total)} · {zar(total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="py-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="text-sm text-stone-500">Keeping GranWatch running costs</span>
                <span className="text-2xl font-bold" style={{ color: S.likely }}>
                  {zar(data.totals.runRateUsd)}/month
                </span>
                <span className="text-sm text-stone-500">({fmtUsd(data.totals.runRateUsd)}/mo all-in: fixed monthly + annualised fees)</span>
                <span className="text-xs text-stone-400 w-full">* = estimate. Store/payment fees (~17%) scale with revenue and are already deducted from all revenue figures below (net ≈ ${data.netPerFamilyUsd}/family/mo).</span>
              </CardContent>
            </Card>

            {/* Cost scaling */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">How costs step up with growth</CardTitle>
                <p className="text-xs text-stone-400 font-normal">Per SCALE-GAMEPLAN.md tripwires — each step is a 5-minute dashboard upgrade, no rebuild.</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.costTiers.map((t: any, i: number) => {
                    const cum = data.totals.runRateUsd + data.costTiers.slice(0, i + 1).filter((c: any) => c.at > 0).reduce((s: number, c: any) => s + c.addUsd, 0);
                    return (
                      <div key={t.label} className="flex items-center gap-3 text-sm">
                        <div className="w-40 shrink-0 font-medium text-stone-700">{t.label}</div>
                        <div className="flex-1 text-stone-500">{t.add}{t.est ? " *" : ""}{t.addUsd > 0 ? ` (+$${t.addUsd}/mo)` : ""}</div>
                        <div className="w-40 text-right font-bold tabular-nums">{fmtUsd(cum)} · {zar(cum)}/mo</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Revenue projection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Net revenue projection — 36 months, three scenarios</CardTitle>
                <p className="text-xs text-stone-400 font-normal">
                  Paying families at month 12 / 24 / 36 — Pessimistic: 100 / 400 / 900 · Likely: 500 / 2,500 / 6,000 · Optimistic: 1,500 / 8,000 / 20,000. Net of ~17% store/payment fees. Gift commissions excluded (upside).
                </p>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.projection} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} label={{ value: "months from now", position: "insideBottom", offset: -2, fontSize: 11, fill: "#a8a29e" }} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtUsd(v)} width={64} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`${fmtUsd(Number(v))}/mo · ${zar(Number(v))}/mo`, name]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="optimisticRevenue" name="Optimistic" stroke={S.optimistic} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="likelyRevenue" name="Likely" stroke={S.likely} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pessimisticRevenue" name="Pessimistic" stroke={S.pessimistic} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profit projection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Projected monthly profit (net revenue − running costs)</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.projection} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmtUsd(v)} width={64} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`${fmtUsd(Number(v))}/mo · ${zar(Number(v))}/mo`, name]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#a8a29e" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="optimisticProfit" name="Optimistic" stroke={S.optimistic} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="likelyProfit" name="Likely" stroke={S.likely} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pessimisticProfit" name="Pessimistic" stroke={S.pessimistic} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Valuation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Valuation ladder</CardTitle>
                <p className="text-xs text-stone-400 font-normal">
                  Rows marked * are coach estimates; the rest follow the ARR-x-multiple model in STRATEGY.md. None of this is a professional valuation — real value is what an acquirer pays.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.valuation.map((v: any) => (
                    <div key={v.stage} className="flex items-center gap-3 text-sm">
                      <div className="flex-1 text-stone-700">{v.stage}{v.est ? " *" : ""}<span className="text-stone-400"> — {v.basis}</span></div>
                      <div className="w-56 text-right font-bold tabular-nums whitespace-nowrap">
                        {v.lowUsd === v.highUsd ? fmtUsd(v.lowUsd) : `${fmtUsd(v.lowUsd)}–${fmtUsd(v.highUsd)}`}
                        <span className="text-stone-500 font-normal"> · {v.lowUsd === v.highUsd ? zar(v.lowUsd) : `${zar(v.lowUsd)}–${zar(v.highUsd)}`}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-3">
                  Live anchors right now: {data.live.paying} paying gran profiles · {data.live.onTrial} on trial · {data.live.elders} total.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
