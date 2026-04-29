export type Role = 'CEO' | 'ADMIN' | 'USER';
export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface IpInfo {
  ip?: string;
  country?: string;
  city?: string;
  device?: string; // 'mobile' | 'desktop' | 'tablet'
  userAgent?: string;
}

export interface AvatarFrame {
  id: string;           // filename without extension
  name: string;         // display name
  filename: string;     // full filename e.g. "Avatar Frame_Venti.png"
  price: number;        // in tk
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  avatar: string;
  banner: string;
  bio: string;
  status: UserStatus;
  lastActive?: number;
  isOnline?: boolean;
  banned?: boolean;
  gender?: string;
  age?: string;
  // IP tracking
  ipInfo?: IpInfo;
  // Frame system
  ownedFrames?: string[];  // array of frame ids
  activeFrame?: string;    // frame id
  coins?: number;          // tk balance
}

export interface Channel {
  id: string;
  name: string;
  serverId: string;
  type: 'text';
}

export interface ServerMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
}

export interface Server {
  id: string;
  name: string;
  avatar?: string;
  banner?: string;
  description?: string;
  ownerId: string;
  ownerName?: string;
  members: ServerMember[];
  bannedMembers?: string[];  // array of userIds banned from this server
  memberCount?: number;
  channels: Channel[];
  isPublic?: boolean;
  createdAt?: number;
  inviteCode?: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  file?: string | null;
  reactions: Record<string, string[]>;
  timestamp: number;
  isAnnouncement?: boolean;
  senderFrame?: string;
  // Invite card metadata embedded in DM
  inviteCard?: {
    serverId: string;
    serverName: string;
    serverAvatar?: string;
    serverBanner?: string;
    memberCount: number;
    inviteCode: string;
  };
}

export interface DmMessage {
  id: string;
  dmKey: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderAvatar: string;
  senderFrame?: string;
  content: string;
  timestamp: number;
  read: boolean;
  // Special DM types
  type?: 'text' | 'invite_card' | 'frame_gift';
  inviteCard?: {
    serverId: string;
    serverName: string;
    serverAvatar?: string;
    serverBanner?: string;
    memberCount: number;
    inviteCode: string;
  };
  frameGift?: {
    frameId: string;
    frameName: string;
    claimed: boolean;
  };
}

export interface DmConversation {
  userId: string;
  displayName: string;
  avatar: string;
  lastMessage: string;
  lastTime: number;
  unread: number;
}

export interface Stats {
  totalUsers: number;
  totalServers: number;
  totalMessages: number;
  onlineUsers: number;
  admins: number;
  bannedUsers: number;
  bannedIPs: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface BannedIP {
  ip: string;
  bannedAt: number;
  bannedBy: string;
  reason?: string;
  country?: string;
}

export interface TypingEvent {
  userId: string;
  userName: string;
  channelId?: string;
  dmUserId?: string;
  timestamp: number;
}
