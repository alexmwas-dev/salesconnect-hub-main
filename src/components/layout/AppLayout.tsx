import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { cn } from "@/lib/utils";
import { WhatsAppSetupBanner } from "@/components/WhatsAppSetupBanner";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="pl-16 lg:pl-64 transition-all duration-300">
        <div className="min-h-screen">
          <div className="pt-6 px-6 lg:px-8">
            <WhatsAppSetupBanner />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto max-w-7xl p-6 lg:p-8", className)}>
      {children}
    </div>
  );
}
