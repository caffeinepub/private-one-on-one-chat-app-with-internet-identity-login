import { useState } from 'react';
import {
  useGetAllAccessEntitlements,
  useGrantAccess,
  useRevokeAccess,
  useApproveAccessRequest,
  getEntitlementStatus,
} from '../../hooks/useAccessControl';
import { useGetAllUsers } from '../../hooks/useUsers';
import { useCreateThread } from '../../hooks/useThreads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, Ban, UserPlus, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { EntitlementType, EntitlementSource, AccessRequestStatus } from '../../backend';
import { ScrollArea } from '../ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import type { ThreadId } from '../../backend';

interface AccessManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartChat?: (threadId: ThreadId) => void;
}

export default function AccessManagementDialog({ open, onOpenChange, onStartChat }: AccessManagementDialogProps) {
  const { data: entitlements, isLoading: entitlementsLoading } = useGetAllAccessEntitlements();
  const { data: users, isLoading: usersLoading } = useGetAllUsers();
  const grantAccessMutation = useGrantAccess();
  const revokeAccessMutation = useRevokeAccess();
  const approveRequestMutation = useApproveAccessRequest();
  const createThreadMutation = useCreateThread();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [grantType, setGrantType] = useState<'permanent' | 'temporary'>('permanent');
  const [durationDays, setDurationDays] = useState<string>('30');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);
  const [startingChatForUser, setStartingChatForUser] = useState<string | null>(null);

  const isLoading = entitlementsLoading || usersLoading;

  const handleGrantAccess = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    try {
      const durationSeconds =
        grantType === 'permanent' ? null : BigInt(parseInt(durationDays) * 24 * 60 * 60 * 1_000_000_000);

      await grantAccessMutation.mutateAsync({
        user: selectedUser,
        entitlementType: grantType === 'permanent' ? EntitlementType.permanent : EntitlementType.trial,
        source: EntitlementSource.adminGrant,
        durationSeconds,
      });

      toast.success('Access granted successfully');
      setSelectedUser(null);
      setGrantType('permanent');
      setDurationDays('30');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to grant access');
    }
  };

  const handleRevokeAccess = async (userPrincipal: string) => {
    try {
      await revokeAccessMutation.mutateAsync(userPrincipal);
      toast.success('Access revoked successfully');
      setShowRevokeConfirm(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revoke access');
    }
  };

  const handleApproveRequest = async (userPrincipal: string, approve: boolean) => {
    try {
      await approveRequestMutation.mutateAsync({ user: userPrincipal, approve });
      toast.success(approve ? 'Access request approved' : 'Access request rejected');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to process request');
    }
  };

  const handleStartChat = async (userPrincipal: string) => {
    // Check if user has approved access
    const userEntitlement = entitlements?.find((e) => e.user.toString() === userPrincipal);
    if (!userEntitlement || userEntitlement.status !== AccessRequestStatus.approved) {
      toast.error('Cannot start chat: User does not have approved access');
      return;
    }

    // Check if access is expired
    if (userEntitlement.endTime && Number(userEntitlement.endTime) < Date.now() * 1_000_000) {
      toast.error('Cannot start chat: User access has expired');
      return;
    }

    setStartingChatForUser(userPrincipal);

    try {
      const threadId = await createThreadMutation.mutateAsync([userPrincipal]);
      toast.success('Chat started successfully');
      if (onStartChat) {
        onStartChat(threadId);
      }
    } catch (error: any) {
      console.error('Failed to start chat:', error);
      const errorMessage = error?.message || 'Failed to start chat. Please try again.';
      toast.error(errorMessage);
    } finally {
      setStartingChatForUser(null);
    }
  };

  const getStatusBadge = (entitlement: any) => {
    const status = getEntitlementStatus(entitlement);

    switch (status.status) {
      case 'authorized':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {status.label}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <Ban className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <XCircle className="mr-1 h-3 w-3" />
            Not authorized
          </Badge>
        );
    }
  };

  const getUserDisplayName = (principal: string) => {
    const user = users?.find((u) => u.principal.toString() === principal);
    return user?.displayName || principal.slice(0, 8) + '...';
  };

  // Create a map of users with their entitlements
  const usersWithEntitlements = users?.map((user) => {
    const entitlement = entitlements?.find((e) => e.user.toString() === user.principal.toString());
    return {
      principal: user.principal.toString(),
      displayName: user.displayName || 'Unknown',
      entitlement,
    };
  });

  // Filter pending requests
  const pendingRequests = usersWithEntitlements?.filter(
    (u) => u.entitlement?.status === AccessRequestStatus.pending
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Access Management</DialogTitle>
            <DialogDescription>
              Manage user access to chat features. Grant, revoke, or approve access requests.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pending Requests Section */}
              {pendingRequests && pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Pending Access Requests</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.map((user) => (
                          <TableRow key={user.principal}>
                            <TableCell className="font-medium">{user.displayName}</TableCell>
                            <TableCell>
                              {user.entitlement?.requestTimestamp
                                ? new Date(
                                    Number(user.entitlement.requestTimestamp) / 1_000_000
                                  ).toLocaleString()
                                : 'Unknown'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveRequest(user.principal, true)}
                                  disabled={approveRequestMutation.isPending}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveRequest(user.principal, false)}
                                  disabled={approveRequestMutation.isPending}
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Grant Access Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Grant New Access</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user-select">Select User</Label>
                    <Select value={selectedUser || ''} onValueChange={setSelectedUser}>
                      <SelectTrigger id="user-select">
                        <SelectValue placeholder="Choose a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {usersWithEntitlements?.map((user) => (
                          <SelectItem key={user.principal} value={user.principal}>
                            {user.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="grant-type">Access Type</Label>
                      <Select
                        value={grantType}
                        onValueChange={(value) => setGrantType(value as 'permanent' | 'temporary')}
                      >
                        <SelectTrigger id="grant-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent">Permanent</SelectItem>
                          <SelectItem value="temporary">Time-limited</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {grantType === 'temporary' && (
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (days)</Label>
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          value={durationDays}
                          onChange={(e) => setDurationDays(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleGrantAccess}
                    disabled={!selectedUser || grantAccessMutation.isPending}
                    className="w-full"
                  >
                    {grantAccessMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Granting Access...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Grant Access
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* All Users Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">All Users</h3>
                <ScrollArea className="h-[300px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersWithEntitlements?.map((user) => {
                        const isStartingChat = startingChatForUser === user.principal;
                        const isApproved = user.entitlement?.status === AccessRequestStatus.approved;
                        
                        return (
                          <TableRow key={user.principal}>
                            <TableCell className="font-medium">{user.displayName}</TableCell>
                            <TableCell>{getStatusBadge(user.entitlement)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {isApproved && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStartChat(user.principal)}
                                    disabled={isStartingChat || createThreadMutation.isPending}
                                  >
                                    {isStartingChat ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <MessageSquare className="mr-1 h-3 w-3" />
                                    )}
                                    Start Chat
                                  </Button>
                                )}
                                {isApproved && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setShowRevokeConfirm(user.principal)}
                                    disabled={revokeAccessMutation.isPending}
                                  >
                                    <Ban className="mr-1 h-3 w-3" />
                                    Revoke
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!showRevokeConfirm} onOpenChange={() => setShowRevokeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke access for {showRevokeConfirm && getUserDisplayName(showRevokeConfirm)}?
              They will no longer be able to use chat features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showRevokeConfirm && handleRevokeAccess(showRevokeConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
