import { P, font, fontDisplay } from "../theme";
import { PageShell, Section } from "./PageShell";

export function TermsPage({ onBack, nav }) {
  return (
    <PageShell title="Terms of Service" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Terms of Service</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, margin:"0 0 16px" }}>Last updated: February 2026</p>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>By using GroupGrid, you agree to these terms. Please read them carefully.</p>
      </div>
      <Section title="1. Acceptance of Terms">
        By accessing or using GroupGrid ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. We reserve the right to update these terms at any time with notice provided via the Service.
      </Section>
      <Section title="2. Description of Service">
        GroupGrid is a browser-based event logistics tool that cross-references guest travel data (flight manifests, hotel rosters, car transfers, and dietary records) to identify discrepancies. All data processing occurs locally in your browser. No guest data is transmitted to or stored on GroupGrid servers.
      </Section>
      <Section title="3. Acceptable Use">
        You may use GroupGrid only for lawful purposes and in accordance with these Terms. You agree not to: (a) use the Service to process data you do not have authorization to access; (b) attempt to reverse-engineer or compromise the Service; (c) use the Service in any manner that violates applicable laws or regulations, including data protection laws.
      </Section>
      <Section title="4. Your Data & Privacy">
        We do not have access to your guest data. You are solely responsible for ensuring you have appropriate authorization to process any personal data you upload into the Service, and for complying with applicable data protection regulations including GDPR and CCPA. See our Privacy Policy for details on how data is handled.
      </Section>
      <Section title="5. Intellectual Property">
        GroupGrid and its original content, features, and functionality are owned by GroupGrid and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works of the Service without our prior written consent.
      </Section>
      <Section title="6. Disclaimers">
        THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. GROUPGRID DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. YOU USE THE SERVICE AT YOUR OWN RISK.
      </Section>
      <Section title="7. Limitation of Liability">
        TO THE FULLEST EXTENT PERMITTED BY LAW, GROUPGRID SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF GROUPGRID HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
      </Section>
      <Section title="8. Indemnification">
        You agree to defend, indemnify, and hold harmless GroupGrid from any claims, damages, obligations, losses, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.
      </Section>
      <Section title="9. Termination">
        We reserve the right to terminate or suspend access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, third parties, or for any other reason.
      </Section>
      <Section title="10. Governing Law">
        These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the courts of Delaware.
      </Section>
      <Section title="11. Contact">
        Questions about these Terms, billing, or pricing? Email us at <a href="mailto:billing@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600 }}>billing@groupgrid.io</a>.
      </Section>
    </PageShell>
  );
}
