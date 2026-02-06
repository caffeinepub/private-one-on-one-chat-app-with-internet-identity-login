import { useGetCallerUserProfile, useCurrentPrincipal } from '../../hooks/useCurrentUserProfile';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { User } from 'lucide-react';

export default function UserBadge() {
  const { data: userProfile } = useGetCallerUserProfile();
  const principal = useCurrentPrincipal();

  const displayName = userProfile?.displayName || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const shortPrincipal = principal ? `${principal.slice(0, 5)}...${principal.slice(-3)}` : '';

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary text-primary-foreground">
          {initials || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{displayName}</span>
        <span className="text-xs text-muted-foreground">{shortPrincipal}</span>
      </div>
    </div>
  );
}
