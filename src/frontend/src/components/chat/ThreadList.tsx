import { useGetUserThreads } from '../../hooks/useThreads';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Loader2, User } from 'lucide-react';
import type { ThreadId } from '../../backend';
import { useMemo, useEffect } from 'react';

interface ThreadListProps {
  selectedThreadId: ThreadId | null;
  onSelectThread: (threadId: ThreadId) => void;
}

export default function ThreadList({ selectedThreadId, onSelectThread }: ThreadListProps) {
  const { data: threadIds = [], isLoading: threadsLoading } = useGetUserThreads();

  const threadsWithUsers = useMemo(() => {
    return threadIds.map((threadId) => {
      return {
        threadId,
        displayName: `Chat ${threadId}`,
        initials: 'C',
      };
    });
  }, [threadIds]);

  // Clear selection if the selected thread is no longer in the list
  useEffect(() => {
    if (selectedThreadId && !threadIds.some((id) => id.toString() === selectedThreadId.toString())) {
      onSelectThread(null as any);
    }
  }, [threadIds, selectedThreadId, onSelectThread]);

  if (threadsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (threadIds.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-center text-sm text-muted-foreground">No chats yet. Start a new conversation!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {threadsWithUsers.map(({ threadId, displayName, initials }) => {
          const isSelected = selectedThreadId?.toString() === threadId.toString();

          return (
            <button
              key={threadId.toString()}
              onClick={() => onSelectThread(threadId)}
              className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors sm:p-3 ${
                isSelected ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <Avatar className="h-10 w-10 sm:h-10 sm:w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium sm:text-base">{displayName}</div>
                <div className="truncate text-xs text-muted-foreground">Click to open</div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
