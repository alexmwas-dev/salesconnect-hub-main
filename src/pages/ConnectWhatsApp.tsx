import React, { useCallback, useEffect, useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { AppLayout, PageContainer } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const WHATSAPP_EMBEDDED_SIGNUP_URL =
  import.meta.env.VITE_META_BUSINESS_PARTNER_LINK;

const META_SIGNUP_ORIGINS = new Set([
  "https://www.facebook.com",
  "https://web.facebook.com",
  "https://business.facebook.com",
]);
export default function ConnectWhatsApp() {
  const { toast } = useToast();
  const { refreshWhatsAppNumbers } = useOrganization();

  const [popup, setPopup] = useState<Window | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingConnection, setLoadingConnection] = useState(true);

  const [accountData, setAccountData] = useState({
    businessId: "",
    wabaId: "",
    numbers: [] as any[],
    status: "",
  });

  /*
  =============================
  LOAD EXISTING CONNECTION
  =============================
  */

  const loadExistingConnection = useCallback(async () => {
    console.log("Loading existing WhatsApp connection...");

    try {
      const result = await api.organization.getWhatsAppConnection();

      console.log("Existing connection result:", result);

      if (!result?.organization?.whatsappBusinessAccountId) {
        console.log("No existing WhatsApp connection");
        setConnected(false);
        return;
      }

      setConnected(true);

      setAccountData({
        businessId: result.organization.businessId || "",
        wabaId: result.organization.whatsappBusinessAccountId,
        numbers: result.numbers || [],
        status: result.organization.whatsappStatus || "CONNECTED",
      });

      console.log("WhatsApp already connected:", result.organization.whatsappBusinessAccountId);

    } catch (err) {
      console.error("Error loading WhatsApp connection:", err);
      setConnected(false);
    } finally {
      setLoadingConnection(false);
    }
  }, []);

  useEffect(() => {
    loadExistingConnection();
  }, [loadExistingConnection]);

  /*
  =============================
  START  SIGNUP
  =============================
  */

  const startOnboarding = () => {
    console.log("Starting WhatsApp Embedded Signup");

    if (!WHATSAPP_EMBEDDED_SIGNUP_URL) {
      console.error("Missing signup URL");

      toast({
        title: "Missing Meta signup link",
        description:
          "Set VITE_META_BUSINESS_PARTNER_LINK in your frontend .env",
        variant: "destructive",
      });
      return;
    }

    const width = 600;
    const height = 700;

    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    console.log("Opening popup with URL:", WHATSAPP_EMBEDDED_SIGNUP_URL);

    const newPopup = window.open(
      WHATSAPP_EMBEDDED_SIGNUP_URL,
      "WhatsAppSignup",
      `width=${width},height=${height},top=${top},left=${left}`,
    );

    if (!newPopup) {
      console.error("Popup blocked");

      toast({
        title: "Popup blocked",
        description: "Allow popups and try again.",
        variant: "destructive",
      });
      return;
    }

    console.log("Popup opened successfully");

    setPopup(newPopup);
    setLoading(true);
  };

  /*
  =============================
  LISTEN FOR SUCCESSFULL SIGNUP
  =============================
  */

  useEffect(() => {

    console.log("WhatsApp Embedded Signup listener initialized");

    const handleMessage = async (event: MessageEvent) => {

      console.log("Message received from:", event.origin);
      console.log("Raw event data:", event.data);

      if (!META_SIGNUP_ORIGINS.has(event.origin)) {
        console.warn("Ignored message from unknown origin:", event.origin);
        return;
      }

      let data = event.data;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
          console.log("Parsed string message:", data);
        } catch (err) {
          console.warn("Could not parse message JSON");
          return;
        }
      }

      if (!data || data.type !== "WA_EMBEDDED_SIGNUP") {
        console.log("Not a WhatsApp signup message:", data);
        return;
      }

      console.log("Signup event received:", data.event);

      if (String(data.event).toUpperCase() !== "FINISH") {
        console.log("Signup not finished:", data.event);
        return;
      }

      const payload = data.data || {};

      console.log("Signup payload:", payload);

      const wabaId = payload.waba_id;
      const phoneNumberId = payload.phone_number_id;

      const code =
        payload.authorization_code ||
        payload.code ||
        payload.auth_code;

      console.log("Extracted values:", {
        code,
        wabaId,
        phoneNumberId
      });

      if (!wabaId || !code) {

        console.error("Missing WABA ID or authorization code");

        toast({
          title: "Signup failed",
          description: "Missing authorization code from Meta",
          variant: "destructive",
        });

        setLoading(false);
        return;
      }

      try {

        console.log("Sending signup data to backend...");

        const result = await api.organization.connectWhatsAppBusiness({
          code,
          wabaId,
          phoneNumberId,
        });

        console.log("Backend response:", result);

        if (popup && !popup.closed) {
          console.log("Closing popup");
          popup.close();
        }

        await refreshWhatsAppNumbers().catch((err) => {
          console.warn("Failed refreshing numbers:", err);
        });

        setConnected(true);

        setAccountData({
          businessId: result.organization?.businessId || "",
          wabaId: result.organization?.whatsappBusinessAccountId || "",
          numbers: result.numbers || [],
          status: result.organization?.whatsappStatus || "CONNECTED",
        });

        toast({
          title: "WhatsApp connected successfully",
        });

      } catch (err: any) {

        console.error("Backend connection error:", err);

        toast({
          title: "Connection failed",
          description: err?.message || "Unknown error",
          variant: "destructive",
        });

      } finally {
        setLoading(false);
      }

    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };

  }, [popup, refreshWhatsAppNumbers, toast]);
}

  if (loadingConnection) {
    return (
      <AppLayout>
        <PageContainer>
          <p>Loading WhatsApp connection...</p>
        </PageContainer>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageContainer>

        {!connected && (
          <div className="space-y-6">

            <h1 className="text-2xl font-semibold">
              Connect WhatsApp
            </h1>

            <Button
              onClick={startOnboarding}
              disabled={loading}
              className="bg-green-600 text-white"
            >
              {loading ? "Opening..." : "Start Onboarding"}
            </Button>

          </div>
        )}

        {connected && (
          <div className="space-y-6">

            <h1 className="text-2xl font-semibold">
              WhatsApp Connected
            </h1>

            <div className="border rounded p-4 space-y-2">

              <p>
                <b>Business ID:</b> {accountData.businessId}
              </p>

              <p>
                <b>WABA ID:</b> {accountData.wabaId}
              </p>

              <p>
                <b>Status:</b> {accountData.status}
              </p>

            </div>

            <div className="border rounded p-4 space-y-3">

              <h3>Phone Numbers</h3>

              {accountData.numbers.map((num: any) => (
                <div
                  key={num.id}
                  className="border rounded p-3 flex justify-between"
                >
                  <div>
                    <p>{num.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {num.phoneNumber}
                    </p>
                  </div>

                  {num.isPrimary && (
                    <span className="text-xs bg-green-100 px-2 py-1 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))}

            </div>

          </div>
        )}

      </PageContainer>
    </AppLayout>
  );
