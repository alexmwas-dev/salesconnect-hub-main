import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { AppLayout, PageContainer } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { User, Building, Lock, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  BillingOverview,
  BillingPayment,
  PromotionValidationResult,
} from "@/types";

interface SettingsProps {
  billingOnly?: boolean;
}

export default function Settings({ billingOnly = false }: SettingsProps) {
  const { user, organization, updateProfile, changePassword, hasRole } =
    useAuth();
  const { refreshStats } = useOrganization();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileData, setProfileData] = useState({
    name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
    email: user?.email || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const initialTab = useMemo(() => {
    if (billingOnly) return "billing";
    if (typeof window === "undefined") return "profile";
    const tab = new URLSearchParams(window.location.search).get("tab");
    const validTabs = new Set([
      "profile",
      "organization",
      "security",
      "billing",
    ]);
    return tab && validTabs.has(tab) ? tab : "profile";
  }, [billingOnly]);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [billingOverview, setBillingOverview] =
    useState<BillingOverview | null>(null);
  const [selectedPlanCode, setSelectedPlanCode] = useState("STARTER");
  const [customerPhone, setCustomerPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promotionValidation, setPromotionValidation] =
    useState<PromotionValidationResult | null>(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [activePlanAction, setActivePlanAction] = useState<string | null>(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(
    null,
  );

  const isOwner = hasRole(["OWNER"]);
  const subscription = billingOverview?.subscription;
  const rawUsagePercentage =
    subscription && subscription.messageLimit > 0
      ? Math.min(100, (subscription.messagesUsed / subscription.messageLimit) * 100)
      : 0;
  const usagePercentage =
    rawUsagePercentage > 0 ? Math.max(rawUsagePercentage, 1) : 0;
  const currentPlanCode = (subscription?.plan || organization?.plan || "FREE")
    .toUpperCase()
    .trim();
  const selectedPlan =
    billingOverview?.plans?.find((plan) => plan.code === selectedPlanCode) ||
    null;
  const paymentStatusVariant: Record<
    string,
    "success" | "warning" | "destructive" | "default"
  > = {
    COMPLETED: "success",
    PENDING: "warning",
    FAILED: "destructive",
    CANCELED: "default",
  };

  const formatMoney = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: (currency || "USD").toUpperCase(),
      }).format(amount);
    } catch {
      return `${amount} ${currency || "USD"}`;
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      await updateProfile(profileData);
      toast({ title: "Profile updated" });
    } catch (error) {
      toast({ title: "Failed to update profile", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const loadBillingOverview = async () => {
    setIsBillingLoading(true);
    try {
      const data = await api.billing.getOverview();
      const normalized = data as BillingOverview;
      setBillingOverview(normalized);

      if (!selectedPlanCode && normalized?.plans?.length) {
        const firstPaidPlan =
          normalized.plans.find((plan) => plan.amount > 0)?.code || "STARTER";
        setSelectedPlanCode(firstPaidPlan);
      }
    } catch (error) {
      toast({
        title: "Failed to load billing data",
        variant: "destructive",
      });
    } finally {
      setIsBillingLoading(false);
    }
  };

  const clearPaymentQueryParams = () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.delete("paymentId");
    params.delete("paymentStatus");
    params.delete("paymentRef");
    if (billingOnly) {
      params.delete("tab");
    } else {
      params.set("tab", "billing");
    }
    const query = params.toString();
    const nextUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  };

  const handleVerifyPayment = async (
    paymentId: string,
    { silent }: { silent?: boolean } = {},
  ) => {
    if (!paymentId) return;

    setVerifyingPaymentId(paymentId);
    try {
      const response = await api.billing.verifyPayment(paymentId);
      const payment = (response as { payment?: BillingPayment })?.payment;
      const status = payment?.status || "PENDING";

      if (!silent) {
        toast({
          title:
            status === "COMPLETED"
              ? "Payment confirmed and subscription activated"
              : `Payment status: ${status}`,
          variant: status === "FAILED" ? "destructive" : "default",
        });
      }

      await Promise.all([loadBillingOverview(), refreshStats()]);
    } catch (error) {
      if (!silent) {
        toast({
          title: "Could not verify payment",
          variant: "destructive",
        });
      }
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handleStartCheckout = async () => {
    if (!selectedPlanCode) return;
    setActivePlanAction(selectedPlanCode);
    const trimmedPromoCode = promoCode.trim().toUpperCase();

    try {
      const response = await api.billing.createCheckout({
        planCode: selectedPlanCode,
        customerPhone: customerPhone || undefined,
        customerEmail: profileData.email || user?.email,
        promoCode: trimmedPromoCode || undefined,
      });

      const redirectUrl = (response as { redirectUrl?: string })?.redirectUrl;
      if (!redirectUrl) {
        await Promise.all([loadBillingOverview(), refreshStats()]);
        toast({
          title: "Subscription activated",
        });
        setActivePlanAction(null);
        return;
      }

      window.location.assign(redirectUrl);
    } catch (error) {
      toast({
        title: "Failed to start checkout",
        variant: "destructive",
      });
      setActivePlanAction(null);
    }
  };

  const handleValidatePromotion = async () => {
    if (!selectedPlanCode) return;

    const trimmedPromoCode = promoCode.trim().toUpperCase();
    if (!trimmedPromoCode) {
      setPromotionValidation(null);
      toast({
        title: "Enter a promotion code",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingPromo(true);
    try {
      const response = await api.billing.validatePromotion({
        planCode: selectedPlanCode,
        promoCode: trimmedPromoCode,
      });
      const result = response as PromotionValidationResult;

      if (!result.valid) {
        setPromotionValidation(null);
        toast({
          title: result.reason || "Invalid promotion code",
          variant: "destructive",
        });
        return;
      }

      setPromotionValidation(result);
      toast({
        title: `Promotion ${result.code || trimmedPromoCode} applied`,
      });
    } catch (error) {
      setPromotionValidation(null);
      toast({
        title: "Could not validate promotion code",
        variant: "destructive",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActivePlanAction("CANCEL");
    try {
      await api.billing.cancelSubscription();
      toast({ title: "Subscription canceled" });
      await Promise.all([loadBillingOverview(), refreshStats()]);
    } catch (error) {
      toast({
        title: "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setActivePlanAction(null);
    }
  };

  useEffect(() => {
    if (!isOwner || activeTab !== "billing") return;
    void loadBillingOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, activeTab]);

  useEffect(() => {
    if (!isOwner || activeTab !== "billing") return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("paymentId");
    if (!paymentId) return;

    const silent = params.get("paymentStatus") === "COMPLETED";
    void handleVerifyPayment(paymentId, { silent }).finally(
      clearPaymentQueryParams,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, activeTab]);

  useEffect(() => {
    setPromotionValidation(null);
  }, [selectedPlanCode]);

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    setIsUpdating(true);
    try {
      await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
        passwordData.confirmPassword,
      );
      toast({ title: "Password changed" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast({ title: "Failed to change password", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title={billingOnly ? "Billing" : "Settings"}
            description={
              billingOnly
                ? "Manage your subscription, plans, and payment history."
                : "Manage your account and organization settings."
            }
          />

          <Tabs
            value={billingOnly ? "billing" : activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            {!billingOnly && (
              <>
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="profile" className="gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </TabsTrigger>
                  {isOwner && (
                    <TabsTrigger value="organization" className="gap-2">
                      <Building className="h-4 w-4" />
                      Organization
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="security" className="gap-2">
                    <Lock className="h-4 w-4" />
                    Security
                  </TabsTrigger>
                  {isOwner && (
                    <TabsTrigger value="billing" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Billing
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update your personal details.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={user?.avatarUrl} />
                          <AvatarFallback className="text-lg">
                            {user?.firstName?.[0]}
                            {user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user?.email}
                          </p>
                          <StatusBadge variant="brand" className="mt-2">
                            {user?.role}
                          </StatusBadge>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4 max-w-lg">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full name</Label>
                          <Input
                            id="name"
                            value={profileData.name}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                name: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            value={profileData.email}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                email: e.target.value,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Email address must be unique.
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={handleUpdateProfile}
                        disabled={isUpdating}
                        className="bg-brand text-brand-foreground hover:bg-brand-hover"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Organization Tab */}
                {isOwner && (
                  <TabsContent value="organization">
                    <Card>
                      <CardHeader>
                        <CardTitle>Organization Details</CardTitle>
                        <CardDescription>
                          Manage your organization settings.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2 max-w-lg">
                          <Label>Organization Name</Label>
                          <Input
                            value={organization?.name}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="space-y-2 max-w-lg">
                          <Label>Plan</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={organization?.plan}
                              disabled
                              className="bg-muted"
                            />
                            <StatusBadge variant="success" dot>
                              {organization?.subscriptionStatus}
                            </StatusBadge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Contact support to change your organization name or
                          upgrade your plan.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* Security Tab */}
                <TabsContent value="security">
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>
                        Update your password to keep your account secure.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4 max-w-lg">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">
                            Current Password
                          </Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                              setPasswordData((p) => ({
                                ...p,
                                currentPassword: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData((p) => ({
                                ...p,
                                newPassword: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">
                            Confirm New Password
                          </Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData((p) => ({
                                ...p,
                                confirmPassword: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleChangePassword}
                        disabled={
                          isUpdating ||
                          !passwordData.currentPassword ||
                          !passwordData.newPassword
                        }
                        className="bg-brand text-brand-foreground hover:bg-brand-hover"
                      >
                        {isUpdating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Change Password"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}

            {billingOnly && !isOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Billing Access</CardTitle>
                  <CardDescription>
                    Billing is only available to organization owners.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Billing Tab */}
            {isOwner && (
              <TabsContent value="billing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing & Subscription</CardTitle>
                    <CardDescription>
                      Upgrade your plan, pay with PesaPal, and monitor payment
                      status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {(
                              subscription?.plan ||
                              organization?.plan ||
                              "FREE"
                            )
                              .toUpperCase()
                              .trim()}{" "}
                            Plan
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subscription?.messagesUsed ?? 0} /{" "}
                            {subscription?.messageLimit ?? 0} messages this
                            period
                          </p>
                        </div>
                        <StatusBadge
                          variant={
                            subscription?.status === "ACTIVE"
                              ? "success"
                              : subscription?.status === "PAST_DUE"
                                ? "warning"
                                : "default"
                          }
                          dot
                        >
                          {subscription?.status || "TRIAL"}
                        </StatusBadge>
                      </div>
                      <Progress value={usagePercentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Remaining messages:{" "}
                        {subscription?.remaining ??
                          billingOverview?.remainingMessages ??
                          0}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-2 w-full md:w-[280px]">
                        <Label htmlFor="billing-phone">
                          PesaPal phone (optional)
                        </Label>
                        <Input
                          id="billing-phone"
                          placeholder="+2547..."
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 w-full md:w-[220px]">
                        <Label htmlFor="promotion-code">
                          Promotion code (optional)
                        </Label>
                        <Input
                          id="promotion-code"
                          placeholder="SAVE20"
                          value={promoCode}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            const normalized = nextValue.trim().toUpperCase();
                            setPromoCode(nextValue);
                            if (
                              promotionValidation?.code &&
                              normalized !== promotionValidation.code
                            ) {
                              setPromotionValidation(null);
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => void handleValidatePromotion()}
                        disabled={!promoCode.trim() || isValidatingPromo}
                      >
                        {isValidatingPromo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Apply Code"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void loadBillingOverview()}
                        disabled={isBillingLoading}
                      >
                        {isBillingLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Refresh Billing"
                        )}
                      </Button>
                      {subscription?.status === "ACTIVE" &&
                        currentPlanCode !== "FREE" && (
                          <Button
                            variant="outline"
                            onClick={handleCancelSubscription}
                            disabled={activePlanAction === "CANCEL"}
                          >
                            {activePlanAction === "CANCEL" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Cancel Subscription"
                            )}
                          </Button>
                        )}
                    </div>

                    {promotionValidation?.valid ? (
                      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
                        <p className="text-sm font-medium text-emerald-900">
                          Promotion {promotionValidation.code} applied
                        </p>
                        <p className="text-xs text-emerald-900/80 mt-1">
                          Discount:{" "}
                          {formatMoney(
                            promotionValidation.pricing.discountAmount,
                            promotionValidation.pricing.currency,
                          )}{" "}
                          • Total today:{" "}
                          {formatMoney(
                            promotionValidation.pricing.finalAmount,
                            promotionValidation.pricing.currency,
                          )}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Choose a Plan</CardTitle>
                    <CardDescription>
                      Select a monthly plan and continue to PesaPal checkout.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isBillingLoading && !billingOverview ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading plans...
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {(billingOverview?.plans || []).map((plan) => {
                          const isCurrent = plan.code === currentPlanCode;
                          const isSelected = selectedPlanCode === plan.code;

                          return (
                            <button
                              key={plan.code}
                              type="button"
                              onClick={() => setSelectedPlanCode(plan.code)}
                              className={`rounded-lg border p-4 text-left transition ${
                                isSelected
                                  ? "border-brand bg-brand/5"
                                  : "border-border hover:border-brand/40"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold">{plan.name}</p>
                                {isCurrent ? (
                                  <StatusBadge variant="success" dot>
                                    Current
                                  </StatusBadge>
                                ) : null}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {plan.description}
                              </p>
                              <p className="text-sm mt-2">
                                {plan.messageLimit.toLocaleString()} messages /{" "}
                                {plan.periodDays} days
                              </p>
                              <p className="text-base font-semibold mt-2">
                                {plan.amount > 0
                                  ? formatMoney(plan.amount, plan.currency)
                                  : "Free"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedPlan ? (
                      <p className="text-sm text-muted-foreground">
                        Total today:{" "}
                        {formatMoney(
                          promotionValidation?.valid
                            ? promotionValidation.pricing.finalAmount
                            : selectedPlan.amount,
                          promotionValidation?.valid
                            ? promotionValidation.pricing.currency
                            : selectedPlan.currency,
                        )}
                      </p>
                    ) : null}

                    <Button
                      onClick={handleStartCheckout}
                      disabled={
                        !selectedPlanCode ||
                        selectedPlanCode === "FREE" ||
                        activePlanAction === selectedPlanCode
                      }
                      className="bg-brand text-brand-foreground hover:bg-brand-hover"
                    >
                      {activePlanAction === selectedPlanCode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Pay with PesaPal"
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>
                      Recent payment attempts and their latest status.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {!billingOverview?.payments?.length ? (
                      <p className="text-sm text-muted-foreground">
                        No payment records yet.
                      </p>
                    ) : (
                      billingOverview.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-lg border p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-1">
                            <p className="font-medium">
                              {payment.planCode} •{" "}
                              {formatMoney(payment.amount, payment.currency)}
                            </p>
                            {Number(payment.discountAmount || 0) > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Discount:{" "}
                                {formatMoney(
                                  Number(payment.discountAmount || 0),
                                  payment.currency,
                                )}
                                {payment.originalAmount
                                  ? ` (from ${formatMoney(payment.originalAmount, payment.currency)})`
                                  : ""}
                              </p>
                            ) : null}
                            {payment.promotionCode ? (
                              <p className="text-xs text-muted-foreground">
                                Promo: {payment.promotionCode}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              Ref: {payment.merchantReference}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              variant={
                                paymentStatusVariant[payment.status] ||
                                "default"
                              }
                              dot
                            >
                              {payment.status}
                            </StatusBadge>
                            {payment.status === "PENDING" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void handleVerifyPayment(payment.id)
                                }
                                disabled={verifyingPaymentId === payment.id}
                              >
                                {verifyingPaymentId === payment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Verify"
                                )}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
