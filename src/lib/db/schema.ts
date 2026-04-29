import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleEnum = pgEnum('role', ['USER', 'ADMIN', 'CEO']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('USER').notNull(),
  displayName: text('display_name'),
  avatar: text('avatar'),
  banner: text('banner'),
  bio: text('bio'),
  status: text('status').default('online'),
  lastActive: timestamp('last_active').defaultNow(),
  banned: boolean('banned').default(false),
  riskScore: integer('risk_score').default(0),
  deviceId: text('device_id'),
  coins: integer('coins').default(100),
  ipInfo: jsonb('ip_info'),
  activeFrame: text('active_frame'),
  ownedFrames: jsonb('owned_frames').default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

export const servers = pgTable('servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  banner: text('banner'),
  description: text('description'),
  ownerId: text('owner_id').references(() => users.id),
  isPublic: boolean('is_public').default(true),
  inviteCode: text('invite_code').unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const members = pgTable('members', {
  id: text('id').primaryKey(),
  serverId: text('server_id').references(() => servers.id),
  userId: text('user_id').references(() => users.id),
  role: text('role').default('member'),
  joinedAt: timestamp('joined_at').defaultNow(),
});

export const channels = pgTable('channels', {
  id: text('id').primaryKey(),
  serverId: text('server_id').references(() => servers.id),
  name: text('name').notNull(),
  type: text('type').default('text'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').references(() => channels.id),
  senderId: text('sender_id').references(() => users.id),
  content: text('content').notNull(),
  attachments: jsonb('attachments'),
  reactions: jsonb('reactions').default({}),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const dms = pgTable('dms', {
  id: text('id').primaryKey(),
  dmKey: text('dm_key').notNull(),
  senderId: text('sender_id').references(() => users.id),
  receiverId: text('receiver_id').references(() => users.id),
  content: text('content').notNull(),
  read: boolean('read').default(false),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const bannedUsers = pgTable('banned_users', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  username: text('username'),
  ip: text('ip'),
  reason: text('reason'),
  bannedAt: timestamp('banned_at').defaultNow(),
});

export const moderationLogs = pgTable('moderation_logs', {
  id: text('id').primaryKey(),
  actionType: text('action_type').notNull(),
  targetId: text('target_id'),
  performedBy: text('performed_by'),
  reason: text('reason'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  servers: many(servers),
  memberships: many(members),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  owner: one(users, {
    fields: [servers.ownerId],
    references: [users.id],
  }),
  members: many(members),
  channels: many(channels),
}));

export const membersRelations = relations(members, ({ one }) => ({
  server: one(servers, {
    fields: [members.serverId],
    references: [servers.id],
  }),
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));
