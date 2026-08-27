import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

/**
 * Growth & usage dashboard (owner/admin only).
 *
 * Chart palette: validated for colour-vision deficiency + contrast against the
 * app's light surface (green #1e8a4c / violet #7c3aed fixed series order).
 * Status colours (paying/trial/lapsed) are separate from series colours.
 */
const SERIES = { a: "#1e8a4c", b: "#7c3aed" };
const STATUS = { good: "#1e8a4c", warn: "#b45309", muted: "#78716c" };
const GRID = "#e7e5e4";
const AXIS = { fontSize: 12, fill: "#78716c" };

function StatTile({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-4 py-3">
      <div className="text-2xl font-bold" style={{ color: accent ?? "#1c1917" }}>{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function HBarList({ rows, color }: { rows: { name: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 text-sm">
          <div className="w-24 shrink-0 text-stone-600 truncate">{r.name}</div>
          <div className="flex-1 h-4 bg-stone-100 rounded overflow-hidden">
            <div className="h-full rounded" style={{ width: `${(r.count / max) * 100}%`, background: color }} />
          </div>
          <div className="w-8 text-right text-stone-800 font-medium tabular-nums">{r.count}</div>
        </div>
      ))}
      {rows.length === 0 && <div className="text-sm text-stone-400">No data yet</div>}
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e7e5e4",
  fontSize: 12,
  background: "#fff",
};

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading } = trpc.admin.dashboardStats.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  useEffect(() => {
    if (!loading && user && user.role !== "admin") navigate("/dashboard");
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: SERIES.a }} />
            <h1 className="text-lg font-bold text-stone-800">Growth Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {isLoading || !data ? (
          <div className="text-stone-400 text-sm py-12 text-center">Crunching the numbers…</div>
        ) : (
          <>
            {/* Headline numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Family members" value={data.totals.users} sub={`${data.activity.newUsers30} new in 30d`} />
              <StatTile label="Gran profiles" value={data.totals.elders} />
              <StatTile label="Visits logged" value={data.totals.visits} sub={`${data.activity.visitLoggers30} people logged in 30d`} />
              <StatTile label="Gift clicks" value={data.totals.giftClicks} />
              <StatTile label="Paying grans" value={data.totals.paying} accent={STATUS.good} />
              <StatTile label="On trial" value={data.totals.onTrial} accent={STATUS.warn} />
              <StatTile label="Trial lapsed" value={data.totals.lapsed} accent={STATUS.muted} />
              <StatTile label="Active users" value={data.activity.active7} sub={`7 days · ${data.activity.active30} in 30d`} />
            </div>

            {/* Growth over time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total growth — last 12 weeks</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.growth} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="totalUsers" name="Family members" stroke={SERIES.a} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="totalElders" name="Gran profiles" stroke={SERIES.b} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly signups + visits */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">New sign-ups per week</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weekly} margin={{ top: 8, right: 12, left: -18, bottom: 0 }} barGap={2}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
                      <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5f5f4" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="userSignups" name="Family members" fill={SERIES.a} radius={[4, 4, 0, 0]} maxBarSize={18} />
                      <Bar dataKey="elderSignups" name="Gran profiles" fill={SERIES.b} radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Visits logged per week</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weekly} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
                      <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5f5f4" }} />
                      <Bar dataKey="visits" name="Visits" fill={SERIES.a} radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Platforms + countries */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Users by platform</CardTitle>
                  <p className="text-xs text-stone-400 font-normal">
                    Via push registration — users who never enabled notifications show as “No push yet”.
                  </p>
                </CardHeader>
                <CardContent className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.platforms} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} horizontal={false} />
                      <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="platform" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} width={82} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f5f5f4" }} />
                      <Bar dataKey="count" name="Users" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {data.platforms.map((p) => (
                          <Cell key={p.platform} fill={p.platform === "No push yet" ? STATUS.muted : SERIES.a} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Grans by country</CardTitle>
                  <p className="text-xs text-stone-400 font-normal">Territory view — one row per gran profile’s country.</p>
                </CardHeader>
                <CardContent>
                  <HBarList rows={data.countries.map((c) => ({ name: c.country, count: c.count }))} color={SERIES.b} />
                </CardContent>
              </Card>
            </div>

            {/* Login methods + gifts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Sign-in methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <HBarList rows={data.loginMethods.map((m) => ({ name: m.method, count: m.count }))} color={SERIES.a} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Gift &amp; flower clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <HBarList
                    rows={data.gifts.map((g) => ({ name: `${g.giftType === "flowers" ? "💐" : "🎁"} ${g.partnerName}`, count: g.count }))}
                    color={SERIES.b}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
