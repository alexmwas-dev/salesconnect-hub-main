import { useEffect, useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout, PageContainer } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  TableSkeleton,
  StatCardsSkeleton,
} from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Rocket,
  TrendingUp,
  CheckCircle,
  Loader2,
  Pause,
  Play,
  Square,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const statusVariants = {
  DRAFT: "default",
  QUEUED: "warning",
  SENDING: "info",
  PAUSED: "warning",
  CANCELED: "destructive",
  COMPLETED: "success",
  FAILED: "destructive",
} as const;

const statusLabels = {
  DRAFT: "Draft",
  QUEUED: "Queued",
  SENDING: "Sending",
  PAUSED: "Paused",
  CANCELED: "Canceled",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export default function Campaigns() {
  const {
    campaigns,
    campaignStats,
    templates,
    isLoading,
    refreshCampaigns,
    refreshTemplates,
  } = useOrganization();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [formData, setFormData] = useState({
    contactLimit: "",
    delayMs: "500",
  });
  // allow selecting a campaign to send
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [createFormData, setCreateFormData] = useState({
    name: "",
    templateId: "",
    description: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionCampaignId, setActionCampaignId] = useState<string | null>(null);
  const [campaignTab, setCampaignTab] = useState<
    "ACTIVE" | "DRAFT" | "COMPLETED"
  >("ACTIVE");

  const canSend = hasRole(["OWNER", "ADMIN", "SALES_REP"]);
  const activeTemplates = templates.filter((t) => t.isActive);
  // Only drafts that already have a template should be available for sending
  const eligibleDraftCampaigns = campaigns.filter(
    (c) => c.status === "DRAFT" && !!c.templateId,
  );
  const activeCampaigns = campaigns.filter((c) =>
    ["QUEUED", "SENDING", "PAUSED"].includes(c.status),
  );
  const draftCampaigns = campaigns.filter((c) => c.status === "DRAFT");
  const completedCampaigns = campaigns.filter((c) =>
    ["COMPLETED", "FAILED", "CANCELED"].includes(c.status),
  );

  const filteredCampaigns =
    campaignTab === "ACTIVE"
      ? activeCampaigns
      : campaignTab === "DRAFT"
        ? draftCampaigns
        : completedCampaigns;

  useEffect(() => {
    if (!createOpen && !sendOpen) return;
    void refreshTemplates();
    void refreshCampaigns();
  }, [createOpen, sendOpen, refreshTemplates, refreshCampaigns]);

  useEffect(() => {
    // Keep campaign table live without manual refresh.
    const refresh = () => {
      void refreshCampaigns();
    };

    const onVisibilityOrFocus = () => {
      refresh();
    };

    const intervalMs = 2500;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, intervalMs);

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
  }, [refreshCampaigns]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const payload: any = { name: createFormData.name };
      if (createFormData.description)
        payload.description = createFormData.description;
      if (createFormData.templateId)
        payload.templateId = createFormData.templateId;

      await api.campaigns.create(payload);
      toast({
        title: "Campaign created",
        description: "Your campaign has been created as a draft.",
      });
      setCreateOpen(false);
      setCreateFormData({ name: "", templateId: "", description: "" });
      refreshCampaigns();
    } catch (error) {
      toast({ title: "Failed to create campaign", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = async () => {
    if (!selectedCampaignId) {
      toast({
        title: "Campaign is required",
        description: "Select a draft campaign before sending.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const payload: any = {};
      payload.campaignId = selectedCampaignId;
      if (selectedTemplateId) payload.templateId = selectedTemplateId;
      if (formData.contactLimit)
        payload.limit = parseInt(formData.contactLimit);
      payload.delay = parseInt(formData.delayMs) || 500;

      await api.campaigns.send(payload);
      toast({
        title: "Campaign started",
        description: "Your campaign is now being sent to contacts.",
      });
      setSendOpen(false);
      setFormData({ contactLimit: "", delayMs: "500" });
      setSelectedCampaignId("");
      setSelectedTemplateId("");
      refreshCampaigns();
    } catch (error) {
      toast({ title: "Failed to start campaign", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handlePause = async (campaignId: string) => {
    setActionCampaignId(campaignId);
    try {
      await api.campaigns.pause(campaignId);
      toast({ title: "Campaign paused" });
      refreshCampaigns();
    } catch (error) {
      toast({ title: "Failed to pause campaign", variant: "destructive" });
    } finally {
      setActionCampaignId(null);
    }
  };

  const handleResume = async (campaignId: string) => {
    setActionCampaignId(campaignId);
    try {
      await api.campaigns.resume(campaignId);
      toast({ title: "Campaign resumed" });
      refreshCampaigns();
    } catch (error) {
      toast({ title: "Failed to resume campaign", variant: "destructive" });
    } finally {
      setActionCampaignId(null);
    }
  };

  const handleCancel = async (campaignId: string) => {
    setActionCampaignId(campaignId);
    try {
      await api.campaigns.cancel(campaignId);
      toast({ title: "Campaign canceled" });
      refreshCampaigns();
    } catch (error) {
      toast({ title: "Failed to cancel campaign", variant: "destructive" });
    } finally {
      setActionCampaignId(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    const confirmed = window.confirm(
      "Delete this campaign? This cannot be undone.",
    );
    if (!confirmed) return;

    setActionCampaignId(campaignId);
    try {
      await api.campaigns.delete(campaignId);
      toast({ title: "Campaign deleted" });
      refreshCampaigns();
    } catch (error) {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
    } finally {
      setActionCampaignId(null);
    }
  };

  const handleResend = async (campaignId: string) => {
    setActionCampaignId(campaignId);
    try {
      await api.campaigns.resend(campaignId);
      toast({ title: "Campaign queued for resend" });
      refreshCampaigns();
    } catch (error) {
      toast({ title: "Failed to resend campaign", variant: "destructive" });
    } finally {
      setActionCampaignId(null);
    }
  };

  const handleOpenSendForDraft = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setSendOpen(true);
  };

  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Campaigns"
            description="Create, send and track your WhatsApp outreach campaigns."
          >
            {canSend && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(true)}
                  disabled={activeTemplates.length === 0}
                >
                  <Send className="mr-2 h-4 w-4" />
                  New Campaign
                </Button>
                <Button
                  onClick={() => setSendOpen(true)}
                  className="bg-brand text-brand-foreground hover:bg-brand-hover"
                  disabled={activeTemplates.length === 0}
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Send Campaign
                </Button>
              </div>
            )}
          </PageHeader>

          {/* Stats */}
          {isLoading ? (
            <StatCardsSkeleton count={4} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Campaigns"
                value={campaignStats?.totalCampaigns || 0}
                icon={Send}
              />
              <StatCard
                title="Active Campaigns"
                value={campaignStats?.activeCampaigns || 0}
                icon={Rocket}
              />
              <StatCard
                title="Delivery Rate"
                value={`${campaignStats?.deliveryRate || 0}%`}
                icon={CheckCircle}
              />
              <StatCard
                title="Read Rate"
                value={`${campaignStats?.readRate || 0}%`}
                icon={TrendingUp}
              />
            </div>
          )}

          {/* Campaigns Table */}
          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b">
              <Tabs
                value={campaignTab}
                onValueChange={(value) =>
                  setCampaignTab(value as "ACTIVE" | "DRAFT" | "COMPLETED")
                }
              >
                <TabsList>
                  <TabsTrigger value="ACTIVE">
                    Active ({activeCampaigns.length})
                  </TabsTrigger>
                  <TabsTrigger value="DRAFT">
                    Draft ({draftCampaigns.length})
                  </TabsTrigger>
                  <TabsTrigger value="COMPLETED">
                    Completed ({completedCampaigns.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={5} columns={6} />
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <EmptyState
                icon={Send}
                title={`No ${campaignTab.toLowerCase()} campaigns`}
                description={
                  campaignTab === "ACTIVE"
                    ? "Queued, sending, or paused campaigns will appear here."
                    : campaignTab === "DRAFT"
                      ? "Draft campaigns will appear here."
                      : "Completed, failed, or canceled campaigns will appear here."
                }
                action={
                  campaignTab === "DRAFT" &&
                  canSend &&
                  activeTemplates.length > 0
                    ? {
                        label: "New Campaign",
                        onClick: () => setCreateOpen(true),
                      }
                    : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Read Rate</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const progress =
                      campaign.totalContacts > 0
                        ? Math.round(
                            (campaign.messagesSent / campaign.totalContacts) *
                              100,
                          )
                        : 0;
                    const deliveryRate =
                      campaign.messagesSent > 0
                        ? Math.round(
                            (campaign.messagesDelivered /
                              campaign.messagesSent) *
                              100,
                          )
                        : 0;
                    const readRate =
                      campaign.messagesDelivered > 0
                        ? Math.round(
                            (campaign.messagesRead /
                              campaign.messagesDelivered) *
                              100,
                          )
                        : 0;

                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {campaign.totalContacts.toLocaleString()} contacts
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {campaign.templateName}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={statusVariants[campaign.status]}
                            dot={campaign.status === "SENDING"}
                            pulse={campaign.status === "SENDING"}
                          >
                            {statusLabels[campaign.status]}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>
                                {campaign.messagesSent.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">
                                {progress}%
                              </span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-success">
                            {deliveryRate}%
                          </span>
                          {campaign.messagesFailed > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({campaign.messagesFailed} failed)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{readRate}%</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(campaign.status === "SENDING" ||
                              campaign.status === "QUEUED") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePause(campaign.id)}
                                  disabled={actionCampaignId === campaign.id}
                                >
                                  <Pause className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancel(campaign.id)}
                                  disabled={actionCampaignId === campaign.id}
                                >
                                  <Square className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}

                            {campaign.status === "PAUSED" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResume(campaign.id)}
                                  disabled={actionCampaignId === campaign.id}
                                >
                                  <Play className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancel(campaign.id)}
                                  disabled={actionCampaignId === campaign.id}
                                >
                                  <Square className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}

                            {campaign.status === "COMPLETED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResend(campaign.id)}
                                disabled={actionCampaignId === campaign.id}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {campaign.status === "DRAFT" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleOpenSendForDraft(campaign.id)
                                  }
                                >
                                  <Rocket className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(campaign.id)}
                                  disabled={actionCampaignId === campaign.id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}

                            {(campaign.status === "COMPLETED" ||
                              campaign.status === "FAILED" ||
                              campaign.status === "CANCELED") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(campaign.id)}
                                disabled={actionCampaignId === campaign.id}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(campaign.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* New Campaign Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Create a new campaign draft. You can send it later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., Holiday Promo 2026"
                  value={createFormData.name}
                  onChange={(e) =>
                    setCreateFormData((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-description">
                  Description (optional)
                </Label>
                <Input
                  id="campaign-description"
                  placeholder="Short description"
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Message Template</Label>
                <Select
                  value={createFormData.templateId}
                  onValueChange={(v) =>
                    setCreateFormData((p) => ({ ...p, templateId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({template.category})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!createFormData.name || isCreating}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Campaign Dialog */}
        <Dialog open={sendOpen} onOpenChange={setSendOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Campaign</DialogTitle>
              <DialogDescription>
                Configure and send a new WhatsApp campaign to your contacts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Campaign (Drafts with template)</Label>
                <Select
                  value={selectedCampaignId}
                  onValueChange={(v) => setSelectedCampaignId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a draft campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleDraftCampaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({c.totalContacts || 0} contacts)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Show selected campaign's template name for clarity */}
                {selectedCampaignId && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Template:{" "}
                    {eligibleDraftCampaigns.find(
                      (c) => c.id === selectedCampaignId,
                    )?.templateName || "(unknown)"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Template (Active templates)</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(v) =>
                    setSelectedTemplateId(v === "__none" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No Template</SelectItem>
                    {activeTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({template.category})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  If both are selected, campaign template is used by backend.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactLimit">Contact Limit (optional)</Label>
                <Input
                  id="contactLimit"
                  type="number"
                  placeholder="Leave empty to send to all"
                  value={formData.contactLimit}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, contactLimit: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Limit the number of contacts to send to. Useful for testing.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay">Delay Between Messages (ms)</Label>
                <Select
                  value={formData.delayMs}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, delayMs: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">250ms (Fast)</SelectItem>
                    <SelectItem value="500">500ms (Normal)</SelectItem>
                    <SelectItem value="1000">1 second (Slow)</SelectItem>
                    <SelectItem value="2000">2 seconds (Very Slow)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Slower delays reduce the risk of rate limiting.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!selectedCampaignId || isSending}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Start Campaign
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </AppLayout>
  );
}
