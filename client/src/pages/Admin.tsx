import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Heart, ArrowLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: users, isLoading: usersLoading } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const { data: elders, isLoading: eldersLoading } = trpc.admin.listElders.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      navigate("/dashboard");
    }
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (user.role !== "admin") return null;

  const granPlusCount = elders?.filter((e) => e.isPaid).length ?? 0;
  const pendingCancellations = elders?.filter((e) => e.cancellationRequestedAt).length ?? 0;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h1 className="text-lg font-bold text-stone-800">GranWatch Admin</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-stone-800">{users?.length ?? "—"}</div>
              <div className="text-xs text-stone-500 mt-1">Registered users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-stone-800">{elders?.length ?? "—"}</div>
              <div className="text-xs text-stone-500 mt-1">Gran profiles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-orange-500">{granPlusCount}</div>
              <div className="text-xs text-stone-500 mt-1">Gran+ active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-red-500">{pendingCancellations}</div>
              <div className="text-xs text-stone-500 mt-1">Pending cancellations</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="bg-stone-100">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="elders" className="gap-2">
              <Heart className="w-4 h-4" />
              Gran Profiles
            </TabsTrigger>
          </TabsList>

          {/* Users tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-stone-700">
                  Registered Users
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-6 text-center text-stone-400 text-sm">Loading users…</div>
                ) : !users?.length ? (
                  <div className="p-6 text-center text-stone-400 text-sm">No users yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead>Last sign-in</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium text-stone-800">
                              {u.name || <span className="text-stone-400 italic">—</span>}
                            </TableCell>
                            <TableCell className="text-stone-600 text-sm">
                              {u.email || <span className="text-stone-400 italic">—</span>}
                            </TableCell>
                            <TableCell>
                              {u.role === "admin" ? (
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                  Admin
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-stone-500">
                                  User
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-stone-500 text-sm">
                              {formatDate(u.createdAt)}
                            </TableCell>
                            <TableCell className="text-stone-500 text-sm">
                              {formatDateTime(u.lastSignedIn)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gran Profiles tab */}
          <TabsContent value="elders">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-stone-700">
                  Gran Profiles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {eldersLoading ? (
                  <div className="p-6 text-center text-stone-400 text-sm">Loading profiles…</div>
                ) : !elders?.length ? (
                  <div className="p-6 text-center text-stone-400 text-sm">No profiles yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Gran+</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Last visit</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {elders.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium text-stone-800">{e.name}</TableCell>
                            <TableCell>
                              {e.isPaid ? (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                                  Active
                                </Badge>
                              ) : e.cancellationRequestedAt ? (
                                <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">
                                  Cancelling
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-stone-400">
                                  Free
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-stone-600 text-sm">{e.memberCount}</TableCell>
                            <TableCell className="text-stone-500 text-sm">
                              {e.daysSinceLastVisit !== null ? (
                                <span
                                  className={
                                    e.daysSinceLastVisit >= e.alertThresholdDays
                                      ? "text-red-500 font-medium"
                                      : e.daysSinceLastVisit >= 14
                                      ? "text-amber-500"
                                      : "text-green-600"
                                  }
                                >
                                  {e.daysSinceLastVisit === 0
                                    ? "Today"
                                    : `${e.daysSinceLastVisit}d ago`}
                                </span>
                              ) : (
                                <span className="text-stone-400 italic">No visits</span>
                              )}
                            </TableCell>
                            <TableCell className="text-stone-500 text-sm">
                              {formatDate(e.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
