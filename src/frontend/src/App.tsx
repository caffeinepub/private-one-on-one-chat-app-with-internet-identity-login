import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useCurrentUserProfile';
import { useAccessState } from './hooks/useAccessEntitlement';
import { useIsCallerAdmin } from './hooks/useAccessControl';
import ChatLayout from './components/chat/ChatLayout';
import ProfileSetupDialog from './components/profile/ProfileSetupDialog';
import PendingAccessScreen from './components/access/PendingAccessScreen';
import LoginButton from './components/auth/LoginButton';
import AuthenticatedLoadingShell from './components/auth/AuthenticatedLoadingShell';
import { Loader2 } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();
  const { state: accessState, isLoading: accessLoading } = useAccessState();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();

  const isAuthenticated = !!identity;

  // Show loading spinner only during Internet Identity initialization
  if (isInitializing) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show login screen for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <img 
            src="/assets/generated/privechat-logo.dim_1024x1024.png" 
            alt="PriveChat Logo" 
            className="mx-auto mb-6 h-20 w-20 sm:h-24 sm:w-24"
          />
          <h1 className="mb-2 text-3xl font-bold sm:text-4xl">PriveChat</h1>
          <p className="mb-8 text-sm text-muted-foreground sm:text-base">Connect securely with Internet Identity</p>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Show lightweight authenticated shell while profile/access/admin checks resolve
  if (profileLoading || accessLoading || isAdminLoading) {
    return <AuthenticatedLoadingShell />;
  }

  // Show profile setup for first-time users
  const showProfileSetup = isAuthenticated && profileFetched && userProfile === null;
  if (showProfileSetup) {
    return <ProfileSetupDialog />;
  }

  // Admins always have access to chat
  if (isAdmin) {
    return <ChatLayout />;
  }

  // Show pending access screen if user doesn't have access
  if (accessState !== 'authorized') {
    return <PendingAccessScreen />;
  }

  // Show chat layout for authorized users
  return <ChatLayout />;
}

export default function App() {
  return (
    <>
      <AppContent />
      <Toaster />
    </>
  );
}
