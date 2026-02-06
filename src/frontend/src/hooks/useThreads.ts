import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { useHasAccess } from './useAccessEntitlement';
import type { ChatThreadView, ThreadId, ChatMessage } from '../backend';
import { Principal } from '@dfinity/principal';

export function useGetUserThreads() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const { data: hasAccess } = useHasAccess();

  return useQuery<ThreadId[]>({
    queryKey: ['userThreads'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getUserThreads();
    },
    enabled: !!actor && !actorFetching && !!identity && hasAccess === true,
  });
}

export function useGetThread(threadId: ThreadId | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const { data: hasAccess } = useHasAccess();

  return useQuery<ChatThreadView | null>({
    queryKey: ['thread', threadId?.toString()],
    queryFn: async () => {
      if (!actor || threadId === null) return null;
      return actor.getThread(threadId);
    },
    enabled: !!actor && !actorFetching && !!identity && threadId !== null && hasAccess === true,
  });
}

export function useGetMessages(threadId: ThreadId | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const { data: hasAccess } = useHasAccess();

  return useQuery<ChatMessage[]>({
    queryKey: ['messages', threadId?.toString()],
    queryFn: async () => {
      if (!actor || threadId === null) return [];
      return actor.getMessages(threadId);
    },
    enabled: !!actor && !actorFetching && !!identity && threadId !== null && hasAccess === true,
    refetchInterval: 3000, // Poll for new messages every 3 seconds
  });
}

export function useCreateThread() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participants: string[]) => {
      if (!actor) throw new Error('Actor not available');
      const principals = participants.map((p) => Principal.fromText(p));
      return actor.createThread(principals);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userThreads'] });
    },
  });
}

export function useDeleteThread() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: ThreadId) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteThread(threadId);
    },
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({ queryKey: ['userThreads'] });
      queryClient.invalidateQueries({ queryKey: ['thread', threadId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['messages', threadId.toString()] });
    },
  });
}
