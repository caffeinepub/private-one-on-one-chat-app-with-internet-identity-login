import { useState } from 'react';
import { useRequestAccess, useRefreshAccess, useAccessState } from '../../hooks/useAccessEntitlement';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Lock, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function PendingAccessScreen() {
  const { state, entitlement } = useAccessState();
  const requestAccessMutation = useRequestAccess();
  const refreshAccess = useRefreshAccess();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRequestAccess = async () => {
    try {
      await requestAccessMutation.mutateAsync();
      toast.success('Access request submitted successfully');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to request access';
      toast.error(errorMessage);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refreshAccess();
    
    // Give queries time to refetch
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Access status refreshed');
    }, 1000);
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'pending':
        return <Clock className="h-10 w-10 text-amber-500 sm:h-12 sm:w-12" />;
      case 'expired':
        return <Lock className="h-10 w-10 text-destructive sm:h-12 sm:w-12" />;
      default:
        return <Lock className="h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />;
    }
  };

  const getStatusTitle = () => {
    switch (state) {
      case 'pending':
        return 'Access Request Pending';
      case 'expired':
        return 'Access Expired';
      default:
        return 'Access Required';
    }
  };

  const getStatusDescription = () => {
    switch (state) {
      case 'pending':
        return 'Your access request has been submitted and is awaiting administrator approval. You will be able to use the chat features once your request is approved.';
      case 'expired':
        return 'Your chat access has expired. Please contact the administrator to request renewed access.';
      default:
        return 'You need administrator approval to access chat features. Click the button below to submit an access request.';
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="border-b bg-card px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="/assets/generated/privechat-logo.dim_1024x1024.png" 
              alt="PriveChat Logo" 
              className="h-7 w-7 sm:h-8 sm:w-8"
            />
            <h1 className="text-lg font-bold sm:text-xl">PriveChat</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center overflow-y-auto bg-background p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">{getStatusIcon()}</div>
            <CardTitle className="text-xl sm:text-2xl">{getStatusTitle()}</CardTitle>
            <CardDescription className="text-sm sm:text-base">{getStatusDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {state === 'not_requested' && (
              <Button
                onClick={handleRequestAccess}
                disabled={requestAccessMutation.isPending}
                className="w-full"
                size="lg"
              >
                {requestAccessMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  'Request Access'
                )}
              </Button>
            )}

            {state === 'pending' && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Your request was submitted on{' '}
                  {entitlement?.requestTimestamp
                    ? new Date(Number(entitlement.requestTimestamp) / 1_000_000).toLocaleString()
                    : 'recently'}
                  . Please wait for administrator approval.
                </AlertDescription>
              </Alert>
            )}

            {state === 'expired' && (
              <>
                <Alert variant="destructive">
                  <Lock className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Your access expired on{' '}
                    {entitlement?.endTime
                      ? new Date(Number(entitlement.endTime) / 1_000_000).toLocaleString()
                      : 'recently'}
                    . Contact the administrator for renewed access.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleRequestAccess}
                  disabled={requestAccessMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {requestAccessMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Request New Access'
                  )}
                </Button>
              </>
            )}

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="w-full"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Access Status
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer - hidden on mobile */}
      <footer className="hidden border-t bg-card px-3 py-2 text-center text-xs text-muted-foreground sm:block sm:px-6 sm:py-3">
        © 2026. Built with ❤️ using{' '}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="hover:underline">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
