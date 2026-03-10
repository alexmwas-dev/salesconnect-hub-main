import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout, PageContainer } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Phone,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  XCircle,
  Star,
  Loader2,
} from 'lucide-react';
import { WhatsAppNumber } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function WhatsAppNumbers() {
  const { whatsappNumbers, isLoading, refreshWhatsAppNumbers } = useOrganization();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WhatsAppNumber | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppNumber | null>(null);
  const [formData, setFormData] = useState({ phoneNumber: '', displayName: '', token: '' });
  const [isSaving, setIsSaving] = useState(false);

  const canManage = hasRole(['OWNER', 'ADMIN']);

  const resetForm = () => {
    setFormData({ phoneNumber: '', displayName: '', token: '' });
  };

  const handleAdd = async () => {
    setIsSaving(true);
    try {
      // await api.whatsappNumbers.create(formData);
      await new Promise((r) => setTimeout(r, 1000));
      toast({ title: 'Number added', description: 'WhatsApp number has been added.' });
      setAddOpen(false);
      resetForm();
      refreshWhatsAppNumbers();
    } catch (error) {
      toast({ title: 'Failed to add number', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      // await api.whatsappNumbers.update(editTarget.id, { displayName: formData.displayName, token: formData.token });
      await new Promise((r) => setTimeout(r, 1000));
      toast({ title: 'Number updated' });
      setEditTarget(null);
      resetForm();
      refreshWhatsAppNumbers();
    } catch (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (number: WhatsAppNumber) => {
    try {
      // await api.whatsappNumbers.toggle(number.id);
      toast({
        title: number.isActive ? 'Number deactivated' : 'Number activated',
      });
      refreshWhatsAppNumbers();
    } catch (error) {
      toast({ title: 'Failed to toggle status', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // await api.whatsappNumbers.delete(deleteTarget.id);
      toast({ title: 'Number removed' });
      setDeleteTarget(null);
      refreshWhatsAppNumbers();
    } catch (error) {
      toast({ title: 'Failed to remove number', variant: 'destructive' });
    }
  };

  const openEdit = (number: WhatsAppNumber) => {
    setFormData({ phoneNumber: number.phoneNumber, displayName: number.displayName, token: '' });
    setEditTarget(number);
  };

  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="WhatsApp Numbers"
            description="Manage your WhatsApp Business numbers and their settings."
          >
            {canManage && (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-brand text-brand-foreground hover:bg-brand-hover">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Number
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add WhatsApp Number</DialogTitle>
                    <DialogDescription>
                      Connect a new WhatsApp Business number to your organization.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        placeholder="+1 555 0100"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData((p) => ({ ...p, phoneNumber: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        placeholder="Sales Primary"
                        value={formData.displayName}
                        onChange={(e) => setFormData((p) => ({ ...p, displayName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="token">API Token (optional)</Label>
                      <Input
                        id="token"
                        type="password"
                        placeholder="••••••••"
                        value={formData.token}
                        onChange={(e) => setFormData((p) => ({ ...p, token: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAdd}
                      disabled={!formData.phoneNumber || !formData.displayName || isSaving}
                      className="bg-brand text-brand-foreground hover:bg-brand-hover"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Number'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </PageHeader>

          {/* Numbers Grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6 h-48" />
                </Card>
              ))}
            </div>
          ) : whatsappNumbers.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No WhatsApp numbers"
              description="Add your first WhatsApp Business number to start messaging."
              action={canManage ? { label: 'Add Number', onClick: () => setAddOpen(true) } : undefined}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {whatsappNumbers.map((number) => (
                <Card key={number.id} className="relative overflow-hidden">
                  {number.isPrimary && (
                    <div className="absolute top-3 right-3">
                      <StatusBadge variant="brand">
                        <Star className="h-3 w-3 mr-1" /> Primary
                      </StatusBadge>
                    </div>
                  )}
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-brand/10 p-2.5">
                          <Phone className="h-5 w-5 text-brand" />
                        </div>
                        <div>
                          <p className="font-medium">{number.displayName}</p>
                          <p className="text-sm text-muted-foreground">{number.phoneNumber}</p>
                        </div>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(number)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(number)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-lg font-semibold">{number.messagesSent.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Sent</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-lg font-semibold">{number.messagesReceived.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Received</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        {number.wabaConnected ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-muted-foreground">WABA</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {number.webhookConfigured ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-muted-foreground">Webhook</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={number.isActive}
                          onCheckedChange={() => handleToggle(number)}
                          disabled={!canManage}
                        />
                        <span className="text-sm text-muted-foreground">
                          {number.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {number.lastActiveAt && (
                        <p className="text-xs text-muted-foreground">
                          Last active {formatDistanceToNow(new Date(number.lastActiveAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit WhatsApp Number</DialogTitle>
              <DialogDescription>Update the display name or API token.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={formData.phoneNumber} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDisplayName">Display Name</Label>
                <Input
                  id="editDisplayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData((p) => ({ ...p, displayName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editToken">API Token</Label>
                <Input
                  id="editToken"
                  type="password"
                  placeholder="Leave empty to keep current token"
                  value={formData.token}
                  onChange={(e) => setFormData((p) => ({ ...p, token: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={!formData.displayName || isSaving}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove WhatsApp Number?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {deleteTarget?.displayName} ({deleteTarget?.phoneNumber})? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Number
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </AppLayout>
  );
}
