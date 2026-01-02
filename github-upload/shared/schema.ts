import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  port: integer("port").notNull(),
  apiKey: text("api_key").notNull(),
  serverType: text("server_type").notNull().default("emby"), // emby, jellyfin
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  embyId: text("emby_id").notNull(),
  serverId: integer("server_id").references(() => servers.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // Movie, Series, Episode
  overview: text("overview"),
  year: integer("year"),
  runtime: integer("runtime"), // in minutes
  posterUrl: text("poster_url"),
  backdropUrl: text("backdrop_url"),
  playCount: integer("play_count").default(0),
  lastPlayed: timestamp("last_played"),
  resumePosition: integer("resume_position").default(0), // in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Active sessions table for monitoring concurrent users
export const activeSessions = pgTable("active_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  serverName: text("server_name").notNull(),
  serverUrl: text("server_url").notNull(),
  deviceInfo: text("device_info"), // User-Agent or device details
  ipAddress: text("ip_address"),
  lastActivity: timestamp("last_activity").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServerSchema = createInsertSchema(servers).pick({
  name: true,
  url: true,
  port: true,
  apiKey: true,
  serverType: true,
});

export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({
  id: true,
  createdAt: true,
});

export const insertActiveSessionSchema = createInsertSchema(activeSessions).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export type Server = typeof servers.$inferSelect;
export type InsertServer = z.infer<typeof insertServerSchema>;
export type MediaItem = typeof mediaItems.$inferSelect;
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = z.infer<typeof insertActiveSessionSchema>;

// Import viewing progress schemas
export * from "./viewing-progress";

// API response types
export interface EmbyAuthResponse {
  AccessToken: string;
  User: {
    Id: string;
    Name: string;
  };
}

export interface LoginCredentials {
  serverType: string;
  serverUrl: string;
  port: number;
  username: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  accessToken: string;
  isAuthenticated: boolean;
}

export interface EmbyMediaItem {
  Id: string;
  Name: string;
  Type: string;
  Overview?: string;
  ProductionYear?: number;
  RunTimeTicks?: number;
  Genres?: string[];
  CommunityRating?: number;
  OfficialRating?: string;
  ImageTags?: {
    Primary?: string;
    Backdrop?: string;
  };
  UserData?: {
    PlayCount?: number;
    PlayedPercentage?: number;
    PlaybackPositionTicks?: number;
    LastPlayedDate?: string;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  serverName?: string;
  serverType?: string;
  serverUrl?: string;
  port?: number;
  username?: string;
  error?: string;
}
