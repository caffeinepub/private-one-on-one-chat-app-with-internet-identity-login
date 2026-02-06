import { useState } from 'react';
import { useSearchChatUsers } from '../../hooks/useUsers';
import { useCreateThread } from '../../hooks/useThreads';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Search, X, User, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import type { ThreadId } from '../../backend';

interface UserSearchStartChatProps {
  onThreadCreated: (threadId: ThreadId) => void;
  onCancel: () => void;
}

export default function UserSearchStartChat({ onThreadCreated, onCancel }: UserSearchStartChatProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: users = [], isLoading, error } = useSearchChatUsers(searchTerm);
  const createThread = useCreateThread();
  const [creatingForUser, setCreatingForUser] = useState<string | null>(null);

  const handleStartChat = async (userPrincipal: string) => {
    setCreatingForUser(userPrincipal);
    
    try {
      const threadId = await createThread.mutateAsync([userPrincipal]);
      onThreadCreated(threadId);
      toast.success('Chat started successfully');
    } catch (error: any) {
      console.error('Failed to create thread:', error);
      const errorMessage = error?.message || 'Failed to start chat. Please try again.';
      toast.error(errorMessage);
    } finally {
      setCreatingForUser(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Start a New Chat</h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or principal..."
            className="pl-9"
            autoFocus
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load users. Please check your access permissions and try again.
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'No users found' : 'No other users available to chat with'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => {
                const displayName = user.displayName || 'Anonymous';
                const initials = displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const isCreating = creatingForUser === user.principal.toString();

                return (
                  <button
                    key={user.principal.toString()}
                    onClick={() => handleStartChat(user.principal.toString())}
                    disabled={isCreating || createThread.isPending}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {initials || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate font-medium">{displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {user.principal.toString().slice(0, 20)}...
                      </div>
                    </div>
                    {isCreating && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
