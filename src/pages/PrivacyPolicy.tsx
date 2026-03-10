import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

const effectiveDate = "February 16, 2026";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              SalesConnect Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">
              Effective date: {effectiveDate}
            </p>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-7 text-foreground/90">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              1. Who We Are
            </h2>
            <p>
              SalesConnect is a WhatsApp campaign and outreach platform used by
              organizations to manage contacts, templates, team members, and
              message delivery through the Meta WhatsApp Business Platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              2. Information We Collect
            </h2>
            <p>We may collect and process the following data:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Account data: name, email address, password hash, role, and
                organization details.
              </li>
              <li>
                WhatsApp setup data: WhatsApp Business Account ID (WABA ID),
                phone number ID, display phone number, and related metadata.
              </li>
              <li>
                Messaging data: template names, template status, contact phone
                numbers, message content, delivery/read status, and timestamps.
              </li>
              <li>
                Operational data: logs, usage analytics, and API event data
                required for security, debugging, and reliability.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              3. How We Use Information
            </h2>
            <p>We use information to:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Provide and operate the SalesConnect service.</li>
              <li>
                Connect and manage WhatsApp Business integrations through Meta.
              </li>
              <li>Send and track approved WhatsApp template messages.</li>
              <li>
                Maintain platform security, prevent misuse, and troubleshoot
                issues.
              </li>
              <li>Comply with legal, regulatory, and contractual obligations.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              4. How We Share Information
            </h2>
            <p>We do not sell personal data. We share data only when needed:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                With Meta Platforms, Inc. to process WhatsApp Business API
                requests (for example template approval and message delivery).
              </li>
              <li>
                With service providers that support hosting, infrastructure,
                logging, and communications under confidentiality obligations.
              </li>
              <li>
                When required by law, regulation, legal process, or to protect
                rights, safety, and platform integrity.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              5. Data Retention
            </h2>
            <p>
              We retain data for as long as needed to provide services, satisfy
              legal obligations, resolve disputes, enforce agreements, and keep
              required audit or security records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              6. Data Security
            </h2>
            <p>
              We implement reasonable technical and organizational safeguards to
              protect data against unauthorized access, disclosure, alteration,
              or destruction. No method of transmission or storage is
              guaranteed to be 100% secure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              7. User Rights and Data Deletion
            </h2>
            <p>
              Users can request access, correction, or deletion of personal
              data by contacting us. Data deletion instructions are also
              available at{" "}
              <Link to="/data-deletion" className="text-brand hover:underline">
                /data-deletion
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              8. Children’s Privacy
            </h2>
            <p>
              SalesConnect is not intended for children under 13 (or the
              minimum age required in your jurisdiction). We do not knowingly
              collect personal data from children.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              9. International Transfers
            </h2>
            <p>
              Your information may be processed in countries other than your
              own, where data protection laws may differ from those in your
              jurisdiction.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Material
              updates will be reflected by updating the effective date above.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              11. Contact Us
            </h2>
            <p>
              For privacy inquiries or data requests, contact:
              <br />
              <span className="font-medium">privacy@salesconnect.app</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
