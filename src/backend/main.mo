import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Option "mo:core/Option";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type ThreadId = Nat;
  type UserId = Principal;
  public type MessageId = Nat;

  // Access Entitlement Types
  public type EntitlementType = {
    #permanent;
    #trial;
    #subscription;
    #sponsored;
  };

  public type EntitlementSource = {
    #adminGrant;
    #payment;
    #promotion;
  };

  public type AccessRequestStatus = {
    #pending;
    #approved;
    #rejected;
    #expired;
  };

  public type AccessEntitlement = {
    user : UserId;
    entitlementType : EntitlementType;
    source : EntitlementSource;
    startTime : Int;
    endTime : ?Int;
    status : AccessRequestStatus;
    requestTimestamp : Int;
  };

  public type ChatMessage = {
    id : MessageId;
    sender : UserId;
    content : Text;
    timestamp : Int;
    deleted : Bool;
  };

  public type ChatThread = {
    id : ThreadId;
    participants : Set.Set<UserId>;
    messages : List.List<ChatMessage>;
  };

  public type ChatThreadView = {
    id : ThreadId;
    participants : [UserId];
    messages : [ChatMessage];
  };

  module ChatMessage {
    public func compareByTimestamp(a : ChatMessage, b : ChatMessage) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  public type UserProfile = {
    principal : UserId;
    displayName : ?Text;
  };

  public type ChatUser = {
    principal : UserId;
    displayName : ?Text;
  };

  // State Variables
  var nextThreadId : ThreadId = 1;
  var nextMessageId : MessageId = 1;

  let threads = Map.empty<ThreadId, ChatThread>();
  let userThreads = Map.empty<UserId, List.List<ThreadId>>();
  let users = Map.empty<UserId, UserProfile>();
  let blockedUsers = Map.empty<UserId, Set.Set<UserId>>();
  let accessEntitlements = Map.empty<UserId, AccessEntitlement>();

  // Authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  //----------------------------------------------------------
  // Authorization Helper Functions
  //----------------------------------------------------------

  // Check if user has valid approved access to chat features
  private func hasValidAccess(user : UserId) : Bool {
    switch (accessEntitlements.get(user)) {
      case (null) { false };
      case (?entitlement) {
        if (entitlement.status != #approved) {
          return false;
        };
        // Check if time-limited access has expired
        switch (entitlement.endTime) {
          case (null) { true }; // Permanent access
          case (?endTime) {
            let now = timestamp();
            now < endTime;
          };
        };
      };
    };
  };

  // Guard function for chat operations - requires approved access
  private func requireChatAccess(caller : UserId) {
    if (not hasValidAccess(caller)) {
      Runtime.trap("Unauthorized: Chat access not granted. Please request access from the administrator.");
    };
  };

  //----------------------------------------------------------
  // User Profile Management (Required by Frontend)
  //----------------------------------------------------------

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    users.get(caller);
  };

  // Updated: Allow authorized users to view other authorized users' profiles
  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    
    // Allow viewing own profile
    if (caller == user) {
      return users.get(user);
    };
    
    // Allow admins to view any profile
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return users.get(user);
    };
    
    // Allow authorized users to view other authorized users' profiles
    if (hasValidAccess(caller) and hasValidAccess(user)) {
      return users.get(user);
    };
    
    Runtime.trap("Unauthorized: Can only view profiles of users with valid chat access");
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    // Ensure the profile principal matches the caller
    if (profile.principal != caller) {
      Runtime.trap("Unauthorized: Cannot save profile for another user");
    };
    users.add(caller, profile);
  };

  //----------------------------------------------------------
  // Core Access Management Functionality
  //----------------------------------------------------------

  // Request access to chat features
  public shared ({ caller }) func requestAccess() : async Bool {
    // Validate user existence
    switch (users.get(caller)) {
      case (null) {
        Runtime.trap("User must be registered to request access");
      };
      case (?_) {
        // Check if already has a request or approved access
        switch (accessEntitlements.get(caller)) {
          case (?existing) {
            if (existing.status == #pending) {
              Runtime.trap("Access request already pending");
            };
            if (existing.status == #approved) {
              Runtime.trap("Access already granted");
            };
          };
          case (null) {};
        };

        let entitlement : AccessEntitlement = {
          user = caller;
          entitlementType = #trial;
          source = #adminGrant;
          startTime = timestamp();
          endTime = null;
          status = #pending;
          requestTimestamp = timestamp();
        };

        accessEntitlements.add(caller, entitlement);
        true;
      };
    };
  };

  // Check if caller has valid access to chat features
  public query ({ caller }) func hasAccess() : async Bool {
    hasValidAccess(caller);
  };

  // Register new user
  public shared ({ caller }) func registerUser(displayName : ?Text) : async UserProfile {
    if (not users.containsKey(caller)) {
      let user : UserProfile = {
        principal = caller;
        displayName;
      };
      users.add(caller, user);
      user;
    } else {
      switch (users.get(caller)) {
        case (null) { Runtime.trap("User already registered") };
        case (?user) { user };
      };
    };
  };

  // Check if user already registered to block duplicate registration
  public query ({ caller }) func userExists() : async Bool {
    users.containsKey(caller);
  };

  // Admin function to approve/reject access requests
  public shared ({ caller }) func approveAccessRequest(user : UserId, approve : Bool) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can grant access");
    };
    if (caller.toText() == "2vxsx-fae") {
      Runtime.trap("Anonymous requests are not allowed for this endpoint. \n\nPlease use your Internet Identity and make sure your local replica is running. \n\n`dfx start --background`");
    };
    switch (users.get(user), accessEntitlements.get(user)) {
      case (null, _) {
        Runtime.trap("User not found. This request cannot be approved.");
      };
      case (_, null) {
        Runtime.trap("No access request found for this user");
      };
      // Update status to approved or rejected
      case (?_, ?entitlement) {
        let updatedEntitlement = {
          entitlement with status = if (approve) { #approved } else {
            #rejected;
          };
        };
        accessEntitlements.add(user, updatedEntitlement);
      };
    };
  };

  // Admin function to grant access with specific entitlement type and duration
  public shared ({ caller }) func grantAccess(
    user : UserId,
    entitlementType : EntitlementType,
    source : EntitlementSource,
    durationSeconds : ?Int
  ) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can grant access");
    };
    switch (users.get(user)) {
      case (null) {
        Runtime.trap("User not found. Cannot grant access to non-existent user.");
      };
      case (?_) {
        let now = timestamp();
        let endTime = switch (durationSeconds) {
          case (null) { null };
          case (?duration) { ?(now + duration) };
        };
        let entitlement : AccessEntitlement = {
          user = user;
          entitlementType = entitlementType;
          source = source;
          startTime = now;
          endTime = endTime;
          status = #approved;
          requestTimestamp = now;
        };
        accessEntitlements.add(user, entitlement);
      };
    };
  };

  // Admin function to revoke access
  public shared ({ caller }) func revokeAccess(user : UserId) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can revoke access");
    };
    switch (accessEntitlements.get(user)) {
      case (null) {
        Runtime.trap("No access entitlement found for this user");
      };
      case (?entitlement) {
        let updatedEntitlement = {
          entitlement with 
          status = #expired;
          endTime = ?timestamp();
        };
        accessEntitlements.add(user, updatedEntitlement);
      };
    };
  };

  // Switch from persistent to temporary chat access
  public shared ({ caller }) func switchToTemporaryAccess(user : UserId, duration : Int) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can convert persistent to temporary access");
    };
    switch (users.get(user), accessEntitlements.get(user)) {
      case (null, _) {
        Runtime.trap("User not found. This request cannot be fulfilled.");
      };
      case (_, null) {
        Runtime.trap("No access request found for this user");
      };
      // Update status to temporary
      case (?_, ?entitlement) {
        let updatedEntitlement = {
          entitlement with
          entitlementType = #trial;
          endTime = ?(timestamp() + duration);
        };
        accessEntitlements.add(user, updatedEntitlement);
      };
    };
  };

  //----------------------------------------------------------
  // Messaging and Thread Management (Requires Chat Access)
  //----------------------------------------------------------

  public shared ({ caller }) func createThread(participants : [UserId]) : async ThreadId {
    requireChatAccess(caller);
    let participantsSet = participants.foldLeft(
      Set.empty<UserId>(),
      func(acc, userId) {
        acc.add(userId);
        acc;
      },
    );
    // Ensure caller is a participant
    if (not participantsSet.contains(caller)) {
      Runtime.trap("You must be a participant in the thread");
    };
    // Verify all participants have valid access
    for (participant in participantsSet.values()) {
      if (not hasValidAccess(participant)) {
        Runtime.trap("All participants must have valid chat access");
      };
    };
    // Check if thread already exists for the participant set
    let existingThread = threads.entries().find(
      func((_, thread)) { thread.participants.equal(participantsSet) }
    );
    switch (existingThread) {
      // Return existing thread id if found
      case (?thread) { thread.0 };
      // Create new thread if no existing found
      case (null) {
        let thread : ChatThread = {
          id = nextThreadId;
          participants = participantsSet;
          messages = List.empty<ChatMessage>();
        };
        threads.add(thread.id, thread);
        for (participant in participantsSet.values()) {
          let threadIds = switch (userThreads.get(participant)) {
            case (?ids) { ids };
            case (null) { List.empty<ThreadId>() };
          };
          threadIds.add(thread.id);
          userThreads.add(participant, threadIds);
        };
        let createdId = nextThreadId;
        nextThreadId += 1;
        createdId;
      };
    };
  };

  public shared ({ caller }) func sendMessage(threadId : ThreadId, content : Text) : async MessageId {
    requireChatAccess(caller);
    if (content.trim(#char ' ').isEmpty()) {
      Runtime.trap("Message content cannot be empty");
    };
    let thread = switch (threads.get(threadId)) {
      case (null) { Runtime.trap("Thread not found") };
      case (?t) { t };
    };
    if (not thread.participants.contains(caller)) {
      Runtime.trap("Unauthorized: Only participants can send messages in this thread");
    };
    // Check block status for 1-on-1 threads
    if (thread.participants.size() == 2) {
      for (participant in thread.participants.values()) {
        if (participant != caller) {
          let callerBlocks = switch (blockedUsers.get(caller)) {
            case (?set) { set.contains(participant) };
            case (null) { false };
          };
          let recipientBlocks = switch (blockedUsers.get(participant)) {
            case (?set) { set.contains(caller) };
            case (null) { false };
          };
          if (callerBlocks or recipientBlocks) {
            Runtime.trap("You cannot send messages to a user you have blocked or who has blocked you");
          };
        };
      };
    };
    let message : ChatMessage = {
      id = nextMessageId;
      sender = caller;
      content;
      timestamp = timestamp();
      deleted = false;
    };
    thread.messages.add(message);
    let messageId = nextMessageId;
    nextMessageId += 1;
    messageId;
  };

  public shared ({ caller }) func deleteMessage(threadId : ThreadId, messageId : MessageId) : async () {
    requireChatAccess(caller);
    let thread = switch (threads.get(threadId)) {
      case (null) { Runtime.trap("Thread not found") };
      case (?t) { t };
    };
    if (not thread.participants.contains(caller)) {
      Runtime.trap("Unauthorized: Only participants can access this thread");
    };
    var found = false;
    thread.messages.mapInPlace(
      func(msg) {
        if (msg.id == messageId) {
          found := true;
          if (msg.sender != caller) {
            Runtime.trap("Unauthorized: Only the original sender can delete the message");
          };
          { msg with deleted = true };
        } else {
          msg;
        };
      }
    );
    if (not found) {
      Runtime.trap("Message not found");
    };
  };

  public shared ({ caller }) func editMessage(threadId : ThreadId, messageId : MessageId, newContent : Text) : async () {
    requireChatAccess(caller);
    if (newContent.trim(#char ' ').isEmpty()) {
      Runtime.trap("Message content cannot be empty");
    };
    let thread = switch (threads.get(threadId)) {
      case (null) { Runtime.trap("Thread not found") };
      case (?t) { t };
    };
    if (not thread.participants.contains(caller)) {
      Runtime.trap("Unauthorized: Only participants can access this thread");
    };
    var found = false;
    thread.messages.mapInPlace(
      func(msg) {
        if (msg.id == messageId) {
          found := true;
          if (msg.sender != caller) {
            Runtime.trap("Unauthorized: Only the original sender can edit the message");
          };
          if (msg.deleted) {
            Runtime.trap("Cannot edit a deleted message");
          };
          { msg with content = newContent };
        } else {
          msg;
        };
      }
    );
    if (not found) {
      Runtime.trap("Message not found");
    };
  };

  public shared ({ caller }) func deleteThread(threadId : ThreadId) : async () {
    requireChatAccess(caller);
    switch (threads.get(threadId)) {
      case (null) { Runtime.trap("Thread not found") };
      case (?thread) {
        if (not thread.participants.contains(caller)) {
          Runtime.trap("Unauthorized: You are not a participant of this thread");
        };
        // Only remove the thread from the caller's thread list
        // Do not delete the thread for other participants' lists, so all participants must delete
        switch (userThreads.get(caller)) {
          case (null) {};
          case (?threadIds) {
            let filteredThreads = List.empty<ThreadId>();
            for (t in threadIds.values()) {
              if (t != threadId) {
                filteredThreads.add(t);
              };
            };
            userThreads.add(caller, filteredThreads);
          };
        };
        // Check if all participants have removed the thread from their lists
        // If so, we can safely delete the thread from storage
        var allParticipantsRemoved = true;
        for (participant in thread.participants.values()) {
          switch (userThreads.get(participant)) {
            case (null) {};
            case (?threadIds) {
              for (tid in threadIds.values()) {
                if (tid == threadId) {
                  allParticipantsRemoved := false;
                };
              };
            };
          };
        };
        // Only delete from storage if all participants have removed it
        if (allParticipantsRemoved) {
          threads.remove(threadId);
        };
      };
    };
  };

  public shared ({ caller }) func blockUser(userToBlock : UserId) : async () {
    requireChatAccess(caller);
    if (caller == userToBlock) {
      Runtime.trap("You cannot block yourself");
    };
    let existingBlocked = switch (blockedUsers.get(caller)) {
      case (?blocked) { blocked };
      case (null) { Set.empty<UserId>() };
    };
    if (existingBlocked.contains(userToBlock)) {
      Runtime.trap("User is already blocked");
    };
    existingBlocked.add(userToBlock);
    blockedUsers.add(caller, existingBlocked);
  };

  public shared ({ caller }) func unblockUser(userToUnblock : UserId) : async () {
    requireChatAccess(caller);
    switch (blockedUsers.get(caller)) {
      case (null) { Runtime.trap("User is not blocked") };
      case (?blocked) {
        if (not blocked.contains(userToUnblock)) {
          Runtime.trap("User is not blocked");
        };
        blocked.remove(userToUnblock);
        if (blocked.isEmpty()) {
          blockedUsers.remove(caller);
        } else {
          blockedUsers.add(caller, blocked);
        };
      };
    };
  };

  public query ({ caller }) func hasBlocked(other : UserId) : async Bool {
    requireChatAccess(caller);
    switch (blockedUsers.get(caller)) {
      case (null) { false };
      case (?blocked) { blocked.contains(other) };
    };
  };

  public query ({ caller }) func getBlockedUsers() : async [UserId] {
    requireChatAccess(caller);
    switch (blockedUsers.get(caller)) {
      case (null) { [] };
      case (?blocked) { blocked.values().toArray() };
    };
  };

  public query ({ caller }) func getThread(threadId : ThreadId) : async ChatThreadView {
    requireChatAccess(caller);
    let thread = switch (threads.get(threadId)) {
      case (null) { Runtime.trap("Thread not found") };
      case (?t) { t };
    };
    if (not thread.participants.contains(caller)) {
      Runtime.trap("Unauthorized: Only participants can access this thread");
    };
    {
      id = thread.id;
      participants = thread.participants.values().toArray();
      messages = thread.messages.toArray();
    };
  };

  public query ({ caller }) func getUserThreads() : async [ThreadId] {
    requireChatAccess(caller);
    if (not users.containsKey(caller)) {
      Runtime.trap("User not registered");
    };
    switch (userThreads.get(caller)) {
      case (null) { [] };
      case (?threadList) { threadList.toArray() };
    };
  };

  public query ({ caller }) func getMessages(threadId : ThreadId) : async [ChatMessage] {
    requireChatAccess(caller);
    let thread = switch (threads.get(threadId)) {
      case (null) { Runtime.trap("Thread not found") };
      case (?t) { t };
    };
    if (not thread.participants.contains(caller)) {
      Runtime.trap("Unauthorized: Only participants can access messages in this thread");
    };
    thread.messages.values().toArray().sort(ChatMessage.compareByTimestamp);
  };

  // Admin-only: Get all access entitlements
  public query ({ caller }) func getAllAccessEntitlements() : async [AccessEntitlement] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can view all access entitlements");
    };
    accessEntitlements.values().toArray();
  };

  // Get current user's access entitlement
  public query ({ caller }) func getCurrentUserAccessEntitlement() : async ?AccessEntitlement {
    accessEntitlements.get(caller);
  };

  // Admin or self: Get specific user's access entitlement
  public query ({ caller }) func getAccessEntitlement(user : UserId) : async ?AccessEntitlement {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own access entitlement unless you are an admin");
    };
    accessEntitlements.get(user);
  };

  //----------------------------------------------------------
  // Chat User Discovery for Authorized Users
  //----------------------------------------------------------

  public query ({ caller }) func getChatUsers() : async [ChatUser] {
    requireChatAccess(caller);
    let authorizedUsers = List.empty<ChatUser>();
    for ((principal, profile) in users.entries()) {
      switch (accessEntitlements.get(principal)) {
        case (?entitlement) {
          if (entitlement.status == #approved) {
            let chatUser : ChatUser = {
              principal;
              displayName = profile.displayName;
            };
            authorizedUsers.add(chatUser);
          };
        };
        case (null) {};
      };
    };
    authorizedUsers.toArray();
  };

  private func timestamp() : Int {
    0;
  };
};
