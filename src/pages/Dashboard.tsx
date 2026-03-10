import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { AppLayout, PageContainer } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCardsSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Users,
  Send,
  MessageSquare,
  Phone,
  FileText,
  Clock,
  Activity,
  BarChart3,
} from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

export default function Dashboard() {
  const { user, organization } = useAuth();
  const {
    stats,
    activity,
    isLoading,
    campaigns,
    campaignStats,
    contacts,
    templates,
    whatsappNumbers,
    subscription,
  } = useOrganization();

  const subscriptionStatusVariant = {
    TRIAL: "warning",
    ACTIVE: "success",
    PAST_DUE: "destructive",
    CANCELLED: "destructive",
  } as const;

  const messageLimit =
    subscription?.messageLimit ?? organization?.messageLimit ?? 0;
  const subscriptionMessagesUsed =
    subscription?.messagesUsed ?? organization?.messagesUsed ?? 0;

  const preferNonZero = (
    primary: number | null | undefined,
    fallback: number,
  ) => (typeof primary === "number" && primary > 0 ? primary : fallback);

  const activeCampaignCount = campaigns.filter((campaign) =>
    ["QUEUED", "SENDING", "PAUSED"].includes(campaign.status),
  ).length;
  const draftCampaignCount = campaigns.filter(
    (campaign) => campaign.status === "DRAFT",
  ).length;
  const completedCampaignCount = campaigns.filter((campaign) =>
    ["COMPLETED", "FAILED", "CANCELED"].includes(campaign.status),
  ).length;

  const campaignMessageTotals = campaigns.reduce(
    (acc, campaign) => {
      acc.sent += campaign.messagesSent || 0;
      acc.delivered += campaign.messagesDelivered || 0;
      acc.read += campaign.messagesRead || 0;
      acc.failed += campaign.messagesFailed || 0;
      return acc;
    },
    { sent: 0, delivered: 0, read: 0, failed: 0 },
  );

  const derivedStats = {
    totalContacts: preferNonZero(stats?.totalContacts, contacts.length),
    totalCampaigns: preferNonZero(
      stats?.totalCampaigns,
      campaignStats?.totalCampaigns ?? campaigns.length,
    ),
    totalMessages: preferNonZero(
      stats?.totalMessages,
      campaignStats?.totalMessagesSent ?? 0,
    ),
    messagesThisMonth: preferNonZero(
      stats?.messagesThisMonth,
      campaignStats?.totalMessagesSent ?? 0,
    ),
    activeWhatsAppNumbers: preferNonZero(
      stats?.activeWhatsAppNumbers,
      whatsappNumbers.filter((number) => number.isActive).length,
    ),
    activeTemplates: preferNonZero(
      stats?.activeTemplates,
      templates.filter((template) => template.isActive).length,
    ),
    activeCampaigns: preferNonZero(
      campaignStats?.activeCampaigns,
      activeCampaignCount,
    ),
    deliveryRate:
      campaignStats?.deliveryRate ??
      (campaignMessageTotals.sent > 0
        ? Math.round(
            (campaignMessageTotals.delivered / campaignMessageTotals.sent) * 100,
          )
        : 0),
    readRate:
      campaignStats?.readRate ??
      (campaignMessageTotals.delivered > 0
        ? Math.round(
            (campaignMessageTotals.read / campaignMessageTotals.delivered) * 100,
          )
        : 0),
  };

  const monthlyMessagesUsed = Math.max(0, subscriptionMessagesUsed);
  const rawUsagePercentage =
    messageLimit > 0
      ? Math.min(100, (monthlyMessagesUsed / messageLimit) * 100)
      : 0;
  const usageProgressValue =
    rawUsagePercentage > 0 ? Math.max(rawUsagePercentage, 1) : 0;
  const usagePercentageLabel =
    rawUsagePercentage > 0 && rawUsagePercentage < 1
      ? "<1% used"
      : `${Math.round(rawUsagePercentage)}% used`;

  const templateUsage = [...templates]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 3);
  const templateStatusCounts = templates.reduce(
    (acc, template) => {
      const status = (template.status || "PENDING").toUpperCase();
      if (status === "APPROVED") acc.approved += 1;
      else if (status === "REJECTED" || status === "FAILED") acc.failed += 1;
      else acc.pending += 1;
      return acc;
    },
    { pending: 0, approved: 0, failed: 0 },
  );

  const weeklyTrendData = Array.from({ length: 7 }).map((_, index) => {
    const date = subDays(new Date(), 6 - index);
    const dateKey = format(date, "yyyy-MM-dd");
    const campaignsCreated = campaigns.filter(
      (campaign) => format(new Date(campaign.createdAt), "yyyy-MM-dd") === dateKey,
    ).length;
    const activityCount = activity.filter(
      (item) => format(new Date(item.createdAt), "yyyy-MM-dd") === dateKey,
    ).length;

    return {
      day: format(date, "EEE"),
      campaigns: campaignsCreated,
      activity: activityCount,
    };
  });

  const statusBreakdownData = [
    { key: "draft", name: "Draft", value: draftCampaignCount, fill: "var(--color-draft)" },
    { key: "active", name: "Active", value: activeCampaignCount, fill: "var(--color-active)" },
    { key: "completed", name: "Completed", value: completedCampaignCount, fill: "var(--color-completed)" },
  ].filter((item) => item.value > 0);

  const weeklyChartConfig = {
    campaigns: { label: "Campaigns", color: "hsl(var(--brand))" },
    activity: { label: "Activity", color: "hsl(var(--info))" },
  } satisfies ChartConfig;

  const statusChartConfig = {
    draft: { label: "Draft", color: "hsl(var(--muted-foreground))" },
    active: { label: "Active", color: "hsl(var(--warning))" },
    completed: { label: "Completed", color: "hsl(var(--success))" },
  } satisfies ChartConfig;

  const rateChartData = [
    { metric: "Delivery", value: derivedStats.deliveryRate, fill: "var(--color-delivery)" },
    { metric: "Read", value: derivedStats.readRate, fill: "var(--color-read)" },
  ];

  const rateChartConfig = {
    delivery: { label: "Delivery Rate", color: "hsl(var(--success))" },
    read: { label: "Read Rate", color: "hsl(var(--info))" },
  } satisfies ChartConfig;

  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back, {user?.name?.split(" ")[0] || user?.name}
              </h1>
              <p className="mt-1 text-muted-foreground">
                Here's what's happening with {organization?.name} today.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge
                variant={
                  subscriptionStatusVariant[
                    subscription?.status ||
                      organization?.subscriptionStatus ||
                      "TRIAL"
                  ]
                }
                dot
              >
                {subscription?.plan || organization?.plan} •{" "}
                {subscription?.status ||
                  organization?.subscriptionStatus ||
                  "TRIAL"}
              </StatusBadge>
            </div>
          </div>

          {/* Usage Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Monthly Usage
                  </p>
                  <p className="text-2xl font-semibold">
                    {monthlyMessagesUsed.toLocaleString() || "0"}{" "}
                    <span className="text-lg font-normal text-muted-foreground">
                      / {messageLimit.toLocaleString() || "0"} messages
                    </span>
                  </p>
                </div>
                <div className="flex-1 max-w-md">
                  <Progress value={usageProgressValue} className="h-2" />
                  <p className="mt-1 text-xs text-muted-foreground text-right">
                    {usagePercentageLabel}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          {isLoading ? (
            <StatCardsSkeleton count={4} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Contacts"
                value={derivedStats.totalContacts}
                icon={Users}
                trend={{ value: 12, label: "vs last month" }}
              />
              <StatCard
                title="Active Campaigns"
                value={derivedStats.activeCampaigns}
                icon={Send}
              />
              <StatCard
                title="Messages This Month"
                value={monthlyMessagesUsed}
                icon={MessageSquare}
                trend={{ value: 8, label: "vs last month" }}
              />
              <StatCard
                title="Consented Contacts"
                value={
                  contacts.filter(
                    (c) => c.status === "CONSENTED" || c.consent === true,
                  ).length
                }
                icon={Users}
              />
            </div>
          )}

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  7-Day Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={weeklyChartConfig} className="h-[260px] w-full">
                  <LineChart data={weeklyTrendData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="campaigns"
                      stroke="var(--color-campaigns)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="activity"
                      stroke="var(--color-activity)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Campaign Mix
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusBreakdownData.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No campaign data"
                    description="Create your first campaign to see status breakdown."
                    className="py-8"
                  />
                ) : (
                  <ChartContainer config={statusChartConfig} className="h-[260px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie
                        data={statusBreakdownData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={84}
                        strokeWidth={2}
                      />
                      <ChartLegend
                        verticalAlign="bottom"
                        content={<ChartLegendContent nameKey="name" />}
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-brand/10 p-2">
                        <FileText className="h-4 w-4 text-brand" />
                      </div>
                      <span className="text-sm font-medium">
                        Active Templates
                      </span>
                    </div>
                    <span className="text-lg font-semibold">
                      {derivedStats.activeTemplates}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-success/10 p-2">
                        <MessageSquare className="h-4 w-4 text-success" />
                      </div>
                      <span className="text-sm font-medium">
                        Total Messages Sent
                      </span>
                    </div>
                    <span className="text-lg font-semibold">
                      {derivedStats.totalMessages.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm font-medium mb-2">Engagement Rates</p>
                    <ChartContainer config={rateChartConfig} className="h-[130px] w-full">
                      <BarChart
                        data={rateChartData}
                        layout="vertical"
                        margin={{ left: 8, right: 20, top: 2, bottom: 2 }}
                      >
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <YAxis
                          type="category"
                          dataKey="metric"
                          tickLine={false}
                          axisLine={false}
                          width={58}
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
                        />
                        <Bar
                          dataKey="value"
                          radius={8}
                          label={{ position: "right", formatter: (v: number) => `${v}%` }}
                        />
                      </BarChart>
                    </ChartContainer>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-info/10 p-2">
                        <Phone className="h-4 w-4 text-info" />
                      </div>
                      <span className="text-sm font-medium">
                        WhatsApp Numbers
                      </span>
                    </div>
                    <span className="text-lg font-semibold">
                      {derivedStats.activeWhatsAppNumbers}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Top Templates</p>
                    <div className="space-y-2">
                      {templateUsage.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No template usage yet.
                        </p>
                      ) : (
                        templateUsage.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate pr-2">{template.name}</span>
                            <span className="text-muted-foreground">
                              {template.usageCount || 0}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm font-medium mb-2">
                      Template Review Status
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge variant="warning">
                        Pending: {templateStatusCounts.pending}
                      </StatusBadge>
                      <StatusBadge variant="success">
                        Approved: {templateStatusCounts.approved}
                      </StatusBadge>
                      <StatusBadge variant="destructive">
                        Failed: {templateStatusCounts.failed}
                      </StatusBadge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No recent activity yet"
                    description="Campaign sends, inbound replies, and team actions will appear here in real time."
                    className="py-10"
                  />
                ) : (
                  <div className="space-y-4">
                    {activity.slice(0, 6).map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-muted p-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.userName} •{" "}
                            {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
