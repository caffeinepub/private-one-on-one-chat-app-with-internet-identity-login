import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useHasAccess } from './useAccessEntitlement';
import type { ThreadId, MessageId } from '../backend';

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: hasAccess } = useHasAccess();

  return useMutation({
    mutationFn: async ({ threadId, content }: { threadId: ThreadId; content: string }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasAccess) {
        throw new Error('You do not have access to send messages. Please contact the administrator.');
      }
      return actor.sendMessage(threadId, content);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.threadId.toString()] });
    },
  });
}

export function useEditMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: hasAccess } = useHasAccess();

  return useMutation({
    mutationFn: async ({
      threadId,
      messageId,
      newContent,
    }: {
      threadId: ThreadId;
      messageId: MessageId;
      newContent: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasAccess) {
        throw new Error('You do not have access to edit messages. Please contact the administrator.');
      }
      return actor.editMessage(threadId, messageId, newContent);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.threadId.toString()] });
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: hasAccess } = useHasAccess();

  return useMutation({
    mutationFn: async ({ threadId, messageId }: { threadId: ThreadId; messageId: MessageId }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasAccess) {
        throw new Error('You do not have access to delete messages. Please contact the administrator.');
      }
      return actor.deleteMessage(threadId, messageId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.threadId.toString()] });
    },
  });
}
