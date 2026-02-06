import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { useGetAllAccessEntitlements } from './useAccessControl';
import type { UserProfile } from '../backend';
import { Principal } from '@dfinity/principal';

// Get all users from entitlements (since backend doesn't have getAllUsers)
export function useListUsers() {
  const { data: entitlements = [] } = useGetAllAccessEntitlements();
  const { actor } = useActor();

  return useQuery<UserProfile[]>({
    queryKey: ['allUsers', entitlements.map(e => e.user.toString()).join(',')],
    queryFn: async () => {
      if (!actor) return [];
      
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
    enabled: !!actor && entitlements.length > 0,
  });
}

export function useGetAllUsers() {
  return useListUsers();
}

export function useSearchUsers(searchTerm: string) {
  const { data: allUsers = [], isLoading } = useListUsers();

  const filteredUsers = searchTerm.trim()
    ? allUsers.filter((user) => {
        const term = searchTerm.toLowerCase();
        const displayName = user.displayName?.toLowerCase() || '';
        const principal = user.principal.toString().toLowerCase();
        return displayName.includes(term) || principal.includes(term);
      })
    : allUsers;

  return {
    data: filteredUsers,
    isLoading,
  };
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
