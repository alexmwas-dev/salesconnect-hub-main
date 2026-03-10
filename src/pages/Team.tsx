import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Users,
  Plus,
  MoreHorizontal,
  Mail,
  Shield,
  Trash2,
  Loader2,
} from "lucide-react";
import { TeamMember, UserRole } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";

const roleLabels: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  SALES_REP: "Sales Rep",
};

const roleVariants: Record<UserRole, "brand" | "info" | "default"> = {
  OWNER: "brand",
  ADMIN: "info",
  SALES_REP: "default",
};

export default function Team() {
  const { team, isLoading, refreshTeam } = useOrganization();
  const { hasRole, user } = useAuth();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("SALES_REP");
  const [isInviting, setIsInviting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  const canManageTeam = hasRole(["OWNER", "ADMIN"]);
  const isOwner = hasRole(["OWNER"]);

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      await api.team.invite({
        email: inviteEmail,
        role: inviteRole,
        name: inviteName,
        phone: inviteRole === "SALES_REP" ? invitePhone : undefined,
      });
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${inviteEmail}`,
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePhone("");
      setInviteRole("SALES_REP");
      refreshTeam();
    } catch (error) {
      toast({
        title: "Failed to send invitation",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    try {
      await api.team.updateRole(memberId, newRole);
      toast({
        title: "Role updated",
        description: "Team member role has been updated.",
      });
      refreshTeam();
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    try {
      await api.team.remove(deleteTarget.userId);
      toast({
        title: "Member removed",
        description: `${deleteTarget.firstName} has been removed from the team.`,
      });
      setDeleteTarget(null);
      refreshTeam();
    } catch (error) {
      toast({
        title: "Failed to remove member",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Team"
            description="Manage your organization's team members and their roles."
          >
            {canManageTeam && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-brand text-brand-foreground hover:bg-brand-hover">
                    <Plus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite team member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your organization.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Alex Johnson"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    {inviteRole === "SALES_REP" && (
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={invitePhone}
                          onChange={(e) => setInvitePhone(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(v) => setInviteRole(v as UserRole)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {isOwner && (
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          )}
                          <SelectItem value="SALES_REP">Sales Rep</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {inviteRole === "ADMIN"
                          ? "Admins can manage team members and settings."
                          : "Sales reps can send messages and manage campaigns."}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setInviteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={
                        !inviteName ||
                        !inviteEmail ||
                        (inviteRole === "SALES_REP" && !invitePhone) ||
                        isInviting
                      }
                      className="bg-brand text-brand-foreground hover:bg-brand-hover"
                    >
                      {isInviting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </PageHeader>

          {/* Team Table */}
          <div className="rounded-xl border bg-card">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={4} columns={5} />
              </div>
            ) : team.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No team members"
                description="Invite your first team member to get started."
                action={
                  canManageTeam
                    ? {
                        label: "Invite Member",
                        onClick: () => setInviteOpen(true),
                      }
                    : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {member.firstName[0]}
                              {member.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.firstName} {member.lastName}
                              {member.userId === user?.id && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (You)
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={roleVariants[member.role]}>
                          {roleLabels[member.role]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={
                            member.status === "ACTIVE" ? "success" : "warning"
                          }
                          dot
                        >
                          {member.status === "ACTIVE" ? "Active" : "Pending"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(member.joinedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        {canManageTeam &&
                          member.role !== "OWNER" &&
                          member.userId !== user?.id && (
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
                                {isOwner && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleRoleChange(
                                          member.userId,
                                          member.role === "ADMIN"
                                            ? "SALES_REP"
                                            : "ADMIN",
                                        )
                                      }
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      Make{" "}
                                      {member.role === "ADMIN"
                                        ? "Sales Rep"
                                        : "Admin"}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(member)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Member
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

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove team member?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {deleteTarget?.firstName}{" "}
                {deleteTarget?.lastName} from your organization? They will lose
                access immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </AppLayout>
  );
}
