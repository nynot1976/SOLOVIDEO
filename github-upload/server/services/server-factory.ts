import { EmbyService } from './emby';
import { JellyfinService } from './jellyfin';
import type { Server, EmbyMediaItem, EmbyAuthResponse } from '@shared/schema';

// Interface for common media server service methods
export interface IMediaServerService {
  accessToken?: string;
  userId?: string;
  
  testConnection(): Promise<boolean>;
  authenticateWithCredentials(username: string, password: string): Promise<EmbyAuthResponse | null>;
  authenticateWithApiKey(): Promise<EmbyAuthResponse | null>;
  
  getRecentlyAdded(userId: string, limit?: number): Promise<EmbyMediaItem[]>;
  getContinueWatching(userId: string): Promise<EmbyMediaItem[]>;
  getMediaLibraries(userId: string): Promise<EmbyMediaItem[]>;
  getLibraryItems(userId: string, libraryId: string, limit?: number, startIndex?: number): Promise<EmbyMediaItem[]>;
  searchMedia(userId: string, searchTerm: string, limit?: number): Promise<EmbyMediaItem[]>;
  
  getImageUrl(itemId: string, imageType?: string, tag?: string): string;
  getStreamUrl(itemId: string, userId: string, mediaType?: string): string;
  
  reportPlaybackStart(userId: string, itemId: string): Promise<void>;
  reportPlaybackProgress(userId: string, itemId: string, positionTicks: number): Promise<void>;
  reportPlaybackStop(userId: string, itemId: string, positionTicks: number): Promise<void>;
  
  getSeriesDetails(userId: string, seriesId: string): Promise<EmbyMediaItem | null>;
  getSeriesSeasons(userId: string, seriesId: string): Promise<EmbyMediaItem[]>;
  getSeasonEpisodes(userId: string, seasonId: string): Promise<EmbyMediaItem[]>;
  getItemDetails(userId: string, itemId: string): Promise<EmbyMediaItem | null>;
  
  // Additional methods for compatibility
  getBestImageUrl(item: any): string | null;
  getRecommendations(userId: string, limit?: number): Promise<EmbyMediaItem[]>;
  generateLibraryGradient(libraryName: string): string;
  getLibraryImageUrl(itemId: string, imageType?: string, tag?: string): string;
  
  // Live TV methods
  getLiveTvChannels(userId: string): Promise<EmbyMediaItem[]>;
  getLiveTvChannelsByCategories(userId: string): Promise<any>;
  getLiveTvPrograms(userId: string, channelIds?: string[]): Promise<any[]>;
}

// Union type for all service types
export type MediaServerService = EmbyService | JellyfinService;

export class MediaServerFactory {
  static createService(server: Server): MediaServerService {
    switch (server.serverType.toLowerCase()) {
      case 'emby':
        return new EmbyService(server.url, server.port, server.apiKey);
      
      case 'jellyfin':
        return new JellyfinService(server.url, server.port, server.apiKey);
      
      default:
        // Default to Emby for backward compatibility
        return new EmbyService(server.url, server.port, server.apiKey);
    }
  }

  static getSupportedServerTypes(): string[] {
    return ['emby', 'jellyfin'];
  }

  static getDefaultPort(serverType: string): number {
    switch (serverType.toLowerCase()) {
      case 'emby':
      case 'jellyfin':
        return 8096;
      default:
        return 8096;
    }
  }

  static getServerDisplayName(serverType: string): string {
    switch (serverType.toLowerCase()) {
      case 'emby':
        return 'Emby Server';
      case 'jellyfin':
        return 'Jellyfin Server';
      default:
        return 'Media Server';
    }
  }
}