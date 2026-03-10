import { useEffect, useMemo, useRef, useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout, PageContainer } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  RefreshCw,
} from "lucide-react";
import { WhatsAppTemplate, TemplateCategory, TemplateLanguage } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const categoryLabels: Record<TemplateCategory, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Authentication",
};

const categoryVariants: Record<TemplateCategory, "brand" | "info" | "warning"> =
  {
    MARKETING: "brand",
    UTILITY: "info",
    AUTHENTICATION: "warning",
  };

const statusVariants: Record<
  string,
  "brand" | "info" | "warning" | "destructive"
> = {
  APPROVED: "brand",
  PENDING: "warning",
  REJECTED: "destructive",
};

const languageLabels: Record<TemplateLanguage, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
};

const bodyParamOptions = [
  { value: "contact.name", label: "Contact Name" },
  { value: "contact.phone", label: "Contact Phone" },
  { value: "org.name", label: "Organization Name" },
];

export default function Templates() {
  const { templates, isLoading, refreshTemplates } = useOrganization();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WhatsAppTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppTemplate | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "UTILITY" as TemplateCategory,
    language: "en" as TemplateLanguage,
    bodyParamKeys: [] as string[],
  });
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPollingAll, setIsPollingAll] = useState(false);
  const [pollingTemplateId, setPollingTemplateId] = useState<string | null>(
    null,
  );
  const hasInitialStatusPollRun = useRef(false);

  const canManage = hasRole(["OWNER", "ADMIN"]);

  // Extract variable numbers from content
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/{{\d+}}/g) || [];
    return [...new Set(matches)].sort(
      (a, b) =>
        parseInt(a.replace(/[{}]/g, ""), 10) -
        parseInt(b.replace(/[{}]/g, ""), 10),
    );
  };
  const templateVariables = useMemo(
    () => extractVariables(formData.content),
    [formData.content],
  );

  useEffect(() => {
    const variableCount = templateVariables.length;
    setFormData((prev) => {
      const current = Array.isArray(prev.bodyParamKeys)
        ? prev.bodyParamKeys
        : [];
      if (variableCount === current.length) return prev;
      const next = Array.from({ length: variableCount }, (_, idx) => {
        const existing = current[idx];
        if (existing) return existing;
        return bodyParamOptions[idx]?.value || "contact.name";
      });
      return { ...prev, bodyParamKeys: next };
    });
  }, [templateVariables]);

  useEffect(() => {
    if (!canManage) return;
    if (templates.length === 0) return;

    const runPoll = async () => {
      try {
        await api.templates.pollStatus();
        await refreshTemplates();
      } catch (error) {
        // Silent retry loop for background polling.
      }
    };

    if (!hasInitialStatusPollRun.current) {
      hasInitialStatusPollRun.current = true;
      void runPoll();
    }

    const hasPendingTemplates = templates.some((t) => t.status === "PENDING");
    if (!hasPendingTemplates) return;

    const intervalId = window.setInterval(async () => {
      await runPoll();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [canManage, templates, refreshTemplates]);

  // Generate preview with variable values
  const generatePreview = () => {
    let preview = formData.content;
    Object.entries(variableValues).forEach(([key, value]) => {
      // Escape curly braces for regex
      const escapedPattern = `\\{\\{${key}\\}\\}`;
      preview = preview.replace(
        new RegExp(escapedPattern, "g"),
        value || `{{${key}}}`,
      );
    });
    return preview;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      content: "",
      category: "UTILITY",
      language: "en",
      bodyParamKeys: [],
    });
    setVariableValues({});
  };

  const openCreate = () => {
    resetForm();
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (template: WhatsAppTemplate) => {
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      language: template.language,
      bodyParamKeys: template.bodyParamKeys || [],
    });
    setVariableValues({});
    setEditTarget(template);
    setModalOpen(true);
  };

  const addVariable = () => {
    const textarea = document.getElementById("content") as HTMLTextAreaElement;
    if (!textarea) return;

    const currentText = formData.content;

    // Find existing variables like {{1}}, {{2}}
    const matches = currentText.match(/{{\d+}}/g) || [];
    const numbers = matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10));

    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

    const variableText = `{{${nextNumber}}}`;

    // Insert at cursor position
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newText =
      currentText.substring(0, start) +
      variableText +
      currentText.substring(end);

    setFormData((prev) => ({
      ...prev,
      content: newText,
    }));

    // Keep focus + move cursor after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd =
        start + variableText.length;
    }, 0);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // 1️⃣ Extract variables from template content
      const variables = extractVariables(formData.content);

      // 2️⃣ Build example values array
      const exampleValues =
        variables.length > 0
          ? variables.map((variable) => {
              const varNum = variable.replace(/[{}]/g, "");
              return variableValues[varNum] || `example${varNum}`;
            })
          : undefined;

      const payload = {
        name: formData.name,
        content: formData.content,
        category: formData.category,
        language: formData.language,
        exampleValues, // 👈 sent to backend
        bodyParamKeys:
          variables.length > 0
            ? formData.bodyParamKeys.slice(0, variables.length)
            : [],
      };

      if (editTarget) {
        await api.templates.update(editTarget.id, payload);
        toast({ title: "Template updated" });
      } else {
        await api.templates.create(payload);
        toast({ title: "Template created" });
      }

      setModalOpen(false);
      resetForm();
      setEditTarget(null);
      refreshTemplates();
    } catch (error) {
      console.error("Template save error:", error);
      toast({
        title: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (template: WhatsAppTemplate) => {
    try {
      await api.templates.toggle(template.id);
      toast({
        title: template.isActive
          ? "Template deactivated"
          : "Template activated",
      });
      refreshTemplates();
    } catch (error) {
      toast({ title: "Failed to toggle status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.templates.delete(deleteTarget.id);
      toast({ title: "Template deleted" });
      setDeleteTarget(null);
      refreshTemplates();
    } catch (error) {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  const handlePollStatuses = async (templateId?: string) => {
    if (templateId) {
      setPollingTemplateId(templateId);
    } else {
      setIsPollingAll(true);
    }

    try {
      await api.templates.pollStatus(templateId);
      await refreshTemplates();
      toast({
        title: templateId
          ? "Template status updated"
          : "Template approvals refreshed",
      });
    } catch (error) {
      toast({
        title: "Failed to check template approval",
        variant: "destructive",
      });
    } finally {
      if (templateId) {
        setPollingTemplateId(null);
      } else {
        setIsPollingAll(false);
      }
    }
  };

  const handleDuplicate = (template: WhatsAppTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      content: template.content,
      category: template.category,
      language: template.language,
      bodyParamKeys: template.bodyParamKeys || [],
    });
    setVariableValues({});
    setEditTarget(null);
    setModalOpen(true);
  };

  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Templates"
            description="Create and manage your WhatsApp message templates."
          >
            {canManage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePollStatuses()}
                  disabled={isPollingAll}
                >
                  {isPollingAll ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Check Approvals
                </Button>
                <Button
                  onClick={openCreate}
                  className="bg-brand text-brand-foreground hover:bg-brand-hover"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </div>
            )}
          </PageHeader>

          {/* Templates Table */}
          <div className="rounded-xl border bg-card">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={5} columns={6} />
              </div>
            ) : templates.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No templates"
                description="Create your first message template to start sending campaigns."
                action={
                  canManage
                    ? { label: "Create Template", onClick: openCreate }
                    : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {template.content}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={categoryVariants[template.category]}
                        >
                          {categoryLabels[template.category]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {languageLabels[template.language]}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {template.usageCount.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground"> uses</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={statusVariants[template.status] || "info"}
                        >
                          {template.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={() => handleToggle(template)}
                            disabled={!canManage}
                          />
                          <span className="text-sm text-muted-foreground">
                            {template.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(template.updatedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEdit(template)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(template)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePollStatuses(template.id)}
                                disabled={pollingTemplateId === template.id}
                              >
                                {pollingTemplateId === template.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Check Approval
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(template)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editTarget ? "Edit Template" : "Create Template"}
              </DialogTitle>
              <DialogDescription>
                {editTarget
                  ? "Update your message template details."
                  : "Create a new WhatsApp message template."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  placeholder="Welcome Message"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        category: v as TemplateCategory,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="UTILITY">Utility</SelectItem>
                      <SelectItem value="AUTHENTICATION">
                        Authentication
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        language: v as TemplateLanguage,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Message Content</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariable}
                  >
                    + Add Variable
                  </Button>
                </div>

                <Textarea
                  id="content"
                  placeholder="Hi {{1}}! Welcome to {{2}}..."
                  rows={4}
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, content: e.target.value }))
                  }
                />

                <p className="text-xs text-muted-foreground">
                  Click "Add Variable" to insert dynamic placeholders like{" "}
                  {"{{1}}"}, {"{{2}}"}.
                </p>
              </div>

              {/* Variable Preview Section */}
              {templateVariables.length > 0 && (
                <div className="space-y-3 rounded-lg border p-4">
                  <Label className="text-sm font-medium">
                    Map Variables to Data
                  </Label>
                  <div className="space-y-2">
                    {templateVariables.map((variable, index) => (
                      <div key={variable} className="flex items-center gap-3">
                        <Label className="min-w-[48px] text-xs text-muted-foreground">
                          {variable}
                        </Label>
                        <Select
                          value={
                            formData.bodyParamKeys[index] || "contact.name"
                          }
                          onValueChange={(value) =>
                            setFormData((prev) => {
                              const next = [...prev.bodyParamKeys];
                              next[index] = value;
                              return { ...prev, bodyParamKeys: next };
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {bodyParamOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {templateVariables.length > 0 && (
                <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                  <Label className="text-sm font-medium">
                    Preview with Sample Values
                  </Label>

                  {/* Variable Inputs */}
                  <div className="space-y-2">
                    {templateVariables.map((variable) => {
                      const varNum = variable.replace(/[{}]/g, "");
                      return (
                        <div key={variable} className="flex items-center gap-2">
                          <Label className="min-w-[60px] text-xs text-muted-foreground">
                            {variable}
                          </Label>
                          <Input
                            placeholder={`Value for ${variable}`}
                            value={variableValues[varNum] || ""}
                            onChange={(e) =>
                              setVariableValues((prev) => ({
                                ...prev,
                                [varNum]: e.target.value,
                              }))
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Preview Display */}
                  <div className="rounded-md bg-background p-3 border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Message Preview:
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {generatePreview()}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name || !formData.content || isSaving}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editTarget ? (
                  "Save Changes"
                ) : (
                  "Create Template"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteTarget?.name}"? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </AppLayout>
  );
}
