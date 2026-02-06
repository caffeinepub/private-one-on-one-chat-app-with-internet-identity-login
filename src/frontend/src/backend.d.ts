import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type ThreadId = bigint;
export type UserId = Principal;
export type MessageId = bigint;
export interface ChatUser {
    principal: UserId;
    displayName?: string;
}
export interface ChatThreadView {
    id: ThreadId;
    participants: Array<UserId>;
    messages: Array<ChatMessage>;
}
export interface ChatMessage {
    id: MessageId;
    deleted: boolean;
    content: string;
    sender: UserId;
    timestamp: bigint;
}
export interface AccessEntitlement {
    startTime: bigint;
    status: AccessRequestStatus;
    endTime?: bigint;
    source: EntitlementSource;
    user: UserId;
    entitlementType: EntitlementType;
    requestTimestamp: bigint;
}
export interface UserProfile {
    principal: UserId;
    displayName?: string;
}
export enum AccessRequestStatus {
    expired = "expired",
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum EntitlementSource {
    promotion = "promotion",
    adminGrant = "adminGrant",
    payment = "payment"
}
export enum EntitlementType {
    trial = "trial",
    permanent = "permanent",
    subscription = "subscription",
    sponsored = "sponsored"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    approveAccessRequest(user: UserId, approve: boolean): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    blockUser(userToBlock: UserId): Promise<void>;
    createThread(participants: Array<UserId>): Promise<ThreadId>;
    deleteMessage(threadId: ThreadId, messageId: MessageId): Promise<void>;
    deleteThread(threadId: ThreadId): Promise<void>;
    editMessage(threadId: ThreadId, messageId: MessageId, newContent: string): Promise<void>;
    getAccessEntitlement(user: UserId): Promise<AccessEntitlement | null>;
    getAllAccessEntitlements(): Promise<Array<AccessEntitlement>>;
    getBlockedUsers(): Promise<Array<UserId>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChatUsers(): Promise<Array<ChatUser>>;
    getCurrentUserAccessEntitlement(): Promise<AccessEntitlement | null>;
    getMessages(threadId: ThreadId): Promise<Array<ChatMessage>>;
    getThread(threadId: ThreadId): Promise<ChatThreadView>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserThreads(): Promise<Array<ThreadId>>;
    grantAccess(user: UserId, entitlementType: EntitlementType, source: EntitlementSource, durationSeconds: bigint | null): Promise<void>;
    hasAccess(): Promise<boolean>;
    hasBlocked(other: UserId): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    registerUser(displayName: string | null): Promise<UserProfile>;
    requestAccess(): Promise<boolean>;
    revokeAccess(user: UserId): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(threadId: ThreadId, content: string): Promise<MessageId>;
    switchToTemporaryAccess(user: UserId, duration: bigint): Promise<void>;
    unblockUser(userToUnblock: UserId): Promise<void>;
    userExists(): Promise<boolean>;
}
