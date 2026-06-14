import { useAuth } from "@/_core/hooks/useAuth";
import { getSignInUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Heart, Bell, Calendar, Users, Camera, CheckCircle } from "lucide-react";
import { MONTHLY_COST_CENTS } from "@shared/const";
import StatusRing from "@/components/StatusRing";
import { useEffect } from "react";

const GRAN_PHOTO = "/icon-1024.png";

export default function Landing() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // Persist referral code from ?ref= param so we can attribute the signup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("granwatch_ref", ref.toUpperCase());
    }
  }, []);

  // Navigate after render — calling navigate() during render triggers a React warning
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, navigate]);

  if (!loading && isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — only show Sign in button when we know user is NOT authenticated */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary fill-primary" />
          <span className="text-xl font-bold text-foreground">GranWatch</span>
        </div>
        {/* Only show Sign in button once auth check is complete and user is not signed in */}
        {!loading && !isAuthenticated && (
          <Button asChild size="sm">
            <a href={getSignInUrl()}>Sign in</a>
          </Button>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-lg mx-auto">
          {/* Demo status ring */}
          <div className="flex justify-center mb-8">
            <StatusRing
              photoUrl={GRAN_PHOTO}
              name="Dorothy"
              daysSinceVisit={14}
              status="orange"
              size={180}
            />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            Make sure Gran<br />never goes unvisited
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            A simple family app that keeps everyone on the same page.
            The colour ring tells you at a glance — and alerts the whole family when it turns red.
          </p>

          <Button asChild size="lg" className="w-full max-w-xs text-base h-12">
            <a href={getSignInUrl()}>Get started — it's free</a>
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            No app store needed. Works on any phone or computer.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-lg w-full">
          <h2 className="text-2xl font-bold text-foreground mb-2">How it works</h2>
          <p className="text-muted-foreground text-sm mb-10">Three simple steps. No fuss.</p>

          <div className="flex flex-col gap-6 text-left">
            {[
              {
                step: "1",
                icon: <Camera className="w-5 h-5" />,
                title: "Add your gran",
                desc: "Create a profile with her name and photo. Set how often she should be visited — the ring starts counting.",
              },
              {
                step: "2",
                icon: <Users className="w-5 h-5" />,
                title: "Invite the family",
                desc: "Share a link or code. Everyone joins the same profile. No accounts needed for family members — just tap and join.",
              },
              {
                step: "3",
                icon: <CheckCircle className="w-5 h-5" />,
                title: "Log visits, stay green",
                desc: "After each visit, tap 'Log a Visit'. The ring resets to green. If it turns red, the family gets a nudge — privately, not publicly.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 bg-card border rounded-2xl p-5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-primary-foreground font-bold text-sm"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  {item.step}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary">{item.icon}</span>
                    <span className="font-semibold text-foreground">{item.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-4 mt-16 max-w-md w-full">
          {[
            { icon: <Heart className="w-5 h-5" />, title: "Visual status ring", desc: "Green to red — see instantly how long it's been" },
            { icon: <Bell className="w-5 h-5" />, title: "Family alerts", desc: "Everyone gets notified when Gran needs a visit" },
            { icon: <Calendar className="w-5 h-5" />, title: "Book a slot", desc: "Claim a date so the family knows it's covered" },
            { icon: <Users className="w-5 h-5" />, title: "Up to 20 members", desc: "Invite the whole family with a single link" },
          ].map((f, i) => (
            <div key={i} className="bg-card rounded-xl p-4 text-left border">
              <div className="text-primary mb-2">{f.icon}</div>
              <div className="font-semibold text-sm text-foreground mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Pricing teaser */}
        <div className="mt-12 max-w-sm w-full bg-card border rounded-2xl p-6 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-foreground">Gran+</span>
            <span className="text-primary font-bold">R{(MONTHLY_COST_CENTS / 100).toFixed(0)}/month</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Split between the whole family — could be as little as R{Math.ceil(MONTHLY_COST_CENTS / 300).toFixed(0)} each.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {["Wellbeing check-ins", "Visit photos & notes", "Multiple gran profiles", "Custom alert threshold", "Full visit history"].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-primary">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Final CTA */}
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="w-full max-w-xs text-base h-12">
            <a href={getSignInUrl()}>Start for free</a>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">No credit card needed. Free forever for one gran profile.</p>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t space-y-2">
        <div className="flex items-center justify-center gap-4">
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          <span>·</span>
          <a href="mailto:hello@granwatch.app" className="hover:text-foreground transition-colors">Contact</a>
        </div>
        <p>© 2026 GranWatch — made with love, for every gran.</p>
      </footer>
    </div>
  );
}
