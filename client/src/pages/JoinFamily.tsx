import { useAuth } from "@/_core/hooks/useAuth";
import { getSignInUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Heart, Users, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export default function JoinFamily() {
  const { code } = useParams<{ code?: string }>();
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [inviteCode, setInviteCode] = useState(code?.toUpperCase() ?? "");
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    if (code) setInviteCode(code.toUpperCase());
  }, [code]);

  const joinFamily = trpc.elders.join.useMutation({
    onSuccess: (elder) => {
      toast.success(`Welcome to ${elder?.name}'s family! 💚`);
      navigate(`/elder/${elder?.id}`);
    },
    onError: (e) => {
      // If already a member, just navigate to the elder profile
      if (e.message.includes("already a member")) {
        toast.info("You're already part of this family!");
        navigate("/dashboard");
      } else {
        toast.error(e.message);
      }
    },
  });

  // Auto-join when code is in URL and user is authenticated
  useEffect(() => {
    if (code && isAuthenticated && !loading && !autoJoinAttempted.current && !joinFamily.isPending) {
      autoJoinAttempted.current = true;
      joinFamily.mutate({ inviteCode: code.toUpperCase() });
    }
  }, [code, isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Heart className="w-8 h-8 text-primary fill-primary animate-pulse" />
      </div>
    );
  }

  // Not signed in but has a code — show sign-in with return path
  if (!isAuthenticated) {
    const returnPath = code ? `/join/${code}` : undefined;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <Heart className="w-12 h-12 text-primary fill-primary" />
        <h1 className="text-2xl font-bold">Join Gran's Family</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Sign in to join the family and start tracking visits.
        </p>
        <Button asChild className="w-full max-w-xs h-12">
          <a href={getSignInUrl(returnPath)}>Sign in to join</a>
        </Button>
      </div>
    );
  }

  // Auto-joining in progress (code from URL)
  if (code && joinFamily.isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <h1 className="text-xl font-bold text-foreground">Joining the family...</h1>
        <p className="text-muted-foreground text-sm">Hang tight, we're adding you now.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-foreground">Join a Family</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-5 py-12 max-w-lg mx-auto w-full flex flex-col items-center">
        <Users className="w-16 h-16 text-primary mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Enter the invite code</h2>
        <p className="text-muted-foreground text-sm text-center mb-8 max-w-xs">
          Ask a family member for the 8-character code from Gran's profile page.
        </p>

        <div className="w-full max-w-xs space-y-4">
          <Input
            placeholder="e.g. ABCD1234"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            className="h-14 text-center text-2xl font-mono tracking-widest uppercase"
            maxLength={8}
            autoFocus
          />

          <Button
            className="w-full h-12 text-base font-semibold"
            disabled={inviteCode.length < 6 || joinFamily.isPending}
            onClick={() => joinFamily.mutate({ inviteCode })}
          >
            {joinFamily.isPending ? "Joining..." : "Join Family"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center max-w-xs">
          By joining, you'll be able to see Gran's status, log visits, and book upcoming slots.
        </p>
      </main>
    </div>
  );
}
