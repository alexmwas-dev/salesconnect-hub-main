import React, { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export function WhatsAppSetupBanner() {
  const { whatsappNumbers, refreshWhatsAppNumbers } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate?.() as any;

  const orgConnected =
    whatsappNumbers.length > 0 ||
    whatsappNumbers.some((n) => n.wabaConnected) ||
    false;

  if (orgConnected) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Connect WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            To start sending messages you need to connect a WhatsApp Business
            Account, subscribe it to our webhook and add a phone number.
          </p>
        </div>
        <div>
          <Button
            onClick={() => {
              try {
                if (navigate) navigate("/connect-whatsapp");
              } catch (err) {
                // fallback: open new tab or instruct user
                window.location.href = "/connect-whatsapp";
              }
            }}
            className="bg-brand text-white"
          >
            Connect WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
