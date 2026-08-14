import { useAuth } from "@/_core/hooks/useAuth";
import { getSignInUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Heart, Bell, Calendar, Users, Camera, CheckCircle } from "lucide-react";
import { isNativeApp } from "@/utils/platform";
import HeroLogoRing from "@/components/HeroLogoRing";
import { LanguageButton } from "@/components/LanguagePicker";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function Landing() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useTranslation();

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

  const steps = [
    { step: "1", icon: <Camera className="w-5 h-5" />, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { step: "2", icon: <Users className="w-5 h-5" />, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { step: "3", icon: <CheckCircle className="w-5 h-5" />, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
  ];

  const feats = [
    { icon: <Heart className="w-5 h-5" />, title: t("landing.feat1Title"), desc: t("landing.feat1Desc") },
    { icon: <Bell className="w-5 h-5" />, title: t("landing.feat2Title"), desc: t("landing.feat2Desc") },
    { icon: <Calendar className="w-5 h-5" />, title: t("landing.feat3Title"), desc: t("landing.feat3Desc") },
    { icon: <Users className="w-5 h-5" />, title: t("landing.feat4Title"), desc: t("landing.feat4Desc") },
  ];

  const plusFeats = [
    t("landing.plusFeat1"), t("landing.plusFeat2"), t("landing.plusFeat3"),
    t("landing.plusFeat4"), t("landing.plusFeat5"), t("landing.plusFeat6"),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — only show Sign in button when we know user is NOT authenticated */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-2">
          {/* Brand mark = the app icon (BRAND.md, Konna 2026-08-13) */}
          <img src="/icon-192.png" alt="" className="w-7 h-7 rounded-md" />
          <span className="text-xl font-bold text-foreground">GranWatch</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageButton />
          {!loading && !isAuthenticated && (
            <Button asChild size="sm">
              <a href={getSignInUrl()}>{t("common.signIn")}</a>
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-lg mx-auto">
          {/* Living logo — the status ring drains as days pass, then a visit
              snaps it back to green. Teaches the product mechanic wordlessly. */}
          <div className="flex justify-center mb-8">
            <HeroLogoRing size={220} />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
            {t("landing.heroLine1")}<br />{t("landing.heroLine2")}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {t("landing.heroSub")}
          </p>

          <Button asChild size="lg" className="w-full max-w-xs text-base h-12">
            <a href={getSignInUrl()}>{t("landing.ctaGetStarted")}</a>
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            {t("landing.noAppStore")}
          </p>
        </div>

        {/* How it works */}
        <div className="mt-20 max-w-lg w-full">
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("landing.howTitle")}</h2>
          <p className="text-muted-foreground text-sm mb-10">{t("landing.howSub")}</p>

          <div className="flex flex-col gap-6 text-left">
            {steps.map((item) => (
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
          {feats.map((f, i) => (
            <div key={i} className="bg-card rounded-xl p-4 text-left border">
              <div className="text-primary mb-2">{f.icon}</div>
              <div className="font-semibold text-sm text-foreground mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Pricing teaser — $2.99/mo flat worldwide (parity with the stores;
            Konna 2026-08-13). Same price whether native or web. */}
        <div className="mt-12 max-w-sm w-full bg-card border rounded-2xl p-6 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-foreground">Gran+</span>
            <span className="text-primary font-bold">{t("landing.pricePerMonth")}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t("landing.priceLine")}
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {plusFeats.map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-primary">✓</span> {f}
              </li>
            ))}
          </ul>
          {isNativeApp && (
            <p className="text-xs text-muted-foreground mt-3">
              {t("landing.billedAppStore")}
            </p>
          )}
        </div>

        {/* Final CTA */}
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="w-full max-w-xs text-base h-12">
            <a href={getSignInUrl()}>{t("landing.ctaStart")}</a>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">{t("landing.noCard")}</p>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t space-y-2">
        <div className="flex items-center justify-center gap-4">
          <a href="/guides" className="hover:text-foreground transition-colors">{t("landing.footGuides")}</a>
          <span>·</span>
          <a href="/faq" className="hover:text-foreground transition-colors">{t("landing.footFaq")}</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-foreground transition-colors">{t("landing.footPrivacy")}</a>
          <span>·</span>
          <a href="/terms" className="hover:text-foreground transition-colors">{t("landing.footTerms")}</a>
          <span>·</span>
          <a href="mailto:hello@granwatch.app" className="hover:text-foreground transition-colors">{t("landing.footContact")}</a>
        </div>
        <p>{t("landing.footMade")}</p>
      </footer>
    </div>
  );
}
