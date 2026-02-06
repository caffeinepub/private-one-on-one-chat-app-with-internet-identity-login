import { useState } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useGetChatUsers, useGetAllUsers } from '../../hooks/useUsers';
import { useIsCallerAdmin } from '../../hooks/useAccessControl';
import { copyToClipboard } from '../../utils/clipboard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Copy, Check, User } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { identity } = useInternetIdentity();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: chatUsers = [], isLoading: chatUsersLoading } = useGetChatUsers();
  const { data: allUsers = [], isLoading: allUsersLoading } = useGetAllUsers();
  const [copiedPrincipal, setCopiedPrincipal] = useState<string | null>(null);

  const currentPrincipal = identity?.getPrincipal().toString() || '';

  const handleCopy = async (principal: string, label: string) => {
    try {
      await copyToClipboard(principal);
      setCopiedPrincipal(principal);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedPrincipal(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Determine which user list to show
  const usersToDisplay = isAdmin ? allUsers : chatUsers;
  const isLoadingUsers = isAdmin ? allUsersLoading : chatUsersLoading;

  // Filter out current user from the list
  const otherUsers = usersToDisplay.filter(
    (user) => user.principal.toString() !== currentPrincipal
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            View your principal and other users in the system
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Current User Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Your Principal</h3>
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium">You</span>
                    </div>
                    <code className="text-xs break-all block text-muted-foreground">
                      {currentPrincipal}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(currentPrincipal, 'Your principal')}
                    className="flex-shrink-0"
                  >
                    {copiedPrincipal === currentPrincipal ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Other Users Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                {isAdmin ? 'All Users' : 'Authorized Users'}
              </h3>
              
              {isLoadingUsers ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Loading users...
                </div>
              ) : otherUsers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No other users found
                </div>
              ) : (
                <div className="space-y-2">
                  {otherUsers.map((user) => {
                    const principalString = user.principal.toString();
                    return (
                      <div
                        key={principalString}
                        className="rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium">
                                {user.displayName || 'Anonymous User'}
                              </span>
                            </div>
                            <code className="text-xs break-all block text-muted-foreground">
                              {principalString}
                            </code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleCopy(
                                principalString,
                                user.displayName
                                  ? `${user.displayName}'s principal`
                                  : 'Principal'
                              )
                            }
                            className="flex-shrink-0"
                          >
                            {copiedPrincipal === principalString ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
