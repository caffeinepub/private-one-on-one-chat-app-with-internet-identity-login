import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserId } from '../backend';
import { Principal } from '@dfinity/principal';

export function useHasBlocked(otherUser: UserId | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['hasBlocked', otherUser?.toString()],
    queryFn: async () => {
      if (!actor || !otherUser) return false;
      return actor.hasBlocked(otherUser);
    },
    enabled: !!actor && !actorFetching && !!identity && !!otherUser,
  });
}

export function useGetBlockedUsers() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserId[]>({
    queryKey: ['blockedUsers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getBlockedUsers();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useBlockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userToBlock: UserId | string) => {
      if (!actor) throw new Error('Actor not available');
      const principal = typeof userToBlock === 'string' ? Principal.fromText(userToBlock) : userToBlock;
      return actor.blockUser(principal);
    },
    onSuccess: (_, userToBlock) => {
      const principalStr = typeof userToBlock === 'string' ? userToBlock : userToBlock.toString();
      queryClient.invalidateQueries({ queryKey: ['hasBlocked', principalStr] });
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
  });
}

export function useUnblockUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userToUnblock: UserId | string) => {
      if (!actor) throw new Error('Actor not available');
      const principal = typeof userToUnblock === 'string' ? Principal.fromText(userToUnblock) : userToUnblock;
      return actor.unblockUser(principal);
    },
    onSuccess: (_, userToUnblock) => {
      const principalStr = typeof userToUnblock === 'string' ? userToUnblock : userToUnblock.toString();
      queryClient.invalidateQueries({ queryKey: ['hasBlocked', principalStr] });
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
  });
}
