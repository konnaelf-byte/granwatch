import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Privacy() {
  const [, navigate] = useLocation();
  const LAST_UPDATED = "23 May 2026";
  const CONTACT_EMAIL = "hello@granwatch.app";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 px-5 py-4 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary fill-primary" />
          <span className="font-bold text-foreground">Privacy Policy</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-10 prose prose-sm text-foreground">
        <p className="text-xs text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          GranWatch ("we", "our", or "us") is committed to protecting the privacy of our users. This
          policy explains what information we collect, how we use it, and your rights.
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">1. Information We Collect</h2>
          <p className="text-muted-foreground mb-2"><strong>Account information</strong> — When you sign in we collect your name, email address, and a unique user identifier provided by our authentication provider (Clerk).</p>
          <p className="text-muted-foreground mb-2"><strong>Gran profile data</strong> — Name, photo, birthday (optional), visit threshold, and care notes you choose to enter.</p>
          <p className="text-muted-foreground mb-2"><strong>Visit records</strong> — Timestamps, optional notes, and optional photos from logged visits.</p>
          <p className="text-muted-foreground mb-2"><strong>Payment information</strong> — On the web, subscription payments are processed by Lemon Squeezy. In the iOS and Android apps, subscriptions are processed through the App Store / Google Play and managed via RevenueCat. We never see or store your card details; we only store your subscription status and the related subscription/customer identifiers.</p>
          <p className="text-muted-foreground mb-2"><strong>Care information</strong> — Medications, dosages, schedules, care routines, appointments, mood notes, and wellbeing notes you choose to enter. This is organisational data you provide; it is not health data collected from a device or from Apple HealthKit.</p>
          <p className="text-muted-foreground mb-2"><strong>Device push token</strong> — If you enable notifications, we collect a unique push token from your device, used solely to deliver reminder and birthday notifications.</p>
          <p className="text-muted-foreground mb-2"><strong>Analytics</strong> — We do not use any third-party analytics, advertising, or tracking tools, and we do not track you across other apps or websites.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">2. How We Use Your Information</h2>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>To provide and improve the GranWatch service</li>
            <li>To send visit reminder emails when configured to do so</li>
            <li>To send birthday reminder notifications</li>
            <li>To process and manage your subscription</li>
            <li>To respond to support requests</li>
          </ul>
          <p className="text-muted-foreground mt-3">We do not sell your personal information to third parties. We do not use your data for advertising.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">3. Data Storage and Security</h2>
          <p className="text-muted-foreground mb-2">Your data is stored on Railway (cloud infrastructure in the United States). Photos are stored on Cloudflare R2. We use industry-standard encryption in transit (TLS) and at rest.</p>
          <p className="text-muted-foreground">We retain your data for as long as your account is active. When you delete your account, all associated data is permanently deleted within 30 days.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">4. Sharing of Information</h2>
          <p className="text-muted-foreground mb-2">We share information with the following third-party service providers, only to the extent necessary:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Clerk</strong> — authentication and user management (name, email, user ID)</li>
            <li><strong>RevenueCat</strong> — in-app purchase processing and subscription management in the native apps (keyed to your user ID)</li>
            <li><strong>Lemon Squeezy</strong> — web subscription payment processing</li>
            <li><strong>Firebase Cloud Messaging (Google)</strong> — push notification delivery (device push token)</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Cloudflare R2</strong> — photo storage</li>
            <li><strong>Railway</strong> — cloud hosting and database</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">5. Family Member Privacy</h2>
          <p className="text-muted-foreground">Family members who join a gran profile via invite link can see that profile's visit history and scheduled visits. They cannot see other family members' email addresses. Profile admins can see member names.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">6. Children's Privacy</h2>
          <p className="text-muted-foreground">GranWatch is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">7. Your Rights</h2>
          <p className="text-muted-foreground mb-2">Depending on your location, you may have the right to:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and all associated data</li>
            <li>Object to or restrict processing of your data</li>
            <li>Data portability (receive your data in a machine-readable format)</li>
          </ul>
          <p className="text-muted-foreground mt-3">To exercise any of these rights, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a> or use the Delete Account option in the app.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">8. Cookies</h2>
          <p className="text-muted-foreground">GranWatch uses a single session cookie to keep you signed in. We do not use advertising cookies, analytics cookies, or third-party tracking cookies.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">9. Changes to This Policy</h2>
          <p className="text-muted-foreground">We may update this policy from time to time. We will notify you of significant changes by email or in-app notification. Continued use of GranWatch after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">10. Contact</h2>
          <p className="text-muted-foreground">
            Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>
          </p>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t">
        © 2026 GranWatch — made with love, for every gran.
      </footer>
    </div>
  );
}
