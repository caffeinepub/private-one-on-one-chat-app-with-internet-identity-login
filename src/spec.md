# Specification

## Summary
**Goal:** Add an in-app Settings view accessible from the authenticated chat header to display user principals with per-user copy-to-clipboard actions.

**Planned changes:**
- Add a Settings entry point in `frontend/src/components/chat/ChatLayout.tsx` that opens a Settings dialog/panel without navigating away from chat and without breaking existing mobile navigation behavior.
- Implement a Settings view that shows the current user’s full Internet Identity principal with a copy button and clear English success/failure feedback.
- In the Settings view, show a user list with display name (when available) and full principal plus a copy button per user; populate via `useGetAllUsers()` for admins and `useGetChatUsers()` for non-admins, ensuring the current user is not duplicated in the non-admin list.

**User-visible outcome:** Signed-in users can open Settings from the chat header to view and copy their own principal, and view/copy other users’ principals (admin: all users; non-admin: discovered chat users) with clear English feedback.
