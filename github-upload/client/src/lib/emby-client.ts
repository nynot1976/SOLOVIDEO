import { apiRequest } from "./queryClient";

export interface MediaItem {
  embyId: string;
  name: string;
  type: string;
  overview: string;
  year?: number;
  runtime?: number;
  posterUrl?: string;
  backdropUrl?: string;
  playCount: number;
  resumePosition: number;
  playedPercentage?: number;
}

export interface SeriesData {
  embyId: string;
  name: string;
  type: string;
  overview: string;
  year: number;
  genres: string[];
  rating: number;
  officialRating: string;
  people: any[];
  studios: any[];
  posterUrl: string;
  backdropUrl: string;
  playCount: number;
  userData: any;
}

export interface Season {
  embyId: string;
  name: string;
  overview: string;
  seasonNumber: number;
  episodeCount: number;
  posterUrl: string;
  userData: any;
}

export interface Episode {
  embyId: string;
  name: string;
  overview: string;
  episodeNumber: number;
  seasonNumber: number;
  runtime: number;
  posterUrl: string;
  playCount: number;
  resumePosition: number;
  playedPercentage: number;
}

export interface ConnectionStatus {
  connected: boolean;
  serverName?: string;
  serverUrl?: string;
  port?: number;
  error?: string;
}

export interface ServerConnection {
  url: string;
  port: number;
  apiKey: string;
  name: string;
}

export interface Library {
  embyId: string;
  name: string;
  type: string;
  overview: string;
  posterUrl?: string;
  backgroundImageUrl?: string;
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

export const embyClient = {
  async testConnection(connection: ServerConnection): Promise<ConnectionStatus> {
    try {
      const response = await apiRequest("POST", "/api/servers/test", connection);
      return await response.json();
    } catch (error) {
      return { connected: false, error: "Connection test failed" };
    }
  },

  async connectToServer(connection: ServerConnection): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiRequest("POST", "/api/servers/connect", connection);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Connection failed" };
    }
  },

  async getConnectionStatus(): Promise<ConnectionStatus> {
    try {
      const response = await apiRequest("GET", "/api/connection/status");
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch connection status:", error);
      return { connected: false };
    }
  },

  async getRecentMedia(): Promise<MediaItem[]> {
    try {
      const response = await apiRequest("GET", "/api/media/recent");
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch recent media:", error);
      return [];
    }
  },

  async getContinueWatching(): Promise<MediaItem[]> {
    try {
      const response = await apiRequest("GET", "/api/media/continue");
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch continue watching:", error);
      return [];
    }
  },

  async getStreamUrl(embyId: string): Promise<string | null> {
    try {
      const response = await apiRequest("GET", `/api/media/${embyId}/stream`);
      const data = await response.json();
      return data.streamUrl;
    } catch (error) {
      console.error("Failed to get stream URL:", error);
      return null;
    }
  },

  async reportPlaybackStart(embyId: string): Promise<void> {
    try {
      await apiRequest("POST", "/api/playback/start", { embyId });
    } catch (error) {
      console.error("Failed to report playback start:", error);
    }
  },

  async reportPlaybackProgress(embyId: string, positionSeconds: number): Promise<void> {
    try {
      await apiRequest("POST", "/api/playback/progress", { embyId, positionSeconds });
    } catch (error) {
      console.error("Failed to report playback progress:", error);
    }
  },

  async reportPlaybackStop(embyId: string, positionSeconds: number): Promise<void> {
    try {
      await apiRequest("POST", "/api/playback/stop", { embyId, positionSeconds });
    } catch (error) {
      console.error("Failed to report playback stop:", error);
    }
  },

  async getLibraries(): Promise<Library[]> {
    try {
      const response = await apiRequest("GET", "/api/libraries");
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch libraries:", error);
      return [];
    }
  },

  async getLibraryItems(libraryId: string, limit: number = 100, page: number = 1): Promise<{ items: MediaItem[], pagination: any }> {
    try {
      const response = await apiRequest("GET", `/api/libraries/${libraryId}/items?limit=${limit}&page=${page}`);
      const data = await response.json();
      
      // Manejar respuestas que no tienen paginación (formato anterior)
      if (Array.isArray(data)) {
        return {
          items: data,
          pagination: {
            page: 1,
            limit: data.length,
            totalItems: data.length,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
      }
      
      return data;
    } catch (error) {
      console.error("Failed to fetch library items:", error);
      return { items: [], pagination: { page: 1, limit: 100, totalItems: 0, hasNextPage: false, hasPreviousPage: false } };
    }
  },

  async searchMedia(searchTerm: string, limit: number = 20): Promise<MediaItem[]> {
    try {
      const response = await apiRequest("GET", `/api/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to search media:", error);
      return [];
    }
  },

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return await response.json();
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Error de autenticación" };
    }
  },

  async getAuthStatus(): Promise<{ authenticated: boolean; user?: any }> {
    try {
      const response = await apiRequest("GET", "/api/auth/status");
      return await response.json();
    } catch (error) {
      return { authenticated: false };
    }
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      const response = await apiRequest("POST", "/api/auth/logout");
      return await response.json();
    } catch (error) {
      return { success: false };
    }
  },

  async getRecommendations(limit: number = 20): Promise<MediaItem[]> {
    try {
      const response = await apiRequest("GET", `/api/media/recommendations?limit=${limit}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      return [];
    }
  },
};
