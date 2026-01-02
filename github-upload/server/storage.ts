import {
  servers,
  mediaItems,
  viewingProgress,
  viewingHistory,
  continueWatching,
  type Server,
  type InsertServer,
  type MediaItem,
  type InsertMediaItem,
  type ViewingProgress,
  type InsertViewingProgress,
  type ViewingHistory,
  type InsertViewingHistory,
  type ContinueWatching,
  type InsertContinueWatching,
  type ContinueWatchingItem,
  type PlaybackStartRequest,
  type PlaybackProgressRequest,
  type PlaybackStopRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Server management
  getAllServers(): Promise<Server[]>;
  getActiveServer(): Promise<Server | undefined>;
  createServer(server: InsertServer): Promise<Server>;
  updateServer(id: number, updates: Partial<Server>): Promise<Server | undefined>;
  deleteServer(id: number): Promise<boolean>;
  setActiveServer(id: number): Promise<boolean>;
  
  // Media items
  getMediaItems(serverId: number): Promise<MediaItem[]>;
  getMediaItem(id: number): Promise<MediaItem | undefined>;
  getMediaItemByEmbyId(embyId: string, serverId: number): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  updateMediaItem(id: number, updates: Partial<MediaItem>): Promise<MediaItem | undefined>;
  getContinueWatching(serverId: number): Promise<MediaItem[]>;

  // Viewing progress tracking
  startPlayback(userId: string, data: PlaybackStartRequest): Promise<ViewingProgress>;
  updatePlaybackProgress(userId: string, data: PlaybackProgressRequest): Promise<ViewingProgress | undefined>;
  stopPlayback(userId: string, data: PlaybackStopRequest): Promise<void>;
  getViewingProgress(userId: string, embyId: string): Promise<ViewingProgress | undefined>;
  getUserContinueWatching(userId: string): Promise<ContinueWatchingItem[]>;
  getUserViewingHistory(userId: string, limit?: number): Promise<ViewingHistory[]>;
  markAsCompleted(userId: string, embyId: string): Promise<void>;
  removeFromContinueWatching(userId: string, embyId: string): Promise<void>;

  // Viewing progress tracking
  startPlayback(userId: string, data: PlaybackStartRequest): Promise<ViewingProgress>;
  updatePlaybackProgress(userId: string, data: PlaybackProgressRequest): Promise<ViewingProgress | undefined>;
  stopPlayback(userId: string, data: PlaybackStopRequest): Promise<void>;
  getViewingProgress(userId: string, embyId: string): Promise<ViewingProgress | undefined>;
  getUserContinueWatching(userId: string): Promise<ContinueWatchingItem[]>;
  getUserViewingHistory(userId: string, limit?: number): Promise<ViewingHistory[]>;
  markAsCompleted(userId: string, embyId: string): Promise<void>;
  removeFromContinueWatching(userId: string, embyId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private servers: Map<number, Server>;
  private mediaItems: Map<number, MediaItem>;
  private currentServerId: number;
  private currentMediaId: number;

  constructor() {
    this.servers = new Map();
    this.mediaItems = new Map();
    this.currentServerId = 1;
    this.currentMediaId = 1;
  }

  async getAllServers(): Promise<Server[]> {
    return Array.from(this.servers.values());
  }

  async getActiveServer(): Promise<Server | undefined> {
    return Array.from(this.servers.values()).find(server => server.isActive);
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    // Deactivate all other servers
    for (const server of Array.from(this.servers.values())) {
      server.isActive = false;
    }

    const id = this.currentServerId++;
    const server: Server = {
      ...insertServer,
      id,
      isActive: true,
      createdAt: new Date(),
    };
    this.servers.set(id, server);
    return server;
  }

  async updateServer(id: number, updates: Partial<Server>): Promise<Server | undefined> {
    const server = this.servers.get(id);
    if (!server) return undefined;

    const updatedServer = { ...server, ...updates };
    this.servers.set(id, updatedServer);
    return updatedServer;
  }

  async deleteServer(id: number): Promise<boolean> {
    return this.servers.delete(id);
  }

  async setActiveServer(id: number): Promise<boolean> {
    const server = this.servers.get(id);
    if (!server) return false;

    // Deactivate all servers
    for (const s of Array.from(this.servers.values())) {
      s.isActive = false;
    }

    // Activate the specified server
    server.isActive = true;
    return true;
  }

  async getMediaItems(serverId: number): Promise<MediaItem[]> {
    return Array.from(this.mediaItems.values()).filter(item => item.serverId === serverId);
  }

  async getMediaItem(id: number): Promise<MediaItem | undefined> {
    return this.mediaItems.get(id);
  }

  async getMediaItemByEmbyId(embyId: string, serverId: number): Promise<MediaItem | undefined> {
    return Array.from(this.mediaItems.values()).find(
      item => item.embyId === embyId && item.serverId === serverId
    );
  }

  async createMediaItem(insertItem: InsertMediaItem): Promise<MediaItem> {
    const id = this.currentMediaId++;
    const item: MediaItem = {
      id,
      name: insertItem.name,
      type: insertItem.type,
      embyId: insertItem.embyId,
      serverId: insertItem.serverId ?? null,
      overview: insertItem.overview ?? null,
      year: insertItem.year ?? null,
      runtime: insertItem.runtime ?? null,
      posterUrl: insertItem.posterUrl ?? null,
      backdropUrl: insertItem.backdropUrl ?? null,
      playCount: insertItem.playCount ?? null,
      resumePosition: insertItem.resumePosition ?? null,
      lastPlayed: null,
      createdAt: new Date(),
    };
    this.mediaItems.set(id, item);
    return item;
  }

  async updateMediaItem(id: number, updates: Partial<MediaItem>): Promise<MediaItem | undefined> {
    const item = this.mediaItems.get(id);
    if (!item) return undefined;

    const updatedItem = { ...item, ...updates };
    this.mediaItems.set(id, updatedItem);
    return updatedItem;
  }

  async getContinueWatching(serverId: number): Promise<MediaItem[]> {
    return Array.from(this.mediaItems.values()).filter(
      item => item.serverId === serverId && item.resumePosition && item.resumePosition > 0
    );
  }
}

export class DatabaseStorage implements IStorage {
  async getAllServers(): Promise<Server[]> {
    return await db.select().from(servers).orderBy(servers.createdAt);
  }

  async getActiveServer(): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.isActive, true));
    return server || undefined;
  }

  async createServer(insertServer: InsertServer): Promise<Server> {
    // Deactivate all other servers first
    await db.update(servers).set({ isActive: false });

    const [server] = await db
      .insert(servers)
      .values({ ...insertServer, isActive: true })
      .returning();
    return server;
  }

  async updateServer(id: number, updates: Partial<Server>): Promise<Server | undefined> {
    const [server] = await db
      .update(servers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(servers.id, id))
      .returning();
    return server || undefined;
  }

  async deleteServer(id: number): Promise<boolean> {
    const result = await db.delete(servers).where(eq(servers.id, id));
    return (result.rowCount || 0) > 0;
  }

  async setActiveServer(id: number): Promise<boolean> {
    // Deactivate all servers
    await db.update(servers).set({ isActive: false });
    
    // Activate the specified server
    const [server] = await db
      .update(servers)
      .set({ isActive: true })
      .where(eq(servers.id, id))
      .returning();
    
    return !!server;
  }

  async getMediaItems(serverId: number): Promise<MediaItem[]> {
    return await db.select().from(mediaItems).where(eq(mediaItems.serverId, serverId));
  }

  async getMediaItem(id: number): Promise<MediaItem | undefined> {
    const [item] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    return item || undefined;
  }

  async getMediaItemByEmbyId(embyId: string, serverId: number): Promise<MediaItem | undefined> {
    const [item] = await db
      .select()
      .from(mediaItems)
      .where(and(eq(mediaItems.embyId, embyId), eq(mediaItems.serverId, serverId)));
    return item || undefined;
  }

  async createMediaItem(insertItem: InsertMediaItem): Promise<MediaItem> {
    const [item] = await db
      .insert(mediaItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateMediaItem(id: number, updates: Partial<MediaItem>): Promise<MediaItem | undefined> {
    const [item] = await db
      .update(mediaItems)
      .set(updates)
      .where(eq(mediaItems.id, id))
      .returning();
    return item || undefined;
  }

  async getContinueWatching(serverId: number): Promise<MediaItem[]> {
    return await db
      .select()
      .from(mediaItems)
      .where(and(eq(mediaItems.serverId, serverId), gt(mediaItems.resumePosition, 0)));
  }
}

export const storage = new DatabaseStorage();
