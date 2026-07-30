import { P, font, fontDisplay } from "../theme";
import { PageShell, Section } from "./PageShell";

export function PrivacyPage({ onBack, nav }) {
  return (
    <PageShell title="Privacy Policy" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Privacy Policy</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, margin:"0 0 16px" }}>Last updated: June 2026</p>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>GroupGrid is built with privacy as a core design principle — not an afterthought. Here's exactly what we do and don't do with your data.</p>
      </div>
      <Section title="Data we collect">
        <strong>We never collect your guest data.</strong> GroupGrid processes all spreadsheet data entirely within your browser. Your guest names, emails, flight details, hotel records, and any other information in your uploaded files are never transmitted to our servers — we have no access to this data, ever. The limited personal data we do handle is: your account email address, for sign-in (via Supabase); the projects you choose to save, which are stored locally on your own device and not on our servers; and, if you join our early-access list, the email address you submit (via HubSpot, our email and CRM provider).
      </Section>
      <Section title="Saved projects & storage">
        Your saved projects — event names, notes, and resolved flags — are stored in your browser's local storage, on the device you are using. They are not uploaded to our servers and are not synced across devices or browsers: projects saved on one device will not appear on another, and clearing your browser storage will remove them. In all cases, your guest spreadsheet files are read and processed in your browser and are never uploaded to our servers. You can clear local data at any time by clearing your browser storage or using the app's built-in reset.
      </Section>
      <Section title="Cookies">
        GroupGrid does not use tracking cookies, advertising cookies, or any third-party analytics. We do not use Google Analytics, Meta Pixel, or similar tools.
      </Section>
      <Section title="Account data">
        To sign in, we collect your email address and a password, which are handled securely through Supabase, our third-party authentication and infrastructure provider. Passwords are stored in encrypted form by Supabase; we do not store them ourselves. Your saved projects are kept in your browser's local storage on your own device, not in your account. We never sell, rent, or share your personal information with third parties.
      </Section>
      <Section title="GDPR & CCPA">
        The personal data we hold is limited to your account email (via Supabase) and, if you have joined our early-access list, the email you submitted (via HubSpot). Your saved projects are stored locally on your own device, not on our servers. You have the right to access, export, and permanently delete your account-associated data upon request.
      </Section>
      <Section title="Third-party services">
        GroupGrid uses Supabase, a trusted third-party provider, for account authentication. Your saved projects are stored locally in your browser, not on Supabase. If you join our early-access list, the email address you submit is sent to HubSpot, our email and CRM provider, so we can contact you about early access; our signup form posts directly to HubSpot's API and does not load HubSpot's tracking script, so no HubSpot tracking cookie is set. Your guest spreadsheet files are never sent to Supabase, HubSpot, or any other service — they are processed only in your browser. External fonts (IBM Plex Sans and Poppins via Google Fonts) are loaded from Google's CDN, which is subject to Google's standard font API privacy policy. We use no advertising or analytics services.
      </Section>
      <Section title="Changes to this policy">
        We will notify users of any material changes to this policy via in-app notification and email. Continued use after notification constitutes acceptance of the updated policy.
      </Section>
      <Section title="Contact">
        Questions about privacy? Email us at <a href="mailto:privacy@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600 }}>privacy@groupgrid.io</a>.
      </Section>
    </PageShell>
  );
}
