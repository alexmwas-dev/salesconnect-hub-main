import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GOOGLE_GSI_SCRIPT = "https://accounts.google.com/gsi/client";

let googleScriptPromise: Promise<void> | null = null;

const loadGoogleScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in a browser"));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_GSI_SCRIPT}"]`,
    );

    const script = existingScript || document.createElement("script");

    const onLoad = () => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      googleScriptPromise = null;
      reject(new Error("Google sign-in failed to initialize"));
    };

    const onError = () => {
      googleScriptPromise = null;
      reject(new Error("Failed to load Google sign-in"));
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existingScript) {
      script.src = GOOGLE_GSI_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if ((existingScript as any).dataset.loaded === "true") {
      onLoad();
      return;
    }

    if (!existingScript) {
      script.addEventListener(
        "load",
        () => {
          (script as any).dataset.loaded = "true";
        },
        { once: true },
      );
    }
  });

  return googleScriptPromise;
};

type GoogleAuthMode = "signin" | "signup";

interface GoogleAuthButtonProps {
  mode: GoogleAuthMode;
  disabled?: boolean;
  onCredential: (credential: string) => void | Promise<void>;
  className?: string;
}

export function GoogleAuthButton({
  mode,
  disabled = false,
  onCredential,
  className,
}: GoogleAuthButtonProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const [scriptStatus, setScriptStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  onCredentialRef.current = onCredential;

  const buttonText = useMemo<GoogleIdButtonConfiguration["text"]>(
    () => (mode === "signup" ? "signup_with" : "signin_with"),
    [mode],
  );

  useEffect(() => {
    if (!clientId) return;

    let isMounted = true;
    setScriptStatus("loading");

    loadGoogleScript()
      .then(() => {
        if (!isMounted) return;
        if (!window.google?.accounts?.id || !buttonRef.current) {
          setScriptStatus("error");
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              void onCredentialRef.current(response.credential);
            }
          },
        });

        buttonRef.current.innerHTML = "";

        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: buttonText,
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.max(240, Math.min(buttonRef.current.clientWidth || 320, 360)),
        });

        setScriptStatus("ready");
      })
      .catch((error) => {
        console.error("Failed to initialize Google sign-in:", error);
        if (isMounted) setScriptStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [buttonText, clientId]);

  if (!clientId) {
    return (
      <div className={cn("space-y-2", className)}>
        <Button type="button" variant="outline" className="h-11 w-full" disabled>
          Continue with Google
        </Button>
        <p className="text-xs text-muted-foreground">
          Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
        </p>
      </div>
    );
  }

  if (scriptStatus === "error") {
    return (
      <div className={cn("space-y-2", className)}>
        <Button type="button" variant="outline" className="h-11 w-full" disabled>
          Google sign-in unavailable
        </Button>
        <p className="text-xs text-destructive">
          Could not load Google sign-in. Refresh and try again.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={buttonRef}
        className={cn(
          "min-h-11 w-full",
          disabled && "pointer-events-none opacity-60",
        )}
      />
      {scriptStatus !== "ready" && (
        <Button
          type="button"
          variant="outline"
          className="absolute inset-0 h-11 w-full"
          disabled
        >
          Loading Google...
        </Button>
      )}
    </div>
  );
}

