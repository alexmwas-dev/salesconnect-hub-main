import { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout, PageContainer } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Plus,
  Upload,
  MoreVertical,
  Edit,
  Trash,
  Loader2,
  Download,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { Contact, Campaign } from "@/types";

export default function Contacts() {
  const { contacts, campaigns, isLoading, refreshContacts, refreshCampaigns } =
    useOrganization();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addToCampaignOpen, setAddToCampaignOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [selectedCampaignForAdd, setSelectedCampaignForAdd] =
    useState<Campaign | null>(null);
  const [selectedCampaignForImport, setSelectedCampaignForImport] =
    useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(
    new Set(),
  );
  const [formData, setFormData] = useState({
    phoneNumber: "",
    firstName: "",
    lastName: "",
    email: "",
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddingToCampaign, setIsAddingToCampaign] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [standalonePage, setStandalonePage] = useState(1);
  const [campaignPages, setCampaignPages] = useState<Record<string, number>>(
    {},
  );

  const isSalesRep = user?.role === "SALES_REP";
  const canManage = hasRole(["OWNER", "ADMIN", "SALES_REP"]);
  const canImport = hasRole(["OWNER", "ADMIN"]);
  const canEdit = canManage;
  const canDelete = canManage;
  const canAddToCampaign = false;

  if (!user) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="space-y-6">
            <PageHeader
              title="Contacts"
              description="Sign in to view contacts."
            />
            <EmptyState
              icon={Users}
              title="No contacts to display"
              description="Sign in to view your contacts."
            />
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  // Group contacts by campaign (memoized to avoid recreating on every render)
  const campaignContacts = useMemo(() => {
    const map: Record<string, Contact[]> = {};
    const contactById = new Map(contacts.map((c) => [c.id, c]));
    campaigns.forEach((campaign) => {
      const ids: string[] = (campaign as any).contactIds || [];
      map[campaign.id] = ids
        .map((id) => contactById.get(id))
        .filter(Boolean) as Contact[];
    });
    return map;
  }, [contacts, campaigns]);

  // Standalone contacts are those not assigned to any campaign (memoized)
  const standaloneContacts = useMemo(() => {
    const assigned = new Set<string>();
    Object.values(campaignContacts).forEach((list) =>
      list.forEach((c) => assigned.add(c.id)),
    );
    return contacts.filter((c) => !assigned.has(c.id));
  }, [contacts, campaignContacts]);

  const filteredContacts = (contactList: Contact[]) => {
    const query = searchQuery.toLowerCase();
    return contactList.filter(
      (contact) =>
        contact.phoneNumber.toLowerCase().includes(query) ||
        contact.firstName?.toLowerCase().includes(query) ||
        contact.lastName?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.status?.toLowerCase().includes(query),
    );
  };

  useEffect(() => {
    // reset pagination when search query changes
    setStandalonePage(1);
    setCampaignPages({});
  }, [searchQuery]);

  // Ensure current pages stay within bounds when data or page size changes
  useEffect(() => {
    const total = getTotalPages(standaloneContacts);
    if (standalonePage > total) setStandalonePage(total);
  }, [standaloneContacts, searchQuery, pageSize]);

  useEffect(() => {
    setCampaignPages((prev) => {
      const next: Record<string, number> = { ...prev };
      campaigns.forEach((c) => {
        const total = getTotalPages(campaignContacts[c.id] || []);
        if (!next[c.id]) next[c.id] = 1;
        if (next[c.id] > total) next[c.id] = total;
      });
      // remove pages for campaigns that no longer exist
      Object.keys(next).forEach((k) => {
        if (!campaigns.find((c) => c.id === k)) delete next[k];
      });

      // shallow compare prev and next - if identical, return prev to avoid re-render
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length) {
        let same = true;
        for (const key of nextKeys) {
          if (prev[key] !== next[key]) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }

      return next;
    });
  }, [campaigns, campaignContacts, searchQuery, pageSize]);

  const getTotalPages = (list: Contact[]) =>
    Math.max(1, Math.ceil(filteredContacts(list).length / pageSize));

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const resetForm = () => {
    setFormData({
      phoneNumber: "",
      firstName: "",
      lastName: "",
      email: "",
    });
    setSelectedContact(null);
    setSelectedCampaignForAdd(null);
  };

  const handleAdd = async () => {
    setIsSaving(true);
    try {
      if (selectedCampaignForAdd) {
        // Create contact and attach to the selected campaign
        await api.campaigns.createContactAndAttach(selectedCampaignForAdd.id, {
          name:
            `${formData.firstName || ""} ${formData.lastName || ""}`.trim() ||
            formData.phoneNumber,
          phone: formData.phoneNumber,
          email: formData.email || undefined,
        });
        toast({ title: "Contact added and attached to campaign" });
      } else {
        await api.contacts.create({
          phoneNumber: formData.phoneNumber,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          email: formData.email || undefined,
        });
        toast({ title: "Contact added successfully" });
      }

      setAddOpen(false);
      resetForm();
      refreshContacts();
      if (selectedCampaignForAdd) {
        refreshCampaigns();
      }
    } catch (error) {
      toast({ title: "Failed to add contact", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedContact) return;
    setIsSaving(true);
    try {
      const name =
        `${formData.firstName || ""} ${formData.lastName || ""}`.trim();
      await api.contacts.update(selectedContact.id, {
        name: name || selectedContact.phoneNumber,
        phone: formData.phoneNumber,
        email: formData.email || undefined,
      });
      toast({ title: "Contact updated successfully" });
      setEditOpen(false);
      resetForm();
      refreshContacts();
    } catch (error) {
      toast({ title: "Failed to update contact", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedContact) return;
    setIsDeleting(true);
    try {
      await api.contacts.delete(selectedContact.id);
      toast({ title: "Contact deleted successfully" });
      setDeleteOpen(false);
      setSelectedContact(null);
      refreshContacts();
    } catch (error) {
      toast({ title: "Failed to delete contact", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddToCampaign = async () => {
    if (!selectedContact || !selectedCampaign) return;
    setIsAddingToCampaign(true);
    try {
      // TODO: Implement actual API call to add contact to campaign
      // await api.campaigns.addContact(selectedCampaign.id, selectedContact.id);
      toast({
        title: "Contact added to campaign",
        description: `${selectedContact.firstName || selectedContact.phoneNumber} added to ${selectedCampaign.name}`,
      });
      setAddToCampaignOpen(false);
      setSelectedContact(null);
      setSelectedCampaign(null);
      refreshCampaigns();
    } catch (error) {
      toast({
        title: "Failed to add contact to campaign",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCampaign(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const text = await importFile.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) {
        toast({ title: "CSV is empty", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1);
      const contactsPayload: any[] = [];

      for (const row of rows) {
        const cols = row.split(",").map((c) => c.trim());
        if (cols.length === 0) continue;
        const entry: any = {};
        headers.forEach((h, i) => {
          const v = cols[i] || "";
          if (h === "phonenumber" || h === "phone" || h === "phone_number") {
            entry.phone = v;
          } else if (h === "firstname" || h === "first_name") {
            entry.firstName = v;
          } else if (h === "lastname" || h === "last_name") {
            entry.lastName = v;
          } else if (h === "email") {
            entry.email = v;
          }
        });

        if (!entry.phone) continue; // require phone
        const name =
          [entry.firstName, entry.lastName].filter(Boolean).join(" ") ||
          entry.phone;
        contactsPayload.push({
          name,
          phone: entry.phone,
          email: entry.email || null,
        });
      }

      if (contactsPayload.length === 0) {
        toast({
          title: "No valid contacts found in CSV",
          variant: "destructive",
        });
        return;
      }

      // Call bulk import API; include campaign if selected
      const payload: any = { contacts: contactsPayload };
      if (selectedCampaignForImport)
        payload.campaignId = selectedCampaignForImport.id;

      const result = await api.contacts.import(payload);
      // backend returns data.created (number created)
      const created =
        (result && result.created) ||
        (result && result.data && result.data.created) ||
        null;

      toast({
        title: `Imported ${created ?? contactsPayload.length} contacts`,
      });
      setImportOpen(false);
      setImportFile(null);
      setSelectedCampaignForImport(null);
      refreshContacts();
      if (selectedCampaignForImport) refreshCampaigns();
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to import CSV", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Phone Number",
      "First Name",
      "Last Name",
      "Email",
      "Status",
      "Created",
    ];
    const rows = contacts.map((c) => [
      c.phoneNumber,
      c.firstName || "",
      c.lastName || "",
      c.email || "",
      c.status || "NEW",
      new Date(c.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Contacts exported successfully" });
  };

  const openEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      phoneNumber: contact.phoneNumber,
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
    });
    setEditOpen(true);
  };

  const openDelete = (contact: Contact) => {
    setSelectedContact(contact);
    setDeleteOpen(true);
  };

  const openAddToCampaign = (contact: Contact) => {
    setSelectedContact(contact);
    setAddToCampaignOpen(true);
  };

  const renderContactsTable = (
    contactList: Contact[],
    showCampaignAction = false,
    page?: number,
  ) => {
    const filtered = filteredContacts(contactList);

    const currentPage = page && page > 0 ? page : 1;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize,
    );

    if (filtered.length === 0) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery
            ? "No contacts match your search."
            : "No contacts in this section."}
        </div>
      );
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Contacted</TableHead>
              <TableHead>Created</TableHead>
              {canManage && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {contact.firstName || contact.lastName
                        ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                        : "—"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {contact.phoneNumber}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.email || "—"}
                </TableCell>

                <TableCell>
                  <Badge
                    variant={
                      contact.status === "CONSENTED"
                        ? "success"
                        : contact.status === "DECLINED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {contact.status === "CONSENTED"
                      ? "Consented"
                      : contact.status === "DECLINED"
                        ? "Declined"
                        : contact.status || "NEW"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {contact.lastContactedAt
                    ? formatDistanceToNow(new Date(contact.lastContactedAt), {
                        addSuffix: true,
                      })
                    : "Never"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(new Date(contact.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {showCampaignAction && canAddToCampaign && (
                          <DropdownMenuItem
                            onClick={() => openAddToCampaign(contact)}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add to Campaign
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <DropdownMenuItem onClick={() => openEdit(contact)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => openDelete(contact)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  };

  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Contacts"
            description="Manage your contact database for WhatsApp campaigns."
          >
            <div className="flex gap-2">
              {canManage && contacts.length > 0 && (
                <Button variant="outline" onClick={handleExportCsv}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              )}
              {canManage && (
                <>
                  {canImport && (
                    <Button
                      variant="outline"
                      onClick={() => setImportOpen(true)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                  )}
                  <Button
                    onClick={() => setAddOpen(true)}
                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </>
              )}
            </div>
          </PageHeader>

          {/* Search */}
          {!isLoading && contacts.length > 0 && (
            <div className="max-w-md">
              <Input
                placeholder="Search contacts by name, phone or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Campaign Contacts */}
          {!isLoading && campaigns.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Campaign Contacts</h2>
              {campaigns.map((campaign) => {
                const campContacts = campaignContacts[campaign.id] || [];
                const isExpanded = expandedCampaigns.has(campaign.id);

                return (
                  <Card key={campaign.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCampaign(campaign.id)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Send className="h-4 w-4" />
                              {campaign.name}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {campContacts.length} contact
                              {campContacts.length !== 1 ? "s" : ""} •{" "}
                              {campaign.status}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant={
                            campaign.status === "COMPLETED"
                              ? "success"
                              : campaign.status === "SENDING"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="rounded-lg border">
                          {campContacts.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                              No contacts in this campaign
                            </div>
                          ) : (
                            <>
                              {renderContactsTable(
                                campContacts,
                                false,
                                campaignPages[campaign.id] || 1,
                              )}

                              {getTotalPages(campContacts) > 1 && (
                                <div className="flex items-center justify-end gap-2 p-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setCampaignPages((p) => ({
                                        ...p,
                                        [campaign.id]: Math.max(
                                          1,
                                          (p[campaign.id] || 1) - 1,
                                        ),
                                      }))
                                    }
                                  >
                                    Prev
                                  </Button>
                                  <div className="text-sm text-muted-foreground">
                                    Page {campaignPages[campaign.id] || 1} of{" "}
                                    {getTotalPages(campContacts)}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setCampaignPages((p) => ({
                                        ...p,
                                        [campaign.id]: Math.min(
                                          getTotalPages(campContacts),
                                          (p[campaign.id] || 1) + 1,
                                        ),
                                      }))
                                    }
                                  >
                                    Next
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Standalone Contacts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Standalone Contacts</h2>
              <span className="text-sm text-muted-foreground">
                {standaloneContacts.length} contact
                {standaloneContacts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="rounded-xl border bg-card">
              {isLoading ? (
                <div className="p-6">
                  <TableSkeleton rows={5} columns={6} />
                </div>
              ) : contacts.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No contacts yet"
                  description="Add your first contact to start building your database."
                  action={
                    canManage
                      ? {
                          label: "Add Contact",
                          onClick: () => setAddOpen(true),
                        }
                      : undefined
                  }
                />
              ) : standaloneContacts.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground">
                    All contacts are assigned to campaigns.
                  </p>
                </div>
              ) : (
                <>
                  {renderContactsTable(
                    standaloneContacts,
                    true,
                    standalonePage,
                  )}

                  {getTotalPages(standaloneContacts) > 1 && (
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="text-sm text-muted-foreground">
                        Showing page {standalonePage} of{" "}
                        {getTotalPages(standaloneContacts)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setStandalonePage((p) => Math.max(1, p - 1))
                          }
                        >
                          Prev
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setStandalonePage((p) =>
                              Math.min(
                                getTotalPages(standaloneContacts),
                                p + 1,
                              ),
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add Contact Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
              <DialogDescription>
                Add a new contact to your database.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+1234567890"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phoneNumber: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, firstName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign">Campaign (optional)</Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setSelectedCampaignForAdd(null)}
                  >
                    {selectedCampaignForAdd ? (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {selectedCampaignForAdd.name}
                      </>
                    ) : (
                      "No campaign - add as standalone contact"
                    )}
                  </Button>
                  {campaigns.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                      {campaigns.map((campaign) => (
                        <Button
                          key={campaign.id}
                          type="button"
                          variant={
                            selectedCampaignForAdd?.id === campaign.id
                              ? "default"
                              : "ghost"
                          }
                          className="w-full justify-start text-sm"
                          onClick={() => setSelectedCampaignForAdd(campaign)}
                        >
                          <Send className="mr-2 h-3 w-3" />
                          <div className="flex-1 text-left">
                            <div>{campaign.name}</div>
                            <div className="text-xs opacity-70">
                              {campaign.status}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.phoneNumber || isSaving}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Contact"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Contact Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>Update contact information.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber">Phone Number *</Label>
                <Input
                  id="edit-phoneNumber"
                  placeholder="+1234567890"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phoneNumber: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, firstName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={!formData.phoneNumber || isSaving}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Contacts from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file with columns: phoneNumber, firstName,
                lastName, email
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  File should have headers: phoneNumber (required), firstName,
                  lastName, email
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-campaign">Campaign (optional)</Label>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setSelectedCampaignForImport(null)}
                  >
                    {selectedCampaignForImport ? (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        {selectedCampaignForImport.name}
                      </>
                    ) : (
                      "No campaign - import as standalone contacts"
                    )}
                  </Button>
                  {campaigns.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                      {campaigns.map((campaign) => (
                        <Button
                          key={campaign.id}
                          type="button"
                          variant={
                            selectedCampaignForImport?.id === campaign.id
                              ? "default"
                              : "ghost"
                          }
                          className="w-full justify-start text-sm"
                          onClick={() => setSelectedCampaignForImport(campaign)}
                        >
                          <Send className="mr-2 h-3 w-3" />
                          <div className="flex-1 text-left">
                            <div>{campaign.name}</div>
                            <div className="text-xs opacity-70">
                              {campaign.status}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || isImporting}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                {selectedContact?.firstName || selectedContact?.lastName
                  ? `${selectedContact?.firstName || ""} ${selectedContact?.lastName || ""}`.trim()
                  : selectedContact?.phoneNumber}
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add to Campaign Dialog */}
        <Dialog open={addToCampaignOpen} onOpenChange={setAddToCampaignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact to Campaign</DialogTitle>
              <DialogDescription>
                Select a campaign to add{" "}
                {selectedContact?.firstName || selectedContact?.lastName
                  ? `${selectedContact?.firstName || ""} ${selectedContact?.lastName || ""}`.trim()
                  : selectedContact?.phoneNumber}{" "}
                to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-select">Campaign</Label>
                <div className="space-y-2">
                  {campaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No campaigns available. Create a campaign first.
                    </p>
                  ) : (
                    campaigns.map((campaign) => (
                      <Button
                        key={campaign.id}
                        variant={
                          selectedCampaign?.id === campaign.id
                            ? "default"
                            : "outline"
                        }
                        className="w-full justify-start"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{campaign.name}</div>
                          <div className="text-xs opacity-70">
                            {campaign.status}
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddToCampaignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddToCampaign}
                disabled={!selectedCampaign || isAddingToCampaign}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {isAddingToCampaign ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add to Campaign
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
