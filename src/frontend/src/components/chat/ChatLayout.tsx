import { useState } from 'react';
import ThreadList from './ThreadList';
import ChatThreadView from './ChatThreadView';
import UserSearchStartChat from './UserSearchStartChat';
import UserBadge from '../profile/UserBadge';
import LoginButton from '../auth/LoginButton';
import AccessManagementDialog from '../admin/AccessManagementDialog';
import SettingsDialog from '../settings/SettingsDialog';
import { useIsCallerAdmin } from '../../hooks/useAccessControl';
import { Button } from '../ui/button';
import { MessageSquarePlus, Shield, ArrowLeft, Settings } from 'lucide-react';
import type { ThreadId } from '../../backend';

export default function ChatLayout() {
  const [selectedThreadId, setSelectedThreadId] = useState<ThreadId | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showAccessManagement, setShowAccessManagement] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { data: isAdmin } = useIsCallerAdmin();

  const handleThreadCreated = (threadId: ThreadId) => {
    setShowUserSearch(false);
    setSelectedThreadId(threadId);
  };

  const handleThreadDeleted = () => {
    setSelectedThreadId(null);
    setShowUserSearch(false);
  };

  const handleBackToList = () => {
    setSelectedThreadId(null);
    setShowUserSearch(false);
  };

  const handleAdminStartChat = (threadId: ThreadId) => {
    setShowAccessManagement(false);
    setSelectedThreadId(threadId);
  };

  // On mobile, show either list or thread view
  const showThreadList = !selectedThreadId && !showUserSearch;
  const showThreadView = selectedThreadId !== null && !showUserSearch;

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <header className="border-b bg-card px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src="/assets/generated/privechat-logo.dim_1024x1024.png" 
              alt="PriveChat Logo" 
              className="h-7 w-7 sm:h-8 sm:w-8"
            />
            <h1 className="text-lg font-bold sm:text-xl">PriveChat</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAccessManagement(true)}
                className="hidden sm:flex"
              >
                <Shield className="mr-2 h-4 w-4" />
                Access Management
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAccessManagement(true)}
                className="sm:hidden"
              >
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <div className="hidden sm:block">
              <UserBadge />
            </div>
            <LoginButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile when thread is selected */}
        <aside className={`w-full border-r bg-card md:w-80 ${showThreadView ? 'hidden md:block' : 'block'}`}>
          <div className="flex h-full flex-col">
            <div className="border-b p-3 sm:p-4">
              <Button onClick={() => setShowUserSearch(true)} className="w-full" size="default">
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </div>
            <ThreadList selectedThreadId={selectedThreadId} onSelectThread={setSelectedThreadId} />
          </div>
        </aside>

        {/* Chat Area - full width on mobile when thread is selected */}
        <main className={`flex-1 ${showThreadList ? 'hidden md:flex' : 'flex'}`}>
          {showUserSearch ? (
            <UserSearchStartChat onThreadCreated={handleThreadCreated} onCancel={() => setShowUserSearch(false)} />
          ) : selectedThreadId !== null ? (
            <ChatThreadView threadId={selectedThreadId} onThreadDeleted={handleThreadDeleted} onBack={handleBackToList} />
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <div className="text-center">
                <MessageSquarePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-lg font-semibold">No chat selected</h2>
                <p className="mt-2 text-sm text-muted-foreground">Choose a chat or start a new conversation</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer - compact on mobile */}
      <footer className="hidden border-t bg-card px-3 py-2 text-center text-xs text-muted-foreground sm:block sm:px-6 sm:py-3">
        © 2026. Built with ❤️ using{' '}
        <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="hover:underline">
          caffeine.ai
        </a>
      </footer>

      {/* Access Management Dialog */}
      {isAdmin && (
        <AccessManagementDialog 
          open={showAccessManagement} 
          onOpenChange={setShowAccessManagement}
          onStartChat={handleAdminStartChat}
        />
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
