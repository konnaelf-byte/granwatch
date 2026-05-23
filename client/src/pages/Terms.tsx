import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Terms() {
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
          <span className="font-bold text-foreground">Terms of Service</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-10 prose prose-sm text-foreground">
        <p className="text-xs text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">
          Please read these terms carefully before using GranWatch. By creating an account or using the app, you agree to be bound by these terms.
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">1. About GranWatch</h2>
          <p className="text-muted-foreground">GranWatch is a family visit-coordination service that helps families keep track of visits to elderly relatives. GranWatch is operated by Konstand ("we", "us", or "our").</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">2. Eligibility</h2>
          <p className="text-muted-foreground">You must be at least 13 years old to use GranWatch. By using the service, you confirm that you meet this requirement. If you are under 18, you should use GranWatch only with parental consent.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">3. Your Account</h2>
          <p className="text-muted-foreground mb-2">You are responsible for maintaining the security of your account and for all activity that occurs under it. You agree to:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>Provide accurate information when creating your account</li>
            <li>Keep your login credentials secure</li>
            <li>Notify us immediately of any unauthorised access</li>
            <li>Not share your account with others</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">4. Acceptable Use</h2>
          <p className="text-muted-foreground mb-2">You agree not to:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>Use GranWatch for any unlawful purpose</li>
            <li>Upload content that is abusive, threatening, or violates others' rights</li>
            <li>Attempt to reverse-engineer or interfere with the service</li>
            <li>Create multiple accounts to circumvent limitations</li>
            <li>Use the service to harass or harm other family members</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">5. Gran Profiles and Family Data</h2>
          <p className="text-muted-foreground mb-2">The person who creates a gran profile ("admin") is responsible for:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ensuring that the elderly person consents to their information being stored</li>
            <li>Managing family member access appropriately</li>
            <li>The accuracy of information entered into the profile</li>
          </ul>
          <p className="text-muted-foreground mt-3">GranWatch is a coordination tool, not a medical or emergency service. Do not rely on GranWatch as a substitute for emergency services or professional care.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">6. Subscriptions and Payment</h2>
          <p className="text-muted-foreground mb-2">GranWatch offers a free tier and a paid subscription ("Gran+"). For Gran+:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>Subscriptions are billed monthly and renew automatically</li>
            <li>You may cancel at any time; access continues until the end of the billing period</li>
            <li>Payments are processed by Lemon Squeezy; their terms and policies apply to payment processing</li>
            <li>Prices may vary by region and are subject to change with 30 days notice</li>
            <li>Refunds are handled at our discretion; contact us within 7 days of a charge if you believe there is an error</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">7. User Content</h2>
          <p className="text-muted-foreground mb-2">You retain ownership of content you upload (photos, notes). By uploading content, you grant us a non-exclusive, worldwide licence to store and display that content solely for the purpose of providing the service.</p>
          <p className="text-muted-foreground">You confirm that you have the right to upload any content you add to GranWatch, and that doing so does not violate any third party's rights.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">8. Service Availability</h2>
          <p className="text-muted-foreground">We aim for high availability but cannot guarantee uninterrupted service. We may perform maintenance, updates, or be subject to technical issues. We are not liable for any loss resulting from service unavailability.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">9. Limitation of Liability</h2>
          <p className="text-muted-foreground">To the maximum extent permitted by law, GranWatch is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service. Our total liability is limited to the amount you paid us in the 12 months preceding any claim.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">10. Account Deletion</h2>
          <p className="text-muted-foreground">You may delete your account at any time from the Account settings page. Deleting your account will permanently remove your personal data. Gran profiles you administer will be deleted unless you transfer admin rights to another member first. Active subscriptions should be cancelled before deleting your account.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">11. Termination</h2>
          <p className="text-muted-foreground">We reserve the right to suspend or terminate accounts that violate these terms, without prior notice in serious cases. If we terminate your account without cause, we will provide a pro-rata refund of any prepaid subscription.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">12. Changes to These Terms</h2>
          <p className="text-muted-foreground">We may update these terms. We will notify you of material changes by email at least 14 days in advance. Continued use of GranWatch after that date constitutes acceptance of the updated terms.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">13. Governing Law</h2>
          <p className="text-muted-foreground">These terms are governed by the laws of South Africa. Any disputes will be resolved in South African courts, unless consumer protection laws in your jurisdiction provide otherwise.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">14. Contact</h2>
          <p className="text-muted-foreground">
            Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>
          </p>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t">
        © 2026 GranWatch — made with love, for every gran.
      </footer>
    </div>
  );
}
