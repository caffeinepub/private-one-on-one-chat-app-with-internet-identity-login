import { Loader2 } from 'lucide-react';

export default function AuthenticatedLoadingShell() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <img 
          src="/assets/generated/privechat-logo.dim_1024x1024.png" 
          alt="PriveChat Logo" 
          className="mx-auto mb-6 h-20 w-20 sm:h-24 sm:w-24"
        />
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">PriveChat</h1>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    </div>
  );
}
