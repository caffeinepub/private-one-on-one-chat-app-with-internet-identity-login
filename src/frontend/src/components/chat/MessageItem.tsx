import { useState } from 'react';
import { useEditMessage, useDeleteMessage } from '../../hooks/useMessages';
import { useCurrentPrincipal } from '../../hooks/useCurrentUserProfile';
import { useListUsers } from '../../hooks/useUsers';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Pencil, Trash2, Check, X, User } from 'lucide-react';
import type { ChatMessage, ThreadId } from '../../backend';
import { useMemo } from 'react';

interface MessageItemProps {
  message: ChatMessage;
  threadId: ThreadId;
}

export default function MessageItem({ message, threadId }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const currentPrincipal = useCurrentPrincipal();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const { data: users = [] } = useListUsers();

  const isOwnMessage = currentPrincipal === message.sender.toString();

  const sender = useMemo(() => {
    return users.find((u) => u.principal.toString() === message.sender.toString());
  }, [users, message.sender]);

  const senderName = sender?.displayName || 'Anonymous';
  const initials = senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleEdit = async () => {
    if (!editContent.trim() || editMessage.isPending) return;

    try {
      await editMessage.mutateAsync({
        threadId,
        messageId: message.id,
        newContent: editContent.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDelete = async () => {
    if (deleteMessage.isPending) return;

    try {
      await deleteMessage.mutateAsync({
        threadId,
        messageId: message.id,
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  if (message.deleted) {
    return (
      <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted text-muted-foreground">
            {initials || <User className="h-3 w-3" />}
          </AvatarFallback>
        </Avatar>
        <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
          <div className="mb-1 text-xs text-muted-foreground">{senderName}</div>
          <div className="inline-block rounded-lg bg-muted px-4 py-2 text-sm italic text-muted-foreground">
            Message deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className={isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {initials || <User className="h-3 w-3" />}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
        <div className="mb-1 text-xs text-muted-foreground">{senderName}</div>
        {isEditing ? (
          <div className="inline-flex items-center gap-2">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleEdit}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="group inline-block">
            <div
              className={`rounded-lg px-4 py-2 ${
                isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              <p className="text-sm">{message.content}</p>
            </div>
            {isOwnMessage && (
              <div className="mt-1 inline-flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setIsEditing(true)}
                  title="Edit message"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={handleDelete}
                  title="Delete message"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
