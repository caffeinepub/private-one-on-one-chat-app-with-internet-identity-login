import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { AccessEntitlement } from '../backend';
import { AccessRequestStatus } from '../backend';

export function useHasAccess() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['hasAccess'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasAccess();
    },
    enabled: !!actor && !actorFetching && !!identity,
    refetchInterval: 10000, // Check every 10 seconds for expiry
  });
}

export function useGetCurrentUserAccessEntitlement() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<AccessEntitlement | null>({
    queryKey: ['currentUserAccessEntitlement'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCurrentUserAccessEntitlement();
    },
    enabled: !!actor && !actorFetching && !!identity,
    refetchInterval: 10000, // Check every 10 seconds for status changes
  });
}

export function useRequestAccess() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestAccess();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserAccessEntitlement'] });
      queryClient.invalidateQueries({ queryKey: ['hasAccess'] });
    },
  });
}

export function useRefreshAccess() {
  const queryClient = useQueryClient();

  return () => {
    // Invalidate all access-related queries
    queryClient.invalidateQueries({ queryKey: ['hasAccess'] });
    queryClient.invalidateQueries({ queryKey: ['currentUserAccessEntitlement'] });
    
    // Invalidate chat-related queries when access changes
    queryClient.invalidateQueries({ queryKey: ['userThreads'] });
    queryClient.invalidateQueries({ queryKey: ['thread'] });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  };
}

// Derive UI state from entitlement
export function useAccessState() {
  const { data: hasAccess, isLoading: hasAccessLoading } = useHasAccess();
  const { data: entitlement, isLoading: entitlementLoading } = useGetCurrentUserAccessEntitlement();

  const isLoading = hasAccessLoading || entitlementLoading;

  let state: 'authorized' | 'pending' | 'expired' | 'not_requested' = 'not_requested';

  if (hasAccess) {
    state = 'authorized';
  } else if (entitlement) {
    if (entitlement.status === AccessRequestStatus.pending) {
      state = 'pending';
    } else if (
      entitlement.status === AccessRequestStatus.expired ||
      entitlement.status === AccessRequestStatus.rejected
    ) {
      state = 'expired';
    }
  }

  return {
    state,
    isLoading,
    hasAccess: hasAccess || false,
    entitlement,
  };
}
