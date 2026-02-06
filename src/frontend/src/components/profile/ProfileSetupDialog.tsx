import { useState } from 'react';
import { useRegisterUser } from '../../hooks/useCurrentUserProfile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';

export default function ProfileSetupDialog() {
  const [displayName, setDisplayName] = useState('');
  const registerUser = useRegisterUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      await registerUser.mutateAsync(displayName.trim());
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to PriveChat</DialogTitle>
          <DialogDescription>Please choose a display name to get started.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              disabled={registerUser.isPending}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!displayName.trim() || registerUser.isPending}>
            {registerUser.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
