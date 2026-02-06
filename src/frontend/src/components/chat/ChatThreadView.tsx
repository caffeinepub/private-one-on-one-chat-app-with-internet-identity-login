import { useGetThread, useGetMessages, useDeleteThread } from '../../hooks/useThreads';
import { useGetUserProfile } from '../../hooks/useUsers';
import { useCurrentPrincipal } from '../../hooks/useCurrentUserProfile';
import { useHasBlocked, useBlockUser, useUnblockUser } from '../../hooks/useBlocking';
import MessageComposer from './MessageComposer';
import MessageItem from './MessageItem';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
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
import { Loader2, MoreVertical, Trash2, Ban, ShieldOff, ArrowLeft } from 'lucide-react';
import type { ThreadId, UserId } from '../../backend';
import { useMemo, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ChatThreadViewProps {
  threadId: ThreadId;
  onThreadDeleted: () => void;
  onBack?: () => void;
}

export default function ChatThreadView({ threadId, onThreadDeleted, onBack }: ChatThreadViewProps) {
  const { data: thread, isLoading: threadLoading } = useGetThread(threadId);
  const { data: messages = [], isLoading: messagesLoading } = useGetMessages(threadId);
  const currentPrincipal = useCurrentPrincipal();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get the other participant's principal
  const otherParticipantPrincipal: UserId | null = useMemo(() => {
    if (!thread || !currentPrincipal) return null;
    return thread.participants.find((p) => p.toString() !== currentPrincipal) || null;
  }, [thread, currentPrincipal]);

  // Fetch only the other participant's profile on-demand
  const { data: otherParticipantProfile } = useGetUserProfile(
    otherParticipantPrincipal?.toString() || null
  );

  const { data: hasBlocked = false, isLoading: blockStatusLoading } = useHasBlocked(otherParticipantPrincipal);
  const deleteThread = useDeleteThread();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();

  // Compute chat title with fallback
  const chatTitle = useMemo(() => {
    if (otherParticipantProfile?.displayName) {
      return otherParticipantProfile.displayName;
    }
    if (otherParticipantPrincipal) {
      const principalStr = otherParticipantPrincipal.toString();
      // Show shortened principal as fallback
      return principalStr.length > 12 ? `${principalStr.slice(0, 8)}...${principalStr.slice(-4)}` : principalStr;
    }
    return 'Chat';
  }, [otherParticipantProfile, otherParticipantPrincipal]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDeleteThread = async () => {
    try {
      await deleteThread.mutateAsync(threadId);
      toast.success('Chat deleted successfully');
      onThreadDeleted();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete chat';
      toast.error(errorMessage);
      console.error('Failed to delete thread:', error);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleBlockUser = async () => {
    if (!otherParticipantPrincipal) return;
    try {
      await blockUser.mutateAsync(otherParticipantPrincipal);
      toast.success(`${chatTitle} has been blocked`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to block user';
      toast.error(errorMessage);
      console.error('Failed to block user:', error);
    }
  };

  const handleUnblockUser = async () => {
    if (!otherParticipantPrincipal) return;
    try {
      await unblockUser.mutateAsync(otherParticipantPrincipal);
      toast.success(`${chatTitle} has been unblocked`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to unblock user';
      toast.error(errorMessage);
      console.error('Failed to unblock user:', error);
    }
  };

  if (threadLoading || messagesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isBlocking = hasBlocked;
  const isComposerDisabled = isBlocking;
  const disabledReason = isBlocking ? 'You have blocked this user. Unblock to send messages.' : undefined;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b bg-card px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="truncate text-base font-semibold sm:text-lg">{chatTitle}</h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!blockStatusLoading && (
              <>
                {hasBlocked ? (
                  <DropdownMenuItem onClick={handleUnblockUser} disabled={unblockUser.isPending}>
                    <ShieldOff className="mr-2 h-4 w-4" />
                    {unblockUser.isPending ? 'Unblocking...' : 'Unblock user'}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleBlockUser} disabled={blockUser.isPending}>
                    <Ban className="mr-2 h-4 w-4" />
                    {blockUser.isPending ? 'Blocking...' : 'Block user'}
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 sm:px-6" ref={scrollRef}>
        <div className="space-y-3 py-3 sm:space-y-4 sm:py-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem key={message.id.toString()} message={message} threadId={threadId} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Message Composer */}
      <div className="border-t bg-card p-3 sm:p-4">
        <MessageComposer threadId={threadId} isDisabled={isComposerDisabled} disabledReason={disabledReason} />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat for all participants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteThread} disabled={deleteThread.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteThread.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
