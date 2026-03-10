import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
    organizationSlug: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signup, googleAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-generate slug from organization name
      if (name === "organizationName") {
        updated.organizationSlug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      return updated;
    });
  };

  const handleGoogleAuth = async (credential: string) => {
    const organizationName = formData.organizationName.trim();
    if (!organizationName) {
      toast({
        title: "Organization name required",
        description: "Enter your organization name, then continue with Google.",
        variant: "destructive",
      });
      return;
    }

    setIsGoogleLoading(true);

    try {
      await googleAuth(credential, organizationName);
      toast({
        title: "Welcome to SalesConnect!",
        description: "Your account was created with Google successfully.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Google sign-up failed",
        description:
          error instanceof Error
            ? error.message
            : "Please try again or sign up with email and password.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signup(formData);
      toast({
        title: "Welcome to SalesConnect!",
        description: "Your organization has been created successfully.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Signup failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">SalesConnect</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your account
            </h1>
            <p className="mt-2 text-muted-foreground">
              Start with our Free Plan — send up to 100 messages per user.
            </p>
          </div>

          <div className="space-y-4">
            <GoogleAuthButton
              mode="signup"
              onCredential={handleGoogleAuth}
              disabled={isLoading || isGoogleLoading}
            />
            <p className="text-xs text-muted-foreground">
              Enter organization name below before using Google sign-up.
            </p>
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or sign up with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Jane Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                placeholder="Acme Corporation"
                value={formData.organizationName}
                onChange={handleChange}
                required
                className="h-11"
              />
              {formData.organizationSlug && (
                <p className="text-xs text-muted-foreground">
                  Slug: {formData.organizationSlug}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand-hover"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-brand hover:text-brand-hover"
            >
              Sign in
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            |{" "}
            <Link to="/data-deletion" className="hover:text-foreground">
              Data Deletion
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Branding */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center gradient-hero p-12">
        <div className="mx-auto max-w-md text-primary-foreground">
          <h2 className="text-3xl font-semibold tracking-tight">
            Join 2,000+ sales teams
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Companies of all sizes use SalesConnect to automate their WhatsApp
            outreach and close more deals.
          </p>

          <div className="mt-12 rounded-xl bg-primary-foreground/10 p-6 backdrop-blur">
            <p className="text-primary-foreground/90 italic">
              "SalesConnect transformed our sales process. We've increased our
              response rate by 3x since switching from email to WhatsApp
              outreach."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <img
                src="/avatars/sarah.jpg"
                alt="Sarah Chen"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-primary-foreground/20"
              />
              <div>
                <p className="font-medium">Sarah Chen</p>
                <p className="text-sm text-primary-foreground/70">
                  VP of Sales, TechCorp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
