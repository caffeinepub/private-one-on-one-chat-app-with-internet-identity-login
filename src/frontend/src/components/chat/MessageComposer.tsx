import { useState } from 'react';
import { useSendMessage } from '../../hooks/useMessages';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import type { ThreadId } from '../../backend';

interface MessageComposerProps {
  threadId: ThreadId;
  isDisabled?: boolean;
  disabledReason?: string;
}

export default function MessageComposer({ threadId, isDisabled = false, disabledReason }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sendMessage = useSendMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isDisabled) return;

    setError(null);
    const messageContent = content;

    try {
      await sendMessage.mutateAsync({ threadId, content: messageContent });
      setContent('');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to send message';
      setError(errorMessage);
      setContent(messageContent);
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="space-y-2">
      {disabledReason && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{disabledReason}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          disabled={isDisabled || sendMessage.isPending}
          className="flex-1 text-sm sm:text-base"
        />
        <Button
          type="submit"
          disabled={!content.trim() || isDisabled || sendMessage.isPending}
          size="default"
          className="h-10 px-4 sm:h-10 sm:px-4"
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
