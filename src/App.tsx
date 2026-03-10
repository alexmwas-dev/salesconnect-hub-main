import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Pages
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import Dashboard from "@/pages/Dashboard";
import Contacts from "@/pages/Contacts";
import Team from "@/pages/Team";
import WhatsAppNumbers from "@/pages/WhatsAppNumbers";
import Templates from "@/pages/Templates";
import Campaigns from "@/pages/Campaigns";
import Billing from "@/pages/Billing";
import Settings from "@/pages/Settings";
import ConnectWhatsApp from "@/pages/ConnectWhatsApp";
import NotFound from "@/pages/NotFound";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import DataDeletion from "@/pages/DataDeletion";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/data-deletion" element={<DataDeletion />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <PrivateRoute>
            <Contacts />
          </PrivateRoute>
        }
      />
      <Route
        path="/campaigns"
        element={
          <PrivateRoute>
            <Campaigns />
          </PrivateRoute>
        }
      />
      <Route
        path="/templates"
        element={
          <PrivateRoute>
            <Templates />
          </PrivateRoute>
        }
      />
      <Route
        path="/whatsapp-numbers"
        element={
          <PrivateRoute>
            <WhatsAppNumbers />
          </PrivateRoute>
        }
      />
      <Route
        path="/connect-whatsapp"
        element={
          <PrivateRoute>
            <ConnectWhatsApp />
          </PrivateRoute>
        }
      />
      <Route
        path="/team"
        element={
          <PrivateRoute>
            <Team />
          </PrivateRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <PrivateRoute>
            <Billing />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <>
    <Toaster />
    <Sonner />
    <AppRoutes />
  </>
);

export default App;
