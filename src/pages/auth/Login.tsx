import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageSquare, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [orgNameModalOpen, setOrgNameModalOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationNameError, setOrganizationNameError] = useState<
    string | null
  >(null);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<
    string | null
  >(null);
  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const closeOrganizationNameModal = () => {
    setOrgNameModalOpen(false);
    setOrganizationName('');
    setOrganizationNameError(null);
    setPendingGoogleCredential(null);
  };

  const isOrganizationNameRequiredError = (error: unknown) => {
    return (
      error instanceof Error &&
      error.message.toLowerCase().includes('organization name')
    );
  };

  const continueWithGoogle = async (
    credential: string,
    organizationNameInput?: string,
  ) => {
    setIsGoogleLoading(true);

    try {
      await googleAuth(credential, organizationNameInput);
      toast({
        title: 'Welcome back!',
        description: 'Signed in with Google successfully.',
      });
      closeOrganizationNameModal();
      navigate('/dashboard');
    } catch (error) {
      if (!organizationNameInput && isOrganizationNameRequiredError(error)) {
        setPendingGoogleCredential(credential);
        setOrganizationNameError(null);
        setOrgNameModalOpen(true);
        return;
      }

      toast({
        title: 'Google sign-in failed',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again or use email and password.',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async (credential: string) => {
    await continueWithGoogle(credential);
  };

  const handleOrganizationNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = organizationName.trim();
    if (!trimmedName) {
      setOrganizationNameError('Organization name is required.');
      return;
    }

    if (!pendingGoogleCredential) {
      toast({
        title: 'Google sign-in failed',
        description: 'Google session expired. Please try again.',
        variant: 'destructive',
      });
      closeOrganizationNameModal();
      return;
    }

    setOrganizationNameError(null);
    await continueWithGoogle(pendingGoogleCredential, trimmedName);
  };

  return (
    <>
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
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
              <p className="mt-2 text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            <div className="space-y-4">
              <GoogleAuthButton
                mode="signin"
                onCredential={handleGoogleAuth}
                disabled={isLoading || isGoogleLoading}
              />
              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-brand hover:text-brand-hover"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-brand hover:text-brand-hover">
                Create one
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
              Scale your WhatsApp sales outreach
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Manage your team, templates, and campaigns from one powerful dashboard.
              Reach more customers with less effort.
            </p>

            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-primary-foreground/90">Multi-user team management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-primary-foreground/90">WhatsApp Business API integration</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-primary-foreground/90">Campaign analytics & insights</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={orgNameModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeOrganizationNameModal();
            return;
          }
          setOrgNameModalOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set organization name</DialogTitle>
            <DialogDescription>
              Enter your organization name to complete Google sign-in.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOrganizationNameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                value={organizationName}
                onChange={(e) => {
                  setOrganizationName(e.target.value);
                  if (organizationNameError) {
                    setOrganizationNameError(null);
                  }
                }}
                placeholder="Acme Inc"
                autoFocus
                required
              />
              {organizationNameError ? (
                <p className="text-sm text-destructive">{organizationNameError}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeOrganizationNameModal}
                disabled={isGoogleLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isGoogleLoading}>
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Continue with Google'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
