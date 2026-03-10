import { MessageSquare } from "lucide-react";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              SalesConnect Data Deletion Instructions
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: February 16, 2026
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-7 text-foreground/90">
          <p>
            If you want your personal data deleted from SalesConnect, send a
            request to <span className="font-medium">privacy@salesconnect.app</span>{" "}
            with the subject line <span className="font-medium">Data Deletion Request</span>.
          </p>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Include the following details
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Your full name</li>
              <li>Your account email address</li>
              <li>Your organization name (if applicable)</li>
              <li>
                The phone number(s) or WhatsApp account details related to your
                request
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">
              What happens next
            </h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>We verify your identity and request ownership.</li>
              <li>We process deletion or anonymization where applicable.</li>
              <li>We confirm completion by email.</li>
            </ul>
          </div>

          <p>
            Some records may be retained when legally required (for example,
            security, fraud prevention, billing, or regulatory compliance).
          </p>
        </div>
      </div>
    </div>
  );
}
