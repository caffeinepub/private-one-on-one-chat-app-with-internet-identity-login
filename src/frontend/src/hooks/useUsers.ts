import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, ChatUser } from '../backend';
import { Principal } from '@dfinity/principal';

// Get chat users (authorized users only) - works for all authenticated users with chat access
export function useGetChatUsers() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<ChatUser[]>({
    queryKey: ['chatUsers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getChatUsers();
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: 1,
  });
}

// Search chat users by display name or principal
export function useSearchChatUsers(searchTerm: string) {
  const { data: chatUsers = [], isLoading, error } = useGetChatUsers();
  const { identity } = useInternetIdentity();

  const currentPrincipal = identity?.getPrincipal().toString();

  const filteredUsers = searchTerm.trim()
    ? chatUsers.filter((user) => {
        const term = searchTerm.toLowerCase();
        const displayName = user.displayName?.toLowerCase() || '';
        const principal = user.principal.toString().toLowerCase();
        return (
          (displayName.includes(term) || principal.includes(term)) &&
          user.principal.toString() !== currentPrincipal
        );
      })
    : chatUsers.filter((user) => user.principal.toString() !== currentPrincipal);

  return {
    data: filteredUsers,
    isLoading,
    error,
  };
}

// Admin-only: Get all users from entitlements
export function useGetAllUsers() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserProfile[]>({
    queryKey: ['allUsersFromEntitlements'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      // Get all entitlements (admin-only)
      const entitlements = await actor.getAllAccessEntitlements();
      
      // Fetch user profiles for all users in entitlements
      const userProfiles = await Promise.all(
        entitlements.map(async (entitlement) => {
          try {
            const profile = await actor.getUserProfile(entitlement.user);
            return profile;
          } catch {
            return null;
          }
        })
      );
      
      return userProfiles.filter((p): p is UserProfile => p !== null);
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: 1,
  });
}

export function useGetUserProfile(principalString: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', principalString],
    queryFn: async () => {
      if (!actor || !principalString) return null;
      try {
        const principalObj = Principal.fromText(principalString);
        return await actor.getUserProfile(principalObj);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!identity && !!principalString,
    retry: false,
  });
}
