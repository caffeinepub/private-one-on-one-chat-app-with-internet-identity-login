import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { AccessEntitlement, UserId, EntitlementType, EntitlementSource } from '../backend';
import { AccessRequestStatus } from '../backend';
import { Principal } from '@dfinity/principal';

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

export function useGetAllAccessEntitlements() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<AccessEntitlement[]>({
    queryKey: ['allAccessEntitlements'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllAccessEntitlements();
    },
    enabled: !!actor && !actorFetching && !!identity,
    refetchInterval: 5000, // Refresh every 5 seconds to see new requests
  });
}

export function useGrantAccess() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      entitlementType,
      source,
      durationSeconds,
    }: {
      user: string;
      entitlementType: EntitlementType;
      source: EntitlementSource;
      durationSeconds: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      const principal = Principal.fromText(user);
      return actor.grantAccess(principal, entitlementType, source, durationSeconds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAccessEntitlements'] });
    },
  });
}

export function useRevokeAccess() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: string) => {
      if (!actor) throw new Error('Actor not available');
      const principal = Principal.fromText(user);
      return actor.revokeAccess(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAccessEntitlements'] });
    },
  });
}

export function useApproveAccessRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, approve }: { user: string; approve: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      const principal = Principal.fromText(user);
      return actor.approveAccessRequest(principal, approve);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAccessEntitlements'] });
    },
  });
}

// Helper to derive user entitlement status for display
export function getEntitlementStatus(entitlement: AccessEntitlement | null): {
  status: 'not_authorized' | 'pending' | 'authorized' | 'expired';
  label: string;
  isPermanent: boolean;
  endDate: Date | null;
} {
  if (!entitlement) {
    return {
      status: 'not_authorized',
      label: 'Not authorized',
      isPermanent: false,
      endDate: null,
    };
  }

  if (entitlement.status === AccessRequestStatus.pending) {
    return {
      status: 'pending',
      label: 'Pending approval',
      isPermanent: false,
      endDate: null,
    };
  }

  if (entitlement.status === AccessRequestStatus.rejected) {
    return {
      status: 'not_authorized',
      label: 'Rejected',
      isPermanent: false,
      endDate: null,
    };
  }

  if (entitlement.status === AccessRequestStatus.expired) {
    return {
      status: 'expired',
      label: 'Expired',
      isPermanent: false,
      endDate: entitlement.endTime ? new Date(Number(entitlement.endTime) / 1_000_000) : null,
    };
  }

  // Approved status
  const isPermanent = !entitlement.endTime;
  const endDate = entitlement.endTime ? new Date(Number(entitlement.endTime) / 1_000_000) : null;
  const now = new Date();

  // Check if time-limited access has expired
  if (endDate && endDate < now) {
    return {
      status: 'expired',
      label: 'Expired',
      isPermanent: false,
      endDate,
    };
  }

  return {
    status: 'authorized',
    label: isPermanent ? 'Authorized (permanent)' : `Authorized until ${endDate?.toLocaleDateString()}`,
    isPermanent,
    endDate,
  };
}
