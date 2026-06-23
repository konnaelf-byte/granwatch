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
        <p className="text-muted-foreground mb-4">
          Please read these terms carefully before using GranWatch. By creating an account or using the app, you agree to be bound by these terms.
        </p>

        <div className="border border-border rounded-lg bg-muted/50 p-4 mb-8">
          <p className="text-sm text-foreground font-semibold mb-1">Important health notice</p>
          <p className="text-sm text-muted-foreground">
            GranWatch is an organisational and reminder aid only. It is not a medical device and does not provide medical advice. Never rely on the app for medication dosing or timing, or for any health decision — always confirm with a licensed healthcare professional. See sections 6 and 7 below.
          </p>
        </div>

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
          <h2 className="text-lg font-bold mb-3">6. Not Medical Advice; Not a Medical Device</h2>
          <p className="text-muted-foreground mb-2">
            <strong>GranWatch is an organisational and reminder aid only.</strong> It is not a medical device, and it is not intended to diagnose, treat, cure, prevent, or monitor any disease or health condition. GranWatch does not provide medical, nursing, pharmaceutical, or any other professional healthcare advice, and nothing in the app should be interpreted as such.
          </p>
          <p className="text-muted-foreground mb-2">
            Features that let you record medications, dosages, routines, or appointments (including the paid "Gran+" features) exist solely to help families stay organised. They are <strong>not</strong> a clinical record, a medication-management system, or a substitute for one.
          </p>
          <p className="text-muted-foreground mb-2">You must <strong>not</strong> rely on GranWatch:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>To decide what medication to take, or how much, or when to take it</li>
            <li>To determine medication timing, frequency, or whether a dose has been taken or missed</li>
            <li>As your only or primary record of medication intake or health history</li>
            <li>To make any health, treatment, or care decision of any kind</li>
            <li>In any emergency — always call your local emergency services</li>
          </ul>
          <p className="text-muted-foreground mt-3">
            <strong>Always confirm medications, dosages, timing, and any health-related matter with a licensed healthcare professional</strong> (such as a doctor, pharmacist, or nurse) and with the medication's own labelling and instructions. If information in GranWatch conflicts with professional advice or product labelling, follow the professional advice and labelling — never the app.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">7. Accuracy of Information and User Entries</h2>
          <p className="text-muted-foreground mb-2">
            All information in GranWatch — including medications, dosages, routines, appointments, visit logs, and notes — is entered and maintained by you and other family members. We do not create, verify, validate, or check this information for accuracy, completeness, or timeliness.
          </p>
          <p className="text-muted-foreground">
            To the maximum extent permitted by law, we are not responsible or liable for any information that is inaccurate, incomplete, outdated, duplicated, delayed, or entered in error by you or by any other user or family member, or for any reliance placed on such information or any decision or action (or failure to act) based on it. You are solely responsible for verifying any information before relying on it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">8. Subscriptions and Payment</h2>
          <p className="text-muted-foreground mb-2">GranWatch offers a free tier and a paid subscription ("Gran+"). For Gran+:</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>Subscriptions are billed monthly and renew automatically</li>
            <li>You may cancel at any time; access continues until the end of the billing period</li>
            <li>Payments are processed by Lemon Squeezy (via granwatch.app); their terms and policies apply to payment processing</li>
            <li>Prices may vary by region and are subject to change with 30 days notice</li>
            <li>Refunds are handled at our discretion; contact us within 7 days of a charge if you believe there is an error</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">9. User Content</h2>
          <p className="text-muted-foreground mb-2">You retain ownership of content you upload (photos, notes). By uploading content, you grant us a non-exclusive, worldwide licence to store and display that content solely for the purpose of providing the service.</p>
          <p className="text-muted-foreground">You confirm that you have the right to upload any content you add to GranWatch, and that doing so does not violate any third party's rights.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">10. Service Availability, Data Loss, and Malfunction</h2>
          <p className="text-muted-foreground mb-2">We aim for high availability but cannot guarantee uninterrupted, timely, secure, or error-free service. The app may experience maintenance, updates, downtime, outages, bugs, errors, delays, failed or delayed notifications and reminders, or other technical issues, and data may be lost, corrupted, or become temporarily or permanently unavailable.</p>
          <p className="text-muted-foreground">To the maximum extent permitted by law, we are not liable for any loss or damage of any kind arising from or relating to service unavailability, downtime, bugs, defects, malfunction, errors, missed, failed, or delayed reminders or notifications, or any loss, corruption, or unavailability of data. You are responsible for keeping your own independent records of any important health or care information and should not treat GranWatch as your sole record.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">11. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">To the maximum extent permitted by law, GranWatch is provided on an <strong>"as is"</strong> and <strong>"as available"</strong> basis, without warranties or representations of any kind, whether express, implied, or statutory, including without limitation any implied warranties of merchantability, fitness for a particular purpose, accuracy, reliability, availability, or non-infringement. We do not warrant that the app will be uninterrupted, error-free, secure, or free of harmful components, or that any information in it is accurate, complete, or current. Some jurisdictions do not allow the exclusion of certain warranties, so some of these exclusions may not apply to you.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">12. Limitation of Liability</h2>
          <p className="text-muted-foreground mb-2">To the maximum extent permitted by law, in no event will GranWatch, Konstand, or our officers, employees, agents, or suppliers be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of data, loss of profits, personal injury, illness, harm, or any health-related loss or damage, arising out of or relating to your use of (or inability to use) the service, your reliance on any information in it, or any act or omission of any user or family member — whether based in contract, negligence, strict liability, or any other legal theory, and even if we have been advised of the possibility of such damages.</p>
          <p className="text-muted-foreground">To the maximum extent permitted by law, our total aggregate liability for all claims arising out of or relating to the service is limited to the greater of (a) the total amount you paid us in the 12 months preceding the event giving rise to the claim, or (b) USD 100. Some jurisdictions do not allow certain limitations of liability, and nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">13. Indemnification</h2>
          <p className="text-muted-foreground">You agree to indemnify, defend, and hold harmless GranWatch, Konstand, and our officers, employees, agents, and suppliers from and against any and all claims, demands, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or relating to: (a) your use or misuse of the service; (b) information you or members of your family enter, including any inaccurate, incomplete, or delayed entries; (c) any health, medication, or care decision made in reliance on the app; (d) your violation of these terms or of any law; or (e) your violation of the rights of any other person, including any elderly person whose information you store. This obligation survives termination of your account and these terms.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">14. Account Deletion</h2>
          <p className="text-muted-foreground">You may delete your account at any time from the Account settings page. Deleting your account will permanently remove your personal data. Gran profiles you administer will be deleted unless you transfer admin rights to another member first. Active subscriptions should be cancelled before deleting your account.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">15. Termination</h2>
          <p className="text-muted-foreground">We reserve the right to suspend or terminate accounts that violate these terms, without prior notice in serious cases. If we terminate your account without cause, we will provide a pro-rata refund of any prepaid subscription.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">16. Changes to These Terms</h2>
          <p className="text-muted-foreground">We may update these terms. We will notify you of material changes by email at least 14 days in advance. Continued use of GranWatch after that date constitutes acceptance of the updated terms.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">17. Governing Law</h2>
          <p className="text-muted-foreground">These terms are governed by the laws of South Africa. Any disputes will be resolved in South African courts, unless consumer protection laws in your jurisdiction provide otherwise.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">18. Contact</h2>
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
