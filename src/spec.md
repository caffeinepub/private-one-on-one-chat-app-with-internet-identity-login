# Specification

## Summary
**Goal:** Speed up the initial post-login load by eliminating redundant React Query caches/work and deferring non-essential user/profile fetching until it’s actually needed.

**Planned changes:**
- Remove the nested `QueryClientProvider` and locally-created `QueryClient` from `frontend/src/App.tsx` so the app uses only the existing provider from `frontend/src/main.tsx`.
- Stop triggering “all users” fetching during initial thread list rendering by removing unused `useListUsers()` usage from `frontend/src/components/chat/ThreadList.tsx`.
- Update `frontend/src/components/chat/ChatThreadView.tsx` to avoid relying on the entire user list for the header title; fetch only the other participant’s profile on-demand (or use a generic fallback title) without blocking message loading.
- Adjust the authenticated pre-chat-list loading flow so the app shell shows after Internet Identity initialization, with lightweight in-app loading while profile/access/admin checks resolve (still enforcing gating once checks complete).

**User-visible outcome:** After logging in, the app transitions to the authenticated shell faster and reaches the chat list/thread view without unnecessary “fetch all users” work, while still correctly routing users through profile setup or pending-access gating when required.
