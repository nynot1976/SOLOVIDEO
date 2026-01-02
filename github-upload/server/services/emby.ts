import axios, { AxiosInstance } from 'axios';
import type { EmbyAuthResponse, EmbyMediaItem } from '@shared/schema';

export class EmbyService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey: string;
  public accessToken?: string;

  constructor(serverUrl: string, port: number, apiKey: string) {
    // Preserve protocol and build proper baseUrl
    const hasProtocol = serverUrl.startsWith('http://') || serverUrl.startsWith('https://');
    if (hasProtocol) {
      // Use provided URL with protocol, replace port if needed
      const url = new URL(serverUrl);
      url.port = port.toString();
      this.baseUrl = url.origin;
    } else {
      // Default to HTTPS for domains without protocol
      this.baseUrl = `https://${serverUrl}:${port}`;
    }
    this.apiKey = apiKey;
    
    console.log(`EmbyService baseUrl: ${this.baseUrl}`);
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Add token interceptor
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers['X-MediaBrowser-Token'] = this.accessToken;
      } else if (this.apiKey && this.apiKey !== 'temp-key' && this.apiKey !== 'login-api-key') {
        config.params = { ...config.params, api_key: this.apiKey };
      }
      return config;
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/System/Info', {
        params: { api_key: this.apiKey }
      });
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async authenticateWithCredentials(username: string, password: string): Promise<EmbyAuthResponse | null> {
    try {
      console.log(`🔐 Emby auth attempt: ${username} to ${this.baseUrl}`);
      
      // Try multiple authentication formats
      const authFormats = [
        { Username: username, Pw: password },
        { Username: username, Password: password },
        { username: username, password: password },
        { Name: username, Password: password }
      ];

      for (const authData of authFormats) {
        try {
          console.log(`Trying format: ${JSON.stringify(Object.keys(authData))}`);
          
          const response = await this.client.post('/Users/AuthenticateByName', authData, {
            headers: {
              'X-Emby-Authorization': `MediaBrowser Client="SoloVideoClub", Device="WebPlayer", DeviceId="web-player-${Date.now()}", Version="1.0.0"`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });
          
          if (response.data && response.data.AccessToken) {
            this.accessToken = response.data.AccessToken;
            console.log(`✅ Auth success with format: ${JSON.stringify(Object.keys(authData))}`);
            console.log(`User: ${response.data.User?.Name} (ID: ${response.data.User?.Id})`);
            return response.data;
          }
        } catch (formatError) {
          console.log(`❌ Format ${JSON.stringify(Object.keys(authData))} failed: ${formatError.response?.status}`);
          continue;
        }
      }
      
      console.log('❌ All authentication formats failed');
      return null;
    } catch (error: any) {
      console.error('Authentication error:', {
        username,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return null;
    }
  }

  async authenticateWithApiKey(): Promise<EmbyAuthResponse | null> {
    try {
      // For API key authentication, we can get user info
      const response = await this.client.get('/Users', {
        params: { api_key: this.apiKey }
      });
      
      if (response.data && response.data.length > 0) {
        const user = response.data[0];
        return {
          AccessToken: this.apiKey,
          User: {
            Id: user.Id,
            Name: user.Name,
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Authentication failed:', error);
      return null;
    }
  }

  async getRecentlyAdded(userId: string, limit: number = 20): Promise<EmbyMediaItem[]> {
    try {
      console.log(`📚 Getting recently added for user ${userId} from ${this.baseUrl}`);
      const response = await this.client.get(`/Users/${userId}/Items/Latest`, {
        params: {
          Limit: limit,
          Fields: 'Overview,Genres,ProductionYear,RunTimeTicks',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop',
        }
      });
      
      console.log(`✅ Got ${response.data?.length || 0} recent items`);
      return response.data || [];
    } catch (error: any) {
      console.error('Failed to get recently added:', error.response?.status, error.message);
      return [];
    }
  }

  async getContinueWatching(userId: string): Promise<EmbyMediaItem[]> {
    try {
      console.log(`▶️ Getting continue watching for user ${userId}`);
      const response = await this.client.get(`/Users/${userId}/Items/Resume`, {
        params: {
          Fields: 'Overview,Genres,ProductionYear,RunTimeTicks',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop',
        }
      });
      
      console.log(`✅ Got ${response.data?.Items?.length || 0} continue watching items`);
      return response.data.Items || [];
    } catch (error: any) {
      console.error('Failed to get continue watching:', error.response?.status, error.message);
      return [];
    }
  }

  async getMediaLibraries(userId: string): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get(`/Users/${userId}/Views`, {
        params: {
          api_key: this.apiKey,
        }
      });
      
      const libraries = response.data.Items || [];
      
      // Get a representative image for each library
      for (const library of libraries) {
        try {
          // Try multiple approaches to get library images
          let libraryImageFound = false;
          
          // First attempt: Get recent items with good backdrop images
          let itemsResponse = await this.client.get(`/Users/${userId}/Items`, {
            params: {
              api_key: this.apiKey,
              ParentId: library.Id,
              Limit: 20,
              Fields: 'ImageTags,BackdropImageTags',
              ImageTypeLimit: 2,
              EnableImageTypes: 'Primary,Backdrop,Thumb',
              SortBy: 'DateCreated,Random',
              SortOrder: 'Descending',
              Recursive: true,
              IncludeItemTypes: 'Movie,Series,Episode'
            }
          });
          
          let items = itemsResponse.data.Items || [];
          
          // Prioritize items with backdrop images
          let itemWithBackdrop = items.find((item: any) => 
            item.ImageTags?.Backdrop || (item.BackdropImageTags && item.BackdropImageTags.length > 0)
          );
          
          if (itemWithBackdrop) {
            if (itemWithBackdrop.ImageTags?.Backdrop) {
              library.LibraryImageUrl = this.getImageUrl(itemWithBackdrop.Id, 'Backdrop', itemWithBackdrop.ImageTags.Backdrop);
              libraryImageFound = true;
            } else if (itemWithBackdrop.BackdropImageTags?.length > 0) {
              library.LibraryImageUrl = this.getImageUrl(itemWithBackdrop.Id, 'Backdrop', itemWithBackdrop.BackdropImageTags[0]);
              libraryImageFound = true;
            }
          }
          
          // Second attempt: Use primary images if no backdrop found
          if (!libraryImageFound) {
            const itemWithPrimary = items.find((item: any) => item.ImageTags?.Primary);
            if (itemWithPrimary) {
              library.LibraryImageUrl = this.getImageUrl(itemWithPrimary.Id, 'Primary', itemWithPrimary.ImageTags.Primary);
              libraryImageFound = true;
            }
          }
          
          // Third attempt: Get more items if still no image
          if (!libraryImageFound) {
            itemsResponse = await this.client.get(`/Users/${userId}/Items`, {
              params: {
                api_key: this.apiKey,
                ParentId: library.Id,
                Limit: 50,
                Fields: 'ImageTags,BackdropImageTags',
                EnableImageTypes: 'Primary,Backdrop,Thumb,Logo',
                SortBy: 'Random',
                Recursive: true
              }
            });
            
            items = itemsResponse.data.Items || [];
            const anyItemWithImage = items.find((item: any) => 
              item.ImageTags?.Primary || item.ImageTags?.Backdrop || 
              item.ImageTags?.Thumb || item.ImageTags?.Logo ||
              (item.BackdropImageTags && item.BackdropImageTags.length > 0)
            );
            
            if (anyItemWithImage) {
              // Use the best available image type
              if (anyItemWithImage.ImageTags?.Backdrop) {
                library.LibraryImageUrl = this.getImageUrl(anyItemWithImage.Id, 'Backdrop', anyItemWithImage.ImageTags.Backdrop);
              } else if (anyItemWithImage.BackdropImageTags?.length > 0) {
                library.LibraryImageUrl = this.getImageUrl(anyItemWithImage.Id, 'Backdrop', anyItemWithImage.BackdropImageTags[0]);
              } else if (anyItemWithImage.ImageTags?.Primary) {
                library.LibraryImageUrl = this.getImageUrl(anyItemWithImage.Id, 'Primary', anyItemWithImage.ImageTags.Primary);
              } else if (anyItemWithImage.ImageTags?.Thumb) {
                library.LibraryImageUrl = this.getImageUrl(anyItemWithImage.Id, 'Thumb', anyItemWithImage.ImageTags.Thumb);
              } else if (anyItemWithImage.ImageTags?.Logo) {
                library.LibraryImageUrl = this.getImageUrl(anyItemWithImage.Id, 'Logo', anyItemWithImage.ImageTags.Logo);
              }
              libraryImageFound = true;
            }
          }
          
          // Final fallback: Use library icon as background if no content images found
          if (!libraryImageFound) {
            library.LibraryImageUrl = null; // Will use CSS gradient fallback on frontend
          }
          
          console.log(`Library "${library.Name}" image: ${libraryImageFound ? 'Found from content' : 'Using fallback'}`);
        } catch (error) {
          console.error(`Failed to get library image for ${library.Name}:`, error);
          library.LibraryImageUrl = null; // Will use CSS gradient fallback on frontend
        }
      }
      
      return libraries;
    } catch (error) {
      console.error('Failed to get media libraries:', error);
      return [];
    }
  }

  async getLiveTvChannels(userId: string): Promise<EmbyMediaItem[]> {
    try {
      console.log('🔴 Getting Live TV channels');
      const params: any = {
        UserId: userId,
        EnableImages: true,
        ImageTypeLimit: 1,
        EnableImageTypes: 'Primary,Backdrop',
        Fields: 'ChannelInfo,MediaStreams,ChannelNumber,Type',
        SortBy: 'SortName',
        SortOrder: 'Ascending'
      };

      // Use access token if available
      if (this.accessToken) {
        params['X-MediaBrowser-Token'] = this.accessToken;
      } else if (this.apiKey && this.apiKey !== 'temp-key') {
        params['api_key'] = this.apiKey;
      }

      const response = await this.client.get('/LiveTv/Channels', { params });
      const channels = response.data.Items || [];
      
      console.log(`✅ Found ${channels.length} Live TV channels`);
      return channels;
    } catch (error) {
      console.error('❌ Failed to get Live TV channels:', error);
      return [];
    }
  }

  // Get Live TV channels organized by categories
  async getLiveTvChannelsByCategories(userId: string): Promise<any> {
    try {
      console.log('📺 Getting Live TV channels by categories');
      const channels = await this.getLiveTvChannels(userId);
      
      // Organize channels by categories based on name patterns
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

      channels.forEach(channel => {
        const name = channel.Name?.toLowerCase() || '';
        const number = channel.ChannelNumber || 0;
        
        // Categorize based on channel name patterns
        if (name.includes('news') || name.includes('noticias') || name.includes('24h') || name.includes('info')) {
          categories['Noticias'].push(channel);
        } else if (name.includes('sport') || name.includes('deporte') || name.includes('futbol') || name.includes('football')) {
          categories['Deportes'].push(channel);
        } else if (name.includes('kids') || name.includes('niños') || name.includes('infantil') || name.includes('cartoon')) {
          categories['Infantil'].push(channel);
        } else if (name.includes('music') || name.includes('música') || name.includes('mtv') || name.includes('hits')) {
          categories['Música'].push(channel);
        } else if (name.includes('discovery') || name.includes('history') || name.includes('national') || name.includes('documental')) {
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

      console.log(`📊 Channels organized into ${Object.keys(categories).length} categories`);
      return categories;
    } catch (error) {
      console.error('❌ Failed to organize Live TV channels:', error);
      return {};
    }
  }

  // Get current Live TV programs
  async getLiveTvPrograms(userId: string, channelIds?: string[]): Promise<any[]> {
    try {
      console.log('📅 Getting Live TV programs');
      const params: any = {
        UserId: userId,
        EnableImages: true,
        Fields: 'Overview,ChannelInfo,StartDate,EndDate',
        IsAiring: true
      };

      if (channelIds && channelIds.length > 0) {
        params.ChannelIds = channelIds.join(',');
      }

      // Use access token if available
      if (this.accessToken) {
        params['X-MediaBrowser-Token'] = this.accessToken;
      } else if (this.apiKey && this.apiKey !== 'temp-key') {
        params['api_key'] = this.apiKey;
      }

      const response = await this.client.get('/LiveTv/Programs', { params });
      const programs = response.data.Items || [];
      
      console.log(`✅ Found ${programs.length} Live TV programs`);
      return programs;
    } catch (error) {
      console.error('❌ Failed to get Live TV programs:', error);
      return [];
    }
  }

  async getLibraryItems(userId: string, libraryId: string, limit: number = 10000, startIndex: number = 0): Promise<{ items: EmbyMediaItem[], totalRecordCount: number }> {
    try {
      console.log(`Loading library items for ${libraryId} with limit: ${limit}, startIndex: ${startIndex}`);
      const params: any = {
        ParentId: libraryId,
        Limit: limit,
        StartIndex: startIndex,
        Fields: 'Overview,Genres,ProductionYear,RunTimeTicks,UserData,CommunityRating,OfficialRating,ImageTags,BackdropImageTags,HasPrimaryImage',
        ImageTypeLimit: 3,
        EnableImageTypes: 'Primary,Backdrop,Thumb',
        Recursive: true,
        SortBy: 'SortName',
        SortOrder: 'Ascending',
        IncludeItemTypes: 'Movie,Series',
        EnableTotalRecordCount: true
      };

      // Use access token if available
      if (this.accessToken) {
        params['X-MediaBrowser-Token'] = this.accessToken;
      } else if (this.apiKey && this.apiKey !== 'temp-key') {
        params['api_key'] = this.apiKey;
      }

      const response = await this.client.get(`/Users/${userId}/Items`, { params });
      
      const items = response.data.Items || [];
      const totalRecordCount = response.data.TotalRecordCount || 0;
      console.log(`📚 Emby API Response - Items: ${items.length}, TotalRecordCount: ${totalRecordCount}, StartIndex: ${startIndex}`);
      console.log(`📊 Full response keys:`, Object.keys(response.data));
      
      // Additional client-side filtering
      const playableItems = items.filter(item => {
        const type = item.Type?.toLowerCase();
        const isPlayable = ['movie', 'series', 'episode', 'video', 'musicvideo', 'audio', 'book', 'channel', 'livetv'].includes(type);
        
        const isM3U = item.Path?.toLowerCase().includes('.m3u') || 
                     item.MediaStreams?.some((stream: any) => stream.Codec === 'hls') ||
                     item.Type === 'Channel' || 
                     item.Type === 'LiveTv';
        
        if (isM3U) return true;
        return isPlayable;
      });
      
      console.log(`Filtered to ${playableItems.length} playable items`);
      return { items: playableItems, totalRecordCount };
    } catch (error) {
      console.error('Failed to get library items:', error);
      return { items: [], totalRecordCount: 0 };
    }
  }

  async searchMedia(userId: string, searchTerm: string, limit: number = 20): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get(`/Users/${userId}/Items`, {
        params: {
          api_key: this.apiKey,
          SearchTerm: searchTerm,
          Limit: limit,
          Fields: 'Overview,Genres,ProductionYear,RunTimeTicks,UserData,CommunityRating,OfficialRating',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop',
          Recursive: true
        }
      });
      
      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to search media:', error);
      return [];
    }
  }

  getImageUrl(itemId: string, imageType: string = 'Primary', tag?: string): string {
    // Use proxy endpoint to avoid CORS issues and handle authentication
    const params = new URLSearchParams();
    params.append('maxHeight', '600');
    params.append('maxWidth', '400');
    params.append('quality', '90');
    
    if (tag) {
      params.append('tag', tag);
    }
    
    const proxyUrl = `/api/image-proxy/${itemId}/${imageType}?${params.toString()}`;
    return proxyUrl;
  }

  getLibraryImageUrl(itemId: string, imageType: string = 'Backdrop', tag?: string): string {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      maxHeight: '800',
      maxWidth: '1200',
      quality: '85',
      fillHeight: '400',
      fillWidth: '800'
    });
    
    if (tag) {
      params.append('tag', tag);
    }
    
    return `${this.baseUrl}/Items/${itemId}/Images/${imageType}?${params.toString()}`;
  }

  generateLibraryGradient(libraryName: string): string {
    // Generate a data URL with CSS gradient based on library name
    const hash = libraryName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Generate colors based on hash
    const hue1 = Math.abs(hash) % 360;
    const hue2 = (hue1 + 60) % 360;
    
    // Choose color scheme based on library type
    let colors;
    const name = libraryName.toLowerCase();
    if (name.includes('película') || name.includes('movie') || name.includes('film')) {
      colors = ['#1e40af', '#3b82f6', '#60a5fa']; // Blue theme for movies
    } else if (name.includes('serie') || name.includes('tv') || name.includes('show')) {
      colors = ['#7c3aed', '#a855f7', '#c084fc']; // Purple theme for series
    } else if (name.includes('4k') || name.includes('uhd')) {
      colors = ['#dc2626', '#ef4444', '#f87171']; // Red theme for 4K
    } else if (name.includes('anime')) {
      colors = ['#f59e0b', '#fbbf24', '#fcd34d']; // Orange theme for anime
    } else if (name.includes('música') || name.includes('music')) {
      colors = ['#059669', '#10b981', '#34d399']; // Green theme for music
    } else {
      colors = [`hsl(${hue1}, 70%, 50%)`, `hsl(${hue2}, 70%, 60%)`];
    }
    
    const gradient = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2] || colors[1]} 100%)`;
    
    // Create a simple data URL with the gradient
    const svg = `
      <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${colors[1]};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors[2] || colors[1]};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
              fill="white" font-size="48" font-family="Arial, sans-serif" opacity="0.3">
          ${libraryName.split(' ').slice(0, 2).join(' ')}
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  getBestImageUrl(item: any): string | null {
    // Try Primary image first (poster) - use proxy for authentication
    if (item.ImageTags?.Primary) {
      return `/api/image-proxy/${item.Id}/Primary?tag=${item.ImageTags.Primary}`;
    }
    
    // Fallback to Backdrop
    if (item.ImageTags?.Backdrop) {
      return `/api/image-proxy/${item.Id}/Backdrop?tag=${item.ImageTags.Backdrop}`;
    }
    
    // Check BackdropImageTags array
    if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {
      return `/api/image-proxy/${item.Id}/Backdrop?tag=${item.BackdropImageTags[0]}`;
    }
    
    // Fallback to Thumb
    if (item.ImageTags?.Thumb) {
      return `/api/image-proxy/${item.Id}/Thumb?tag=${item.ImageTags.Thumb}`;
    }
    
    // Fallback to Logo
    if (item.ImageTags?.Logo) {
      return `/api/image-proxy/${item.Id}/Logo?tag=${item.ImageTags.Logo}`;
    }
    
    // Try without tag if HasPrimaryImage is true
    if (item.HasPrimaryImage) {
      return `/api/image-proxy/${item.Id}/Primary`;
    }
    
    return null;
  }

  getStreamUrl(itemId: string, userId: string, mediaType?: string): string {
    // Use optimized streaming parameters to avoid FFmpeg transcoding issues
    const params = new URLSearchParams({
      'api_key': this.apiKey,
      'UserId': userId,
      'Static': 'true',
      'Container': 'mp4,mkv,webm',
      'VideoCodec': 'h264,hevc,vp9',
      'AudioCodec': 'aac,mp3,ac3',
      'SubtitleCodec': '',  // Disable subtitles to avoid PGS errors
      'EnableSubtitlesInManifest': 'false',
      'MaxStreamingBitrate': '100000000',
      'MaxVideoBitRate': '50000000',
      'MaxAudioBitRate': '320000',
      'AnalyzeDurationMs': '200000',  // 200M equivalent
      'ProbeSizeBytes': '200000000',   // 200M equivalent
      // Configuración de idioma español por defecto
      'AudioStreamIndex': '1',  // Intentar segunda pista de audio (suele ser español)
      'SubtitleStreamIndex': '1',  // Intentar segunda pista de subtítulos
      'PreferredLanguage': 'es',
      'Language': 'es-ES',
      'EnableAudioVbrEncoding': 'false'
    });

    // Add access token if available
    if (this.accessToken) {
      params.set('X-MediaBrowser-Token', this.accessToken);
    }

    return `${this.baseUrl}/Videos/${itemId}/stream?${params.toString()}`;
  }

  // Get M3U playlist URL from server
  getM3UStreamUrl(itemId: string, userId: string): string {
    const params = new URLSearchParams();
    
    // Use access token if available
    if (this.accessToken) {
      params.append('X-MediaBrowser-Token', this.accessToken);
    } else {
      params.append('api_key', this.apiKey);
    }
    
    params.append('UserId', userId);
    params.append('DeviceId', 'solovideo-web');

    const m3uUrl = `${this.baseUrl}/Videos/${itemId}/hls/playlist.m3u8?${params.toString()}`;
    console.log(`📺 M3U Stream URL for ${itemId}: ${m3uUrl}`);
    return m3uUrl;
  }

  // Get direct channel stream URL for live TV
  getChannelStreamUrl(itemId: string, userId: string): string {
    const params = new URLSearchParams();
    
    // Use access token if available
    if (this.accessToken) {
      params.append('X-MediaBrowser-Token', this.accessToken);
    } else {
      params.append('api_key', this.apiKey);
    }
    
    params.append('UserId', userId);
    params.append('DeviceId', 'solovideo-web');

    const channelUrl = `${this.baseUrl}/LiveTv/LiveStreamFiles/${itemId}/stream.m3u8?${params.toString()}`;
    console.log(`📡 Channel Stream URL for ${itemId}: ${channelUrl}`);
    return channelUrl;
  }

  // Check if item is M3U content
  isM3UContent(item: any): boolean {
    const type = item.Type?.toLowerCase();
    const hasM3UPath = item.Path?.toLowerCase().includes('.m3u');
    const hasHLSStream = item.MediaStreams?.some((stream: any) => stream.Codec === 'hls');
    const isLiveTV = type === 'channel' || type === 'livetv';
    
    return hasM3UPath || hasHLSStream || isLiveTV;
  }

  async reportPlaybackStart(userId: string, itemId: string): Promise<void> {
    try {
      if (!userId || !itemId) return;
      
      await this.client.post(`/Sessions/Playing`, {
        ItemId: itemId,
        UserId: userId,
        MediaSourceId: itemId,
        CanSeek: true,
        PlayMethod: 'DirectStream',
        PlaySessionId: `web-${itemId}-${userId}`,
        EventName: 'playbackstart',
        PositionTicks: 0
      }, {
        params: { api_key: this.apiKey }
      });
    } catch (error: any) {
      if (!error.response || error.response.status !== 400) {
        console.error('Failed to report playback start:', error);
      }
    }
  }

  async reportPlaybackProgress(userId: string, itemId: string, positionTicks: number): Promise<void> {
    try {
      // Only report if position is valid
      if (positionTicks < 0 || !userId || !itemId) {
        return;
      }
      
      await this.client.post(`/Sessions/Playing/Progress`, {
        ItemId: itemId,
        UserId: userId,
        PositionTicks: Math.floor(positionTicks),
        IsPaused: false,
        PlayMethod: 'DirectStream',
        PlaySessionId: `web-${itemId}-${userId}`,
        EventName: 'timeupdate'
      }, {
        params: { api_key: this.apiKey }
      });
    } catch (error: any) {
      // Only log if it's not a common validation error
      if (!error.response || error.response.status !== 400) {
        console.error('Failed to report playback progress:', error);
      }
    }
  }

  async reportPlaybackStop(userId: string, itemId: string, positionTicks: number): Promise<void> {
    try {
      if (!userId || !itemId) return;
      
      await this.client.post(`/Sessions/Playing/Stopped`, {
        ItemId: itemId,
        UserId: userId,
        PositionTicks: Math.floor(positionTicks),
        PlayMethod: 'DirectStream',
        PlaySessionId: `web-${itemId}-${userId}`,
        EventName: 'playbackstop'
      }, {
        params: { api_key: this.apiKey }
      });
    } catch (error: any) {
      if (!error.response || error.response.status !== 400) {
        console.error('Failed to report playback stop:', error);
      }
    }
  }

  async getRecommendations(userId: string, limit: number = 20): Promise<EmbyMediaItem[]> {
    try {
      // Get multiple recommendation sources for advanced personalization
      const [suggestedItems, recentItems, popularItems, genreBasedItems] = await Promise.all([
        this.getSuggestedItems(userId, Math.ceil(limit * 0.4)),
        this.getRecentlyPlayed(userId, 8),
        this.getPopularItems(userId, Math.ceil(limit * 0.3)),
        this.getGenreBasedRecommendations(userId, Math.ceil(limit * 0.3))
      ]);

      // Smart recommendation mixing algorithm
      const recommendations = [];
      const usedIds = new Set();
      
      // Priority order: Emby suggestions (highest), genre-based, popular, recent
      const sources = [
        { items: suggestedItems, priority: 1 },
        { items: genreBasedItems, priority: 2 },
        { items: popularItems, priority: 3 },
        { items: recentItems, priority: 4 }
      ];

      // Interleave items from different sources for variety
      let addedCount = 0;
      const maxIterations = Math.max(...sources.map(s => s.items.length));
      
      for (let i = 0; i < maxIterations && addedCount < limit; i++) {
        for (const source of sources) {
          if (addedCount >= limit) break;
          if (i < source.items.length) {
            const item = source.items[i];
            if (!usedIds.has(item.Id)) {
              recommendations.push(item);
              usedIds.add(item.Id);
              addedCount++;
            }
          }
        }
      }

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  async getGenreBasedRecommendations(userId: string, limit: number = 15): Promise<EmbyMediaItem[]> {
    try {
      // Get user's recently played items to analyze genre preferences
      const recentItems = await this.getRecentlyPlayed(userId, 10);
      if (recentItems.length === 0) {
        return this.getPopularItems(userId, limit);
      }

      // Extract and count genres from recent viewing history
      const genreCount = new Map<string, number>();
      recentItems.forEach(item => {
        if (item.Genres) {
          item.Genres.forEach(genre => {
            genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
          });
        }
      });

      // Get top 3 most watched genres
      const topGenres = Array.from(genreCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      if (topGenres.length === 0) {
        return this.getPopularItems(userId, limit);
      }

      // Get recommendations based on favorite genres
      const response = await this.client.get(`/Users/${userId}/Items`, {
        params: {
          api_key: this.apiKey,
          Recursive: true,
          IncludeItemTypes: 'Movie,Episode,Series,Audio',
          Fields: 'Overview,Genres,People,ProductionYear,RunTimeTicks,UserData,PrimaryImageAspectRatio,CommunityRating',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop',
          Genres: topGenres.join('|'),
          SortBy: 'CommunityRating,Random',
          SortOrder: 'Descending',
          Limit: limit,
          MinCommunityRating: 6.0 // Only recommend well-rated content
        }
      });

      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to get genre-based recommendations:', error);
      return [];
    }
  }

  async getRecentlyPlayed(userId: string, limit: number = 10): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get(`/Users/${userId}/Items`, {
        params: {
          api_key: this.apiKey,
          Recursive: true,
          IncludeItemTypes: 'Movie,Episode,Series,Audio',
          Fields: 'Overview,Genres,People,ProductionYear,RunTimeTicks,UserData,PrimaryImageAspectRatio',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop',
          SortBy: 'DatePlayed',
          SortOrder: 'Descending',
          Filters: 'IsPlayed',
          Limit: limit
        }
      });
      
      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to get recently played:', error);
      return [];
    }
  }

  async getSuggestedItems(userId: string, limit: number = 20): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get(`/Users/${userId}/Suggestions`, {
        params: {
          api_key: this.apiKey,
          Fields: 'Overview,Genres,People,ProductionYear,RunTimeTicks,UserData,PrimaryImageAspectRatio',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop',
          Limit: limit
        }
      });
      
      return response.data.Items || [];
    } catch (error) {
      // Fallback to popular items if suggestions fail
      return this.getPopularItems(userId, limit);
    }
  }

  async getPopularItems(userId: string, limit: number = 20): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get(`/Users/${userId}/Items`, {
        params: {
          api_key: this.apiKey,
          Recursive: true,
          IncludeItemTypes: 'Movie,Episode,Series,Audio',
          Fields: 'Overview,Genres,People,ProductionYear,RunTimeTicks,UserData,PrimaryImageAspectRatio,CommunityRating',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop',
          SortBy: 'CommunityRating,SortName',
          SortOrder: 'Descending',
          Limit: limit
        }
      });
      
      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to get popular items:', error);
      return [];
    }
  }

  async getSeriesDetails(userId: string, seriesId: string): Promise<EmbyMediaItem | null> {
    try {
      const response = await this.client.get(`/Users/${userId}/Items/${seriesId}`, {
        params: {
          api_key: this.apiKey,
          Fields: 'Overview,Genres,ProductionYear,RunTimeTicks,UserData,People,Studios,CommunityRating,OfficialRating'
        }
      });
      
      return response.data || null;
    } catch (error) {
      console.error('Failed to get series details:', error);
      return null;
    }
  }

  async getSeriesSeasons(userId: string, seriesId: string): Promise<EmbyMediaItem[]> {
    try {
      const response = await this.client.get(`/Shows/${seriesId}/Seasons`, {
        params: {
          api_key: this.apiKey,
          UserId: userId,
          Fields: 'Overview,ItemCounts,UserData',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop'
        }
      });
      
      return response.data.Items || [];
    } catch (error) {
      console.error('Failed to get series seasons:', error);
      return [];
    }
  }

  async getSeasonEpisodes(userId: string, seasonId: string): Promise<EmbyMediaItem[]> {
    try {
      // Try the standard episodes endpoint first
      let response = await this.client.get(`/Users/${userId}/Items`, {
        params: {
          api_key: this.apiKey,
          ParentId: seasonId,
          IncludeItemTypes: 'Episode',
          Fields: 'Overview,MediaSources,RunTimeTicks,UserData,ParentIndexNumber,IndexNumber',
          ImageTypeLimit: 1,
          EnableImageTypes: 'Primary,Backdrop,Thumb',
          SortBy: 'ParentIndexNumber,IndexNumber',
          SortOrder: 'Ascending'
        }
      });
      
      if (response.data.Items && response.data.Items.length > 0) {
        return response.data.Items;
      }
      
      // Fallback: try the Shows endpoint
      try {
        response = await this.client.get(`/Shows/${seasonId}/Episodes`, {
          params: {
            api_key: this.apiKey,
            UserId: userId,
            Fields: 'Overview,MediaSources,RunTimeTicks,UserData,ParentIndexNumber,IndexNumber',
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary,Backdrop,Thumb'
          }
        });
        
        return response.data.Items || [];
      } catch (fallbackError) {
        console.log('Shows endpoint also failed, returning empty array');
        return [];
      }
      
    } catch (error) {
      console.error('Failed to get season episodes:', error);
      return [];
    }
  }

  async getItemDetails(userId: string, itemId: string): Promise<EmbyMediaItem | null> {
    try {
      const response = await this.client.get(`/Users/${userId}/Items/${itemId}`, {
        params: {
          api_key: this.apiKey,
          Fields: 'Overview,Genres,ProductionYear,RunTimeTicks,UserData,SeriesInfo,ParentId,SeriesId'
        }
      });
      
      return response.data || null;
    } catch (error) {
      console.error('Failed to get item details:', error);
      return null;
    }
  }
}
