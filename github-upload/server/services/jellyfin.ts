import axios, { type AxiosInstance } from 'axios';
import type { EmbyMediaItem, EmbyAuthResponse } from '@shared/schema';

export class JellyfinService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  public accessToken?: string;
  public userId?: string;

  constructor(serverUrl: string, port: number, apiKey: string) {
    // Jellyfin uses the same port convention as Emby
    this.baseUrl = serverUrl.includes('://') ? serverUrl : `https://${serverUrl}`;
    if (port && port !== 443 && port !== 80) {
      this.baseUrl = `${this.baseUrl}:${port}`;
    }
    
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Token': apiKey, // Jellyfin uses the same token header as Emby
        'User-Agent': 'SoloVideoClub/1.0'
      }
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/System/Info/Public');
      return response.status === 200 && response.data.ServerName;
    } catch (error) {
      console.error('Jellyfin connection test failed:', error);
      return false;
    }
  }

  async authenticateWithCredentials(username: string, password: string): Promise<EmbyAuthResponse | null> {
    try {
      // For authentication, create a clean request with proper Jellyfin headers
      const authClient = axios.create({
        baseURL: this.baseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SoloVideoClub/1.0',
          'X-Emby-Authorization': 'MediaBrowser Client="Jellyfin Web", Device="Chrome", DeviceId="jellyfin-web", Version="10.8.0"'
        }
      });

      // Jellyfin authentication endpoint
      const response = await authClient.post('/Users/AuthenticateByName', {
        Username: username,
        Pw: password
      });

      if (response.data && response.data.AccessToken) {
        this.accessToken = response.data.AccessToken;
        this.userId = response.data.User.Id;
        
        // Update client headers with the new token
        this.client.defaults.headers['X-Emby-Token'] = this.accessToken as string;
        
        return {
          AccessToken: response.data.AccessToken,
          User: {
            Id: response.data.User.Id,
            Name: response.data.User.Name
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Jellyfin authentication failed:', error);
      return null;
    }
  }

  async authenticateWithApiKey(): Promise<EmbyAuthResponse | null> {
    try {
      // For API key authentication, we need to get a user ID
      const usersResponse = await this.client.get('/Users');
      if (usersResponse.data && usersResponse.data.length > 0) {
        const user = usersResponse.data[0]; // Use first user
        this.userId = user.Id;
        this.accessToken = this.apiKey;
        
        return {
          AccessToken: this.apiKey,
          User: {
            Id: user.Id,
            Name: user.Name || 'API User'
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Jellyfin API key authentication failed:', error);
      return null;
    }
  }

  async getRecentlyAdded(userId: string, limit: number = 20): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get('/Users/' + userId + '/Items/Latest', {
        params: {
          Limit: limit,
          Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,CommunityRating,RunTimeTicks',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop,Thumb'
        }
      });

      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch recently added from Jellyfin:', error);
      return [];
    }
  }

  async getContinueWatching(userId: string): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get('/Users/' + userId + '/Items/Resume', {
        params: {
          Limit: 20,
          Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,CommunityRating,RunTimeTicks',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop,Thumb'
        }
      });

      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to fetch continue watching from Jellyfin:', error);
      return [];
    }
  }

  async getMediaLibraries(userId: string): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get('/Users/' + userId + '/Views');
      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to fetch libraries from Jellyfin:', error);
      return [];
    }
  }

  async getLibraryItems(userId: string, libraryId: string, limit: number = 10000, startIndex: number = 0): Promise<{ items: EmbyMediaItem[], totalRecordCount: number }> {
    try {
      console.log(`Loading Jellyfin library items for ${libraryId} with limit: ${limit}, startIndex: ${startIndex}`);
      const response = await this.client.get('/Users/' + userId + '/Items', {
        params: {
          ParentId: libraryId,
          Limit: limit,
          StartIndex: startIndex,
          Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,CommunityRating,RunTimeTicks,Overview',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop,Thumb',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        }
      });

      const items = response.data.Items || [];
      const totalRecordCount = response.data.TotalRecordCount || items.length;
      console.log(`Successfully loaded ${items.length} of ${totalRecordCount} total items from Jellyfin library ${libraryId}`);
      return { items, totalRecordCount };
    } catch (error) {
      console.error('Failed to fetch library items from Jellyfin:', error);
      return { items: [], totalRecordCount: 0 };
    }
  }

  async searchMedia(userId: string, searchTerm: string, limit: number = 20): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get('/Users/' + userId + '/Items', {
        params: {
          SearchTerm: searchTerm,
          Limit: limit,
          Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,CommunityRating,RunTimeTicks',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop,Thumb'
        }
      });

      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to search media in Jellyfin:', error);
      return [];
    }
  }

  getImageUrl(itemId: string, imageType: string = 'Primary', tag?: string): string {
    let url = `${this.baseUrl}/Items/${itemId}/Images/${imageType}`;
    const params = new URLSearchParams();
    
    if (tag) {
      params.append('tag', tag);
    }
    params.append('maxHeight', '600');
    params.append('maxWidth', '400');
    params.append('quality', '90');
    
    if (this.accessToken) {
      params.append('X-Emby-Token', this.accessToken);
    }
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    return url;
  }

  getStreamUrl(itemId: string, userId: string, mediaType?: string): string {
    const params = new URLSearchParams();
    
    if (this.accessToken) {
      params.append('api_key', this.accessToken);
      params.append('X-Emby-Token', this.accessToken);
    }
    
    params.append('UserId', userId);
    params.append('Static', 'true');
    params.append('Container', 'mp4,mkv,webm');
    params.append('VideoCodec', 'h264,hevc,vp9');
    params.append('AudioCodec', 'aac,mp3,ac3,dts');
    params.append('SubtitleCodec', '');
    params.append('EnableSubtitlesInManifest', 'false');
    params.append('MaxStreamingBitrate', '100000000');
    params.append('MaxVideoBitRate', '50000000');
    params.append('MaxAudioBitRate', '320000');
    params.append('AnalyzeDurationMs', '200000');
    params.append('ProbeSizeBytes', '200000000');
    
    // Configuración mejorada de idioma español
    // Primero intentar pista de audio 0 (original), luego 1 (doblada)
    params.append('AudioStreamIndex', '0');  // Pista principal de audio
    params.append('SubtitleStreamIndex', '-1');  // Desactivar subtítulos por defecto
    params.append('PreferredLanguage', 'spa,es,es-ES');
    params.append('Language', 'spa');
    params.append('EnableAudioVbrEncoding', 'false');
    
    // Configuración adicional para forzar español
    params.append('AudioLanguagePreference', 'spa,es,es-ES');
    params.append('SubtitleLanguagePreference', 'spa,es,es-ES');

    return `${this.baseUrl}/Videos/${itemId}/stream?${params.toString()}`;
  }

  // Método para obtener información de pistas de audio
  async getMediaInfo(itemId: string, userId: string): Promise<any> {
    try {
      const response = await this.client.get(`/Users/${userId}/Items/${itemId}`, {
        params: {
          Fields: 'MediaStreams,MediaSources,MediaInfo,Path,Container,AudioStreams,VideoStreams,SubtitleStreams'
        }
      });

      const mediaInfo = response.data;
      
      // Log detailed audio stream information
      if (mediaInfo.MediaStreams) {
        const audioStreams = mediaInfo.MediaStreams.filter((stream: any) => stream.Type === 'Audio');
        console.log(`🎵 Audio streams for ${mediaInfo.Name}:`);
        audioStreams.forEach((stream: any, index: number) => {
          console.log(`  Stream ${stream.Index}: ${stream.DisplayTitle || stream.Title || 'Unknown'} (${stream.Language || 'und'}) - ${stream.Codec}`);
        });
      }

      return mediaInfo;
    } catch (error) {
      console.error('Failed to get media info from Jellyfin:', error);
      return null;
    }
  }

  // Método para obtener URL de stream con pista de audio específica
  getStreamUrlWithAudioTrack(itemId: string, userId: string, audioTrackIndex: number): string {
    const params = new URLSearchParams();
    
    if (this.accessToken) {
      params.append('api_key', this.accessToken);
      params.append('X-Emby-Token', this.accessToken);
    }
    
    params.append('UserId', userId);
    
    // Forzar transcoding para asegurar la pista correcta
    params.append('Static', 'false');
    params.append('EnableAutoStreamCopy', 'false');
    params.append('AllowVideoStreamCopy', 'false');
    params.append('AllowAudioStreamCopy', 'false');
    
    // Configuración específica para transcoding
    params.append('Container', 'mp4');
    params.append('VideoCodec', 'h264');
    params.append('AudioCodec', 'aac');
    params.append('VideoBitRate', '10000000');
    params.append('AudioBitRate', '320000');
    params.append('MaxStreamingBitrate', '50000000');
    params.append('MaxVideoBitRate', '10000000');
    params.append('MaxAudioBitRate', '320000');
    
    // Pista de audio específica - parámetros múltiples para asegurar
    params.append('AudioStreamIndex', audioTrackIndex.toString());
    params.append('AudioIndex', audioTrackIndex.toString());
    params.append('SelectedAudioStream', audioTrackIndex.toString());
    
    // Configuración de idioma
    params.append('PreferredLanguage', 'spa');
    params.append('Language', 'spa');
    params.append('AudioLanguage', 'spa');
    params.append('AudioLanguagePreference', 'spa,es,es-ES');
    
    // Desactivar subtítulos
    params.append('SubtitleStreamIndex', '-1');
    params.append('EnableSubtitlesInManifest', 'false');
    
    // Configuración de transcoding adicional
    params.append('EnableAudioVbrEncoding', 'true');
    params.append('BreakOnNonKeyFrames', 'true');
    params.append('AnalyzeDurationMs', '200000');
    params.append('ProbeSizeBytes', '200000000');
    
    const url = `${this.baseUrl}/Videos/${itemId}/stream?${params.toString()}`;
    console.log(`🎵 Transcoding URL with audio track ${audioTrackIndex}: ${url}`);
    
    return url;
  }

  // Método alternativo usando master playlist para HLS streaming
  getHlsStreamUrlWithAudioTrack(itemId: string, userId: string, audioTrackIndex: number): string {
    const params = new URLSearchParams();
    
    if (this.accessToken) {
      params.append('api_key', this.accessToken);
      params.append('X-Emby-Token', this.accessToken);
    }
    
    params.append('UserId', userId);
    params.append('DeviceId', 'SoloVideoClub');
    params.append('MediaSourceId', itemId);
    params.append('AudioStreamIndex', audioTrackIndex.toString());
    params.append('SubtitleStreamIndex', '-1');
    params.append('MaxStreamingBitrate', '50000000');
    params.append('SegmentContainer', 'mp4');
    params.append('MinSegments', '1');
    params.append('BreakOnNonKeyFrames', 'true');
    params.append('EnableSubtitlesInManifest', 'false');
    
    const url = `${this.baseUrl}/Videos/${itemId}/master.m3u8?${params.toString()}`;
    console.log(`🎵 HLS URL with audio track ${audioTrackIndex}: ${url}`);
    
    return url;
  }

  async reportPlaybackStart(userId: string, itemId: string): Promise<void> {
    try {
      await this.client.post('/Sessions/Playing', {
        ItemId: itemId,
        SessionId: 'SoloVideoClub-' + Date.now(),
        CanSeek: true,
        IsMuted: false,
        IsPaused: false,
        RepeatMode: 'RepeatNone',
        PositionTicks: 0
      });
    } catch (error) {
      console.error('Failed to report playback start to Jellyfin:', error);
    }
  }

  async reportPlaybackProgress(userId: string, itemId: string, positionTicks: number): Promise<void> {
    try {
      await this.client.post('/Sessions/Playing/Progress', {
        ItemId: itemId,
        SessionId: 'SoloVideoClub-' + Date.now(),
        PositionTicks: positionTicks,
        CanSeek: true,
        IsMuted: false,
        IsPaused: false,
        RepeatMode: 'RepeatNone'
      });
    } catch (error) {
      console.error('Failed to report playback progress to Jellyfin:', error);
    }
  }

  async reportPlaybackStop(userId: string, itemId: string, positionTicks: number): Promise<void> {
    try {
      await this.client.post('/Sessions/Playing/Stopped', {
        ItemId: itemId,
        SessionId: 'SoloVideoClub-' + Date.now(),
        PositionTicks: positionTicks
      });
    } catch (error) {
      console.error('Failed to report playback stop to Jellyfin:', error);
    }
  }

  async getSeriesDetails(userId: string, seriesId: string): Promise<EmbyMediaItem | null> {
    try {
      const response = await this.client.get(`/Users/${userId}/Items/${seriesId}`, {
        params: {
          Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,CommunityRating,RunTimeTicks,Overview,People,Studios'
        }
      });

      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch series details from Jellyfin:', error);
      return null;
    }
  }

  async getSeriesSeasons(userId: string, seriesId: string): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get(`/Shows/${seriesId}/Seasons`, {
        params: {
          UserId: userId,
          Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,CommunityRating,RunTimeTicks'
        }
      });

      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to fetch series seasons from Jellyfin:', error);
      return [];
    }
  }

  async getSeasonEpisodes(userId: string, seasonId: string): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get(`/Shows/${seasonId}/Episodes`, {
        params: {
          UserId: userId,
          Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,CommunityRating,RunTimeTicks,Overview'
        }
      });

      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to fetch season episodes from Jellyfin:', error);
      return [];
    }
  }

  async getItemDetails(userId: string, itemId: string): Promise<EmbyMediaItem | null> {
    try {
      const response = await this.client.get(`/Users/${userId}/Items/${itemId}`, {
        params: {
          Fields: 'BasicSyncInfo,CanDelete,PrimaryImageAspectRatio,ProductionYear,Genres,CommunityRating,RunTimeTicks,Overview,People,Studios'
        }
      });

      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch item details from Jellyfin:', error);
      return null;
    }
  }

  // Additional methods for compatibility with EmbyService
  getBestImageUrl(item: any): string | null {
    if (item.ImageTags?.Primary) {
      return `/api/image-proxy/${item.Id}/Primary?tag=${item.ImageTags.Primary}`;
    }
    if (item.ImageTags?.Backdrop) {
      return `/api/image-proxy/${item.Id}/Backdrop?tag=${item.ImageTags.Backdrop}`;
    }
    if (item.ImageTags?.Thumb) {
      return `/api/image-proxy/${item.Id}/Thumb?tag=${item.ImageTags.Thumb}`;
    }
    return null;
  }

  async getRecommendations(userId: string, limit: number = 20): Promise<EmbyMediaItem[]> {
    // Jellyfin doesn't have a specific recommendations endpoint like Emby
    // So we'll return recently added as a fallback
    return this.getRecentlyAdded(userId, limit);
  }

  generateLibraryGradient(libraryName: string): string {
    // Simple gradient generator based on library name
    const colors = [
      'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(45deg, #fa709a 0%, #fee140 100%)',
    ];
    
    const hash = libraryName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }

  getLibraryImageUrl(itemId: string, imageType: string = 'Backdrop', tag?: string): string {
    return this.getImageUrl(itemId, imageType, tag);
  }

  // Live TV methods
  async getLiveTvChannels(userId: string): Promise<EmbyMediaItem[]> {
    try {
      console.log('🔴 Getting Live TV channels from Jellyfin');
      const response = await this.client.get('/LiveTv/Channels', {
        params: {
          UserId: userId,
          EnableImages: true,
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop',
          Fields: 'ChannelInfo,MediaStreams,ChannelNumber,Type,MediaSources,Path',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        }
      });
      
      const channels = response.data.Items || [];
      console.log(`✅ Found ${channels.length} Live TV channels from Jellyfin`);
      return channels;
    } catch (error) {
      console.error('❌ Failed to get Live TV channels from Jellyfin:', error);
      return [];
    }
  }

  async getChannelStreamInfo(channelId: string): Promise<any> {
    try {
      const response = await this.client.get(`/LiveTv/Channels/${channelId}`, {
        params: {
          UserId: this.userId,
          Fields: 'MediaSources,Path,StreamUrls'
        }
      });
      
      const channel = response.data;
      console.log(`📺 Channel ${channelId} info:`, {
        name: channel.Name,
        hasSources: !!(channel.MediaSources && channel.MediaSources.length > 0),
        hasPath: !!channel.Path
      });
      
      return channel;
    } catch (error) {
      console.error(`❌ Error getting channel ${channelId} info:`, error);
      return null;
    }
  }

  getChannelDirectStreamUrl(channelId: string): string {
    // Use the most direct streaming approach for Jellyfin Live TV
    const params = new URLSearchParams();
    
    if (this.accessToken) {
      params.append('api_key', this.accessToken);
      params.append('X-Emby-Token', this.accessToken);
    }
    
    params.append('Static', 'false');
    params.append('Container', 'ts,mp4,m3u8');
    params.append('AudioCodec', 'aac,mp3');
    params.append('VideoCodec', 'h264');
    params.append('MaxStreamingBitrate', '8000000');
    
    return `${this.baseUrl}/LiveTv/Channels/${channelId}/stream?${params.toString()}`;
  }

  async getLiveTvChannelsByCategories(userId: string): Promise<any> {
    try {
      console.log('🔴 Getting categorized Live TV channels from Jellyfin');
      const channels = await this.getLiveTvChannels(userId);
      
      // Organize channels by categories
      const categories: any = {
        'Noticias': [],
        'Deportes': [],
        'Entretenimiento': [],
        'Infantil': [],
        'Música': [],
        'Documentales': [],
        'Cine': [],
        'Series': [],
        'Locales': [],
        'Internacionales': [],
        'Otros': []
      };

      channels.forEach((channel: any) => {
        const name = channel.Name?.toLowerCase() || '';
        const number = parseInt(channel.ChannelNumber) || 0;

        if (name.includes('news') || name.includes('noticias') || name.includes('info')) {
          categories['Noticias'].push(channel);
        } else if (name.includes('sport') || name.includes('deportes') || name.includes('espn') || name.includes('fox')) {
          categories['Deportes'].push(channel);
        } else if (name.includes('kids') || name.includes('infantil') || name.includes('cartoon') || name.includes('disney')) {
          categories['Infantil'].push(channel);
        } else if (name.includes('music') || name.includes('mtv') || name.includes('música')) {
          categories['Música'].push(channel);
        } else if (name.includes('discovery') || name.includes('national') || name.includes('documentary')) {
          categories['Documentales'].push(channel);
        } else if (name.includes('movie') || name.includes('cinema') || name.includes('film') || name.includes('cine')) {
          categories['Cine'].push(channel);
        } else if (name.includes('series') || name.includes('drama') || name.includes('comedy')) {
          categories['Series'].push(channel);
        } else if (number < 100) {
          categories['Locales'].push(channel);
        } else if (number >= 100) {
          categories['Internacionales'].push(channel);
        } else {
          categories['Otros'].push(channel);
        }
      });

      // Sort channels within each category by channel number
      Object.keys(categories).forEach(category => {
        categories[category].sort((a: any, b: any) => (a.ChannelNumber || 0) - (b.ChannelNumber || 0));
      });

      console.log(`📊 Jellyfin channels organized into ${Object.keys(categories).length} categories`);
      return categories;
    } catch (error) {
      console.error('❌ Failed to organize Jellyfin Live TV channels:', error);
      return {};
    }
  }

  async getLiveTvPrograms(userId: string, channelIds?: string[]): Promise<any[]> {
    try {
      console.log('📅 Getting Live TV programs from Jellyfin');
      const params: any = {
        UserId: userId,
        EnableImages: true,
        Fields: 'Overview,ChannelInfo,StartDate,EndDate',
        IsAiring: true
      };

      if (channelIds && channelIds.length > 0) {
        params.ChannelIds = channelIds.join(',');
      }

      const response = await this.client.get('/LiveTv/Programs', { params });
      const programs = response.data.Items || [];
      
      console.log(`✅ Found ${programs.length} Live TV programs from Jellyfin`);
      return programs;
    } catch (error) {
      console.error('❌ Failed to get Live TV programs from Jellyfin:', error);
      return [];
    }
  }
}