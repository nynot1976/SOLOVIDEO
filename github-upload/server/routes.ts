import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { EmbyService } from "./services/emby";
import { MediaServerFactory, type MediaServerService } from "./services/server-factory";
import { TDTService } from "./services/tdt";
import axios from "axios";
import { insertServerSchema, activeSessions, type LoginCredentials, type AuthSession, type ActiveSession, type InsertActiveSession } from "@shared/schema";
import { db } from "./db";
import { eq, desc, gt, lt } from "drizzle-orm";
import { nanoid } from 'nanoid';
import { z } from "zod";
// HLS parsing - temporarily disabled for deployment
// import { Parser as M3UParser } from "m3u8-parser";
// import { parse as parseHLS } from "hls-parser";

let mediaService: MediaServerService | null = null;
let currentUserId: string | null = null;
let currentAuthSession: AuthSession | null = null;

// Session storage with persistence (renamed to avoid conflict with DB table)
const sessionStorage = new Map<string, AuthSession>();
let currentSessionId: string | null = null;
let currentSessionKey: string | null = null;

// TDT Service instance
const tdtService = new TDTService();

// Clean up inactive sessions (older than 30 minutes)
async function cleanupInactiveSessions() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  try {
    await db.delete(activeSessions).where(lt(activeSessions.lastActivity, thirtyMinutesAgo));
  } catch (error) {
    console.error('Error cleaning up sessions:', error);
  }
}

// Update session activity
async function updateSessionActivity(sessionId: string) {
  try {
    await db.update(activeSessions)
      .set({ lastActivity: new Date() })
      .where(eq(activeSessions.sessionId, sessionId));
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}

// Create new session
async function createSession(userId: string, username: string, serverName: string, serverUrl: string, deviceInfo: string, ipAddress: string): Promise<string> {
  const sessionId = nanoid();
  try {
    await db.insert(activeSessions).values({
      sessionId,
      userId,
      username,
      serverName,
      serverUrl,
      deviceInfo,
      ipAddress,
      isActive: true
    });
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    return sessionId;
  }
}

// Remove session
async function removeSession(sessionId: string) {
  try {
    await db.delete(activeSessions).where(eq(activeSessions.sessionId, sessionId));
  } catch (error) {
    console.error('Error removing session:', error);
  }
}

function getDemoLibraryContent(libraryId: string) {
  const baseId = libraryId.replace('demo-', '');
  
  switch (baseId) {
    case 'movies':
      return [
        {
          embyId: "demo-movie-1",
          name: "El Origen de los Sueños",
          type: "Movie",
          overview: "Un thriller psicológico que explora los límites entre la realidad y los sueños.",
          year: 2023,
          runtime: 148,
          genres: ["Ciencia ficción", "Thriller", "Drama"],
          rating: 8.7,
          officialRating: "PG-13",
          posterUrl: "/api/image-proxy/demo-movie-1/primary",
          backdropUrl: "/api/image-proxy/demo-movie-1/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        },
        {
          embyId: "demo-movie-2",
          name: "La Ciudad Perdida",
          type: "Movie",
          overview: "Una aventura épica en busca de una civilización antigua.",
          year: 2023,
          runtime: 132,
          genres: ["Aventura", "Acción", "Fantasía"],
          rating: 7.9,
          officialRating: "PG-13",
          posterUrl: "/api/image-proxy/demo-movie-2/primary",
          backdropUrl: "/api/image-proxy/demo-movie-2/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        },
        {
          embyId: "demo-movie-3",
          name: "Misterio en la Montaña",
          type: "Movie",
          overview: "Un detective investiga una serie de desapariciones en un pueblo remoto.",
          year: 2022,
          runtime: 115,
          genres: ["Misterio", "Suspense", "Drama"],
          rating: 8.2,
          officialRating: "R",
          posterUrl: "/api/image-proxy/demo-movie-3/primary",
          backdropUrl: "/api/image-proxy/demo-movie-3/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        }
      ];
    
    case 'series':
      return [
        {
          embyId: "demo-series-1",
          name: "Los Guardianes del Tiempo",
          type: "Series",
          overview: "Una serie de ciencia ficción sobre viajeros del tiempo que protegen la historia.",
          year: 2023,
          runtime: null,
          genres: ["Ciencia ficción", "Drama", "Aventura"],
          rating: 8.9,
          officialRating: "TV-14",
          posterUrl: "/api/image-proxy/demo-series-1/primary",
          backdropUrl: "/api/image-proxy/demo-series-1/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        },
        {
          embyId: "demo-series-2",
          name: "Academia de Magia",
          type: "Series",
          overview: "Jóvenes estudiantes aprenden a controlar sus poderes mágicos.",
          year: 2022,
          runtime: null,
          genres: ["Fantasía", "Drama", "Juventud"],
          rating: 8.1,
          officialRating: "TV-PG",
          posterUrl: "/api/image-proxy/demo-series-2/primary",
          backdropUrl: "/api/image-proxy/demo-series-2/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        }
      ];
    
    case 'anime':
      return [
        {
          embyId: "demo-anime-1",
          name: "Sueños de Acero",
          type: "Movie",
          overview: "Un anime sobre robots gigantes y la lucha por el futuro de la humanidad.",
          year: 2023,
          runtime: 95,
          genres: ["Anime", "Acción", "Ciencia ficción"],
          rating: 8.5,
          officialRating: "PG-13",
          posterUrl: "/api/image-proxy/demo-anime-1/primary",
          backdropUrl: "/api/image-proxy/demo-anime-1/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        },
        {
          embyId: "demo-anime-2",
          name: "El Jardín de los Espíritus",
          type: "Movie",
          overview: "Una hermosa historia sobre la conexión entre el mundo humano y espiritual.",
          year: 2022,
          runtime: 102,
          genres: ["Anime", "Fantasía", "Drama"],
          rating: 9.1,
          officialRating: "PG",
          posterUrl: "/api/image-proxy/demo-anime-2/primary",
          backdropUrl: "/api/image-proxy/demo-anime-2/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        }
      ];
    
    case 'music':
      return [
        {
          embyId: "demo-music-1",
          name: "Sinfonía Digital",
          type: "Audio",
          overview: "Una colección de música electrónica instrumental.",
          year: 2023,
          runtime: 45,
          genres: ["Electrónica", "Instrumental"],
          rating: 8.0,
          officialRating: null,
          posterUrl: "/api/image-proxy/demo-music-1/primary",
          backdropUrl: "/api/image-proxy/demo-music-1/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        },
        {
          embyId: "demo-music-2",
          name: "Voces del Viento",
          type: "Audio",
          overview: "Música relajante con sonidos de la naturaleza.",
          year: 2022,
          runtime: 38,
          genres: ["Relajación", "Naturaleza"],
          rating: 7.8,
          officialRating: null,
          posterUrl: "/api/image-proxy/demo-music-2/primary",
          backdropUrl: "/api/image-proxy/demo-music-2/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0
        }
      ];
    
    case '357b2b218b5adb74c3e8d4e29f38683f': // Televisión en directo
    case 'livetv':
    case 'tv-directo':
      return [
        {
          embyId: "live-channel-1",
          name: "Canal Internacional 24/7",
          type: "Channel",
          overview: "Transmisión en vivo las 24 horas con contenido internacional variado.",
          year: null,
          runtime: null,
          genres: ["Live TV", "Internacional"],
          rating: null,
          officialRating: null,
          posterUrl: "/api/image-proxy/live-channel-1/primary",
          backdropUrl: "/api/image-proxy/live-channel-1/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0,
          isLiveContent: true
        },
        {
          embyId: "live-channel-2",
          name: "Noticias M3U Stream",
          type: "Channel",
          overview: "Canal de noticias en streaming continuo formato M3U8.",
          year: null,
          runtime: null,
          genres: ["Live TV", "Noticias"],
          rating: null,
          officialRating: null,
          posterUrl: "/api/image-proxy/live-channel-2/primary",
          backdropUrl: "/api/image-proxy/live-channel-2/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0,
          isLiveContent: true
        },
        {
          embyId: "live-channel-3",
          name: "Deportes IPTV Live",
          type: "LiveTv",
          overview: "Transmisión deportiva en vivo vía IPTV con tecnología M3U.",
          year: null,
          runtime: null,
          genres: ["Live TV", "Deportes"],
          rating: null,
          officialRating: null,
          posterUrl: "/api/image-proxy/live-channel-3/primary",
          backdropUrl: "/api/image-proxy/live-channel-3/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0,
          isLiveContent: true
        },
        {
          embyId: "live-channel-4",
          name: "Música M3U Continua",
          type: "Channel",
          overview: "Música en streaming continuo formato HLS/M3U8.",
          year: null,
          runtime: null,
          genres: ["Live TV", "Música"],
          rating: null,
          officialRating: null,
          posterUrl: "/api/image-proxy/live-channel-4/primary",
          backdropUrl: "/api/image-proxy/live-channel-4/backdrop",
          playCount: 0,
          resumePosition: 0,
          playedPercentage: 0,
          isLiveContent: true
        }
      ];

    default:
      return [];
  }
}

// Initialize with active server on startup
async function initializeActiveServer() {
  try {
    const activeServer = await storage.getActiveServer();
    if (activeServer) {
      mediaService = MediaServerFactory.createService(activeServer);
      console.log(`Initialized with active server: ${activeServer.name} (${activeServer.serverType})`);
    } else {
      // Create default Restwo server if none exists
      const defaultServer = await storage.createServer({
        name: "Restwo",
        url: "https://restwo.stream-cloud.es",
        port: 443,
        apiKey: "28a007166b3f441594e19b029f84b4dc",
        serverType: "emby"
      });
      await storage.setActiveServer(defaultServer.id);
      mediaService = MediaServerFactory.createService(defaultServer);
      console.log("Created and activated default Restwo server");
    }
  } catch (error) {
    console.error("Failed to initialize active server:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize active server on startup
  await initializeActiveServer();
  
  // Server management endpoints
  app.get("/api/servers", async (req, res) => {
    try {
      const servers = await storage.getAllServers();
      res.json(servers);
    } catch (error) {
      console.error("Error fetching servers:", error);
      res.status(500).json({ error: "Failed to fetch servers" });
    }
  });

  // Get supported server types
  app.get("/api/servers/types", async (req, res) => {
    try {
      const supportedTypes = MediaServerFactory.getSupportedServerTypes().map(type => ({
        value: type,
        label: MediaServerFactory.getServerDisplayName(type),
        defaultPort: MediaServerFactory.getDefaultPort(type)
      }));
      res.json(supportedTypes);
    } catch (error) {
      console.error("Error fetching server types:", error);
      res.status(500).json({ error: "Failed to fetch server types" });
    }
  });

  // Server status monitoring endpoints
  app.get("/api/servers/status", async (req, res) => {
    try {
      const servers = await storage.getAllServers();
      const statusPromises = servers.map(async (server) => {
        const startTime = Date.now();
        let isOnline = false;
        let responseTime = 0;
        let error = null;
        let metrics = null;

        try {
          const testService = new EmbyService(server.url, server.port, server.apiKey);
          isOnline = await testService.testConnection();
          responseTime = Date.now() - startTime;

          if (isOnline) {
            // Get server metrics (mock data for now, can be enhanced with real Emby API calls)
            metrics = {
              cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
              memoryUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
              diskUsage: Math.floor(Math.random() * 50) + 20, // 20-70%
              activeUsers: Math.floor(Math.random() * 5) + 1, // 1-5 users
              totalLibraries: Math.floor(Math.random() * 8) + 3, // 3-10 libraries
              totalItems: Math.floor(Math.random() * 5000) + 1000, // 1000-6000 items
            };
          }
        } catch (err) {
          error = err instanceof Error ? err.message : "Connection failed";
          responseTime = Date.now() - startTime;
        }

        return {
          id: server.id,
          name: server.name,
          url: server.url,
          port: server.port,
          isActive: server.isActive,
          isOnline,
          responseTime,
          lastChecked: new Date().toISOString(),
          metrics,
          error,
        };
      });

      const serverStatuses = await Promise.all(statusPromises);
      res.json(serverStatuses);
    } catch (error) {
      console.error("Error fetching server status:", error);
      res.status(500).json({ error: "Failed to fetch server status" });
    }
  });

  app.post("/api/servers/:id/test", async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      const servers = await storage.getAllServers();
      const server = servers.find(s => s.id === serverId);
      
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      const startTime = Date.now();
      const testService = new EmbyService(server.url, server.port, server.apiKey);
      const isOnline = await testService.testConnection();
      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        isOnline,
        responseTime,
        message: isOnline ? "Connection successful" : "Connection failed"
      });
    } catch (error) {
      console.error("Error testing server connection:", error);
      res.status(500).json({ error: "Failed to test connection" });
    }
  });

  app.post("/api/servers/refresh-all", async (req, res) => {
    try {
      // This endpoint triggers a refresh of all server statuses
      // The actual refresh is handled by the client-side query invalidation
      res.json({ success: true, message: "Refresh triggered" });
    } catch (error) {
      console.error("Error refreshing servers:", error);
      res.status(500).json({ error: "Failed to refresh servers" });
    }
  });

  app.post("/api/servers", async (req, res) => {
    try {
      const result = insertServerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid server data", details: result.error.errors });
      }

      const server = await storage.createServer(result.data);
      res.json(server);
    } catch (error) {
      console.error("Error creating server:", error);
      res.status(500).json({ error: "Failed to create server" });
    }
  });

  app.put("/api/servers/:id", async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      const result = insertServerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid server data", details: result.error.errors });
      }

      const server = await storage.updateServer(serverId, result.data);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      res.json(server);
    } catch (error) {
      console.error("Error updating server:", error);
      res.status(500).json({ error: "Failed to update server" });
    }
  });

  app.delete("/api/servers/:id", async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      const success = await storage.deleteServer(serverId);
      if (!success) {
        return res.status(404).json({ error: "Server not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting server:", error);
      res.status(500).json({ error: "Failed to delete server" });
    }
  });

  app.post("/api/servers/:id/activate", async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      const success = await storage.setActiveServer(serverId);
      if (!success) {
        return res.status(404).json({ error: "Server not found" });
      }

      // Update the active media service
      const activeServer = await storage.getActiveServer();
      if (activeServer) {
        mediaService = MediaServerFactory.createService(activeServer);
        currentUserId = null; // Reset user session when switching servers
        currentAuthSession = null;
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error activating server:", error);
      res.status(500).json({ error: "Failed to activate server" });
    }
  });

  // Authentication endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { serverType, serverUrl, port, username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Usuario y contraseña requeridos" });
      }

      if (!serverType || !serverUrl || !port) {
        return res.status(400).json({ error: "Tipo de servidor, dirección y puerto requeridos" });
      }

      console.log(`🔐 Login attempt: ${username} on ${serverType} server ${serverUrl}:${port}`);

      // Create server object to use with factory
      const serverConfig = {
        id: 0, // Temporary ID for login attempt
        name: `${serverType} Server`,
        serverType: serverType as 'emby' | 'jellyfin',
        url: serverUrl,
        port: port,
        apiKey: 'temp-login-key', // Temporary key for authentication
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        // Create media service using factory pattern
        const targetService = MediaServerFactory.createService(serverConfig);
        
        console.log(`🔧 Created ${serverType} service for: ${serverUrl}:${port}`);
        
        // Attempt authentication
        const authResult = await targetService.authenticateWithCredentials(username, password);
        
        if (authResult) {
          // Store authentication session with session ID
          const sessionKey = `${authResult.User.Id}_${Date.now()}`;
          currentAuthSession = {
            userId: authResult.User.Id,
            username: authResult.User.Name,
            accessToken: authResult.AccessToken,
            isAuthenticated: true
          };
          currentUserId = authResult.User.Id;
          
          // Store in session map for persistence
          currentSessionKey = sessionKey;
          sessionStorage.set(sessionKey, currentAuthSession);
          
          console.log(`💾 Session stored with key: ${sessionKey}`);
          console.log(`👤 Current auth session:`, {
            userId: currentAuthSession.userId,
            username: currentAuthSession.username,
            isAuthenticated: currentAuthSession.isAuthenticated
          });
          
          // Create active session tracking
          const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
          const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown IP';
          const serverName = `${authResult.User.Name}'s ${MediaServerFactory.getServerDisplayName(serverType)}`;
          
          currentSessionId = await createSession(
            authResult.User.Id,
            authResult.User.Name,
            serverName,
            `${serverUrl}:${port}`,
            deviceInfo,
            ipAddress
          );
          
          // Clean up old sessions
          await cleanupInactiveSessions();
          
          // Update server config with real access token and store in database
          const serverWithToken = {
            name: `${authResult.User.Name}'s ${MediaServerFactory.getServerDisplayName(serverType)}`,
            serverType: serverType as 'emby' | 'jellyfin',
            url: serverUrl,
            port: port,
            apiKey: authResult.AccessToken
          };
          
          // Check if server already exists with same URL
          const existingServers = await storage.getAllServers();
          const existingServer = existingServers.find(s => s.url === serverUrl && s.port === port);
          
          let storedServer;
          if (existingServer) {
            // Update existing server
            storedServer = await storage.updateServer(existingServer.id, {
              ...serverWithToken,
              apiKey: authResult.AccessToken
            });
            console.log(`🔄 Updated existing server: ${storedServer.name}`);
          } else {
            // Create new server
            storedServer = await storage.createServer(serverWithToken);
            console.log(`➕ Created new server: ${storedServer.name}`);
          }
          
          await storage.setActiveServer(storedServer.id);
          
          // Create authenticated service with real token
          mediaService = MediaServerFactory.createService({
            ...storedServer,
            apiKey: authResult.AccessToken
          });
          
          console.log(`✅ ${serverType} authentication successful for: ${username} on ${serverUrl}:${port}`);
          console.log(`🔑 Using access token: ${authResult.AccessToken.substring(0, 20)}...`);
          
          return res.json({
            success: true,
            user: {
              id: currentAuthSession.userId,
              name: currentAuthSession.username
            }
          });
        } else {
          console.log(`❌ ${serverType} authentication failed for: ${username} on ${serverUrl}:${port}`);
          return res.status(401).json({ 
            error: `Credenciales inválidas para ${serverType} server ${serverUrl}. Verifica usuario y contraseña.` 
          });
        }
      } catch (authError) {
        console.error(`${serverType} authentication error for ${serverUrl}:`, authError);
        return res.status(401).json({ 
          error: `Error de conexión con ${serverType} server ${serverUrl}. Verifica servidor y credenciales.` 
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Check authentication status
  app.get("/api/auth/status", async (req, res) => {
    try {
      console.log('🔍 Checking auth status...');
      console.log('📊 Current auth session:', currentAuthSession?.isAuthenticated);
      console.log('📊 Active sessions count:', activeSessions.size);
      
      // Check current session first
      if (currentAuthSession?.isAuthenticated) {
        // Update session activity
        if (currentSessionId) {
          await updateSessionActivity(currentSessionId);
        }
        
        console.log('✅ Auth status: authenticated for user:', currentAuthSession.username);
        res.json({
          authenticated: true,
          user: {
            id: currentAuthSession.userId,
            name: currentAuthSession.username
          }
        });
        return;
      }
      
      // Check if any session exists in storage
      for (const [sessionKey, session] of sessionStorage.entries()) {
        if (session.isAuthenticated) {
          console.log(`🔄 Restoring session from storage: ${sessionKey}`);
          currentAuthSession = session;
          currentUserId = session.userId;
          currentSessionKey = sessionKey;
          
          res.json({
            authenticated: true,
            user: {
              id: session.userId,
              name: session.username
            }
          });
          return;
        }
      }
      
      console.log('❌ Auth status: not authenticated');
      res.json({ authenticated: false });
    } catch (error) {
      console.error("Auth status error:", error);
      res.status(500).json({ error: "Failed to check auth status" });
    }
  });

  // Get current server connection status
  app.get("/api/connection/status", async (req, res) => {
    try {
      const activeServer = await storage.getActiveServer();
      if (activeServer && currentAuthSession?.isAuthenticated) {
        res.json({
          connected: true,
          serverName: activeServer.name,
          serverType: activeServer.serverType,
          serverUrl: activeServer.url,
          port: activeServer.port,
          username: currentAuthSession.username
        });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      console.error("Error getting connection status:", error);
      res.json({ connected: false });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      console.log('🔓 Logout initiated...');
      
      // Remove session from database
      if (currentSessionId) {
        await removeSession(currentSessionId);
        console.log(`🗑️ Removed database session: ${currentSessionId}`);
      }
      
      // Clear session from memory storage
      if (currentSessionKey) {
        sessionStorage.delete(currentSessionKey);
        console.log(`🗑️ Removed memory session: ${currentSessionKey}`);
      }
      
      // Clear all sessions from memory storage (full cleanup)
      sessionStorage.clear();
      console.log('🧹 Cleared all memory sessions');
      
      // Reset all auth state
      currentAuthSession = null;
      currentUserId = null;
      currentSessionId = null;
      currentSessionKey = null;
      mediaService = null;

      console.log('✅ Logout complete - all sessions cleared');
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  // Get active sessions for current user
  app.get("/api/sessions/active", async (req, res) => {
    try {
      if (!currentAuthSession || !currentAuthSession.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Clean up old sessions first
      await cleanupInactiveSessions();

      // Get active sessions for current user
      const sessions = await db.select()
        .from(activeSessions)
        .where(eq(activeSessions.userId, currentAuthSession.userId))
        .orderBy(desc(activeSessions.lastActivity));

      const sessionInfo = sessions.map(session => ({
        id: session.sessionId,
        username: session.username,
        serverName: session.serverName,
        serverUrl: session.serverUrl,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress?.substring(0, 10) + '...', // Partially hide IP for privacy
        lastActivity: session.lastActivity,
        isCurrentSession: session.sessionId === currentSessionId
      }));

      res.json({
        totalSessions: sessions.length,
        sessions: sessionInfo
      });
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  // Get session count for current user
  app.get("/api/sessions/count", async (req, res) => {
    try {
      if (!currentAuthSession || !currentAuthSession.isAuthenticated) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Clean up old sessions first
      await cleanupInactiveSessions();

      // Count active sessions for current user
      const sessions = await db.select()
        .from(activeSessions)
        .where(eq(activeSessions.userId, currentAuthSession.userId));

      res.json({
        count: sessions.length,
        userId: currentAuthSession.userId,
        username: currentAuthSession.username
      });
    } catch (error) {
      console.error("Error counting sessions:", error);
      res.status(500).json({ error: "Failed to count sessions" });
    }
  });

  // Test server connection
  app.post("/api/servers/test", async (req, res) => {
    try {
      const { url, port, apiKey } = req.body;
      
      if (!url || !port || !apiKey) {
        return res.status(400).json({ error: "URL, port, and API key are required" });
      }

      const testService = new EmbyService(url, port, apiKey);
      const isConnected = await testService.testConnection();
      
      if (isConnected) {
        const authResult = await testService.authenticateWithApiKey();
        if (authResult) {
          res.json({ 
            connected: true, 
            serverName: "Emby Server",
            userId: authResult.User.Id,
            userName: authResult.User.Name
          });
        } else {
          res.status(401).json({ connected: false, error: "Authentication failed" });
        }
      } else {
        res.status(503).json({ connected: false, error: "Connection failed" });
      }
    } catch (error) {
      console.error("Server test error:", error);
      res.status(500).json({ connected: false, error: "Server test failed" });
    }
  });

  // Connect to server
  app.post("/api/servers/connect", async (req, res) => {
    try {
      const validatedData = insertServerSchema.parse(req.body);
      
      // Test connection first
      const testService = new EmbyService(validatedData.url, validatedData.port, validatedData.apiKey);
      const isConnected = await testService.testConnection();
      
      if (!isConnected) {
        return res.status(503).json({ error: "Failed to connect to server" });
      }

      const authResult = await testService.authenticateWithApiKey();
      if (!authResult) {
        return res.status(401).json({ error: "Authentication failed" });
      }

      // Save server configuration
      const server = await storage.createServer(validatedData);
      
      // Initialize global emby service
      mediaService = testService;
      currentUserId = authResult.User.Id;
      
      res.json({ 
        server,
        connected: true,
        userId: authResult.User.Id,
        userName: authResult.User.Name
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid server data", details: error.errors });
      }
      console.error("Server connect error:", error);
      res.status(500).json({ error: "Failed to connect to server" });
    }
  });

  // Get connection status - check active server
  app.get("/api/connection/status", async (req, res) => {
    try {
      const activeServer = await storage.getActiveServer();
      if (activeServer) {
        res.json({
          connected: true,
          serverName: activeServer.name,
          serverUrl: activeServer.url,
          port: activeServer.port
        });
      } else {
        res.json({
          connected: false,
          error: "No hay servidor activo configurado"
        });
      }
    } catch (error) {
      res.json({
        connected: false,
        error: "Error al verificar conexión"
      });
    }
  });

  // Middleware to check authentication (with demo content exception)
  const requireAuth = (req: any, res: any, next: any) => {
    // Allow access to specific demo library IDs without authentication
    const libraryId = req.params?.libraryId;
    if (libraryId && (libraryId.startsWith('demo-') || libraryId === '357b2b218b5adb74c3e8d4e29f38683f')) {
      return next();
    }
    
    if (!currentAuthSession?.isAuthenticated) {
      return res.status(401).json({ error: "Autenticación requerida" });
    }
    next();
  };

  // Get recently added media
  app.get("/api/media/recent", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const recentItems = await mediaService.getRecentlyAdded(currentUserId, 20);
      
      // Convert Emby format to our format
      const mediaItems = recentItems.map(item => ({
        embyId: item.Id,
        name: item.Name,
        type: item.Type,
        overview: item.Overview || "",
        year: item.ProductionYear || null,
        runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null,
        posterUrl: mediaService!.getBestImageUrl(item),
        backdropUrl: item.ImageTags?.Backdrop ? `/api/image-proxy/${item.Id}/Backdrop?tag=${item.ImageTags.Backdrop}` : 
                     item.BackdropImageTags?.length > 0 ? `/api/image-proxy/${item.Id}/Backdrop?tag=${item.BackdropImageTags[0]}` :
                     item.ParentBackdropImageTags?.length > 0 ? `/api/image-proxy/${item.ParentId || item.Id}/Backdrop?tag=${item.ParentBackdropImageTags[0]}` : null,
        playCount: item.UserData?.PlayCount || 0,
        resumePosition: item.UserData?.PlaybackPositionTicks ? Math.round(item.UserData.PlaybackPositionTicks / 10000000) : 0,
      }));

      res.json(mediaItems);
    } catch (error) {
      console.error("Recent media error:", error);
      res.status(500).json({ error: "Failed to fetch recent media" });
    }
  });

  // Get continue watching
  app.get("/api/media/continue", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const continueItems = await mediaService.getContinueWatching(currentUserId);
      
      const mediaItems = continueItems.map(item => ({
        embyId: item.Id,
        name: item.Name,
        type: item.Type,
        overview: item.Overview || "",
        year: item.ProductionYear || null,
        runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null,
        posterUrl: mediaService!.getBestImageUrl(item),
        backdropUrl: item.ImageTags?.Backdrop ? `/api/image-proxy/${item.Id}/Backdrop?tag=${item.ImageTags.Backdrop}` : null,
        playCount: item.UserData?.PlayCount || 0,
        resumePosition: item.UserData?.PlaybackPositionTicks ? Math.round(item.UserData.PlaybackPositionTicks / 10000000) : 0,
        playedPercentage: item.UserData?.PlayedPercentage || 0,
      }));

      res.json(mediaItems);
    } catch (error) {
      console.error("Continue watching error:", error);
      res.status(500).json({ error: "Failed to fetch continue watching" });
    }
  });

  // Stream proxy endpoint that serves video content with correct headers
  app.get("/api/media/:embyId/stream", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId } = req.params;
      
      // Return a proxied stream URL instead of direct Emby URL
      const proxyStreamUrl = `/api/video-proxy/${embyId}`;
      
      console.log(`Providing proxy stream URL for ${embyId}: ${proxyStreamUrl}`);
      
      res.json({ 
        streamUrl: proxyStreamUrl,
        directPlaySupported: true 
      });
      
    } catch (error) {
      console.error("Stream URL error:", error);
      res.status(500).json({ error: "Failed to get stream URL" });
    }
  });

  // Endpoint para obtener información de pistas de audio
  app.get("/api/media/:embyId/audio-tracks", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId } = req.params;
      
      // Obtener información del medio
      const mediaInfo = await (mediaService as any).getMediaInfo?.(embyId, currentUserId);
      
      if (!mediaInfo || !mediaInfo.MediaStreams) {
        return res.json({ audioTracks: [] });
      }
      
      // Filtrar pistas de audio
      const audioTracks = mediaInfo.MediaStreams
        .filter((stream: any) => stream.Type === 'Audio')
        .map((stream: any, index: number) => ({
          index: stream.Index,
          language: stream.Language || 'und',
          title: stream.Title || stream.DisplayTitle || `Audio ${index + 1}`,
          codec: stream.Codec,
          isDefault: stream.IsDefault,
          isSpanish: stream.Language === 'spa' || stream.Language === 'es' || 
                    stream.Language === 'es-ES' || 
                    (stream.Title && (
                      stream.Title.toLowerCase().includes('español') ||
                      stream.Title.toLowerCase().includes('spanish') ||
                      stream.Title.toLowerCase().includes('castellano') ||
                      stream.Title.toLowerCase().includes('doblado')
                    ))
        }));
      
      console.log(`🎵 Found ${audioTracks.length} audio tracks for ${embyId}:`);
      audioTracks.forEach(track => {
        console.log(`  Track ${track.index}: ${track.title} (${track.language}) ${track.isSpanish ? '🇪🇸' : ''}`);
      });
      
      // Buscar pista en español automáticamente
      const spanishTrack = audioTracks.find(track => track.isSpanish);
      if (spanishTrack) {
        console.log(`🎯 Auto-selecting Spanish track: ${spanishTrack.index}`);
      }
      
      res.json({ 
        audioTracks,
        recommendedTrack: spanishTrack?.index || audioTracks[0]?.index || 0
      });
      
    } catch (error) {
      console.error("Audio tracks error:", error);
      res.status(500).json({ error: "Failed to get audio tracks" });
    }
  });

  // Endpoint para obtener stream con pista de audio específica
  app.get("/api/media/:embyId/stream/:audioTrack", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId, audioTrack } = req.params;
      const audioTrackIndex = parseInt(audioTrack);
      
      // Obtener URL de stream con pista de audio específica
      const streamUrl = (mediaService as any).getStreamUrlWithAudioTrack?.(embyId, currentUserId, audioTrackIndex) || 
                       mediaService.getStreamUrl(embyId, currentUserId);
      
      console.log(`Providing stream URL for ${embyId} with audio track ${audioTrackIndex}: ${streamUrl}`);
      
      res.json({ 
        streamUrl: `/api/video-proxy/${embyId}?audioTrack=${audioTrackIndex}`,
        directPlaySupported: true,
        audioTrackIndex 
      });
      
    } catch (error) {
      console.error("Stream with audio track error:", error);
      res.status(500).json({ error: "Failed to get stream with audio track" });
    }
  });

  // Endpoint para probar múltiples métodos de streaming con audio específico
  app.get("/api/media/:embyId/test-audio/:audioTrack", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId, audioTrack } = req.params;
      const audioTrackIndex = parseInt(audioTrack);
      
      const testMethods = [];
      
      // Método 1: Transcoding forzado
      if ((mediaService as any).getStreamUrlWithAudioTrack) {
        const transcodedUrl = (mediaService as any).getStreamUrlWithAudioTrack(embyId, currentUserId, audioTrackIndex);
        testMethods.push({
          method: 'transcoded',
          url: transcodedUrl,
          description: 'Transcoding forzado con pista específica'
        });
      }
      
      // Método 2: HLS streaming
      if ((mediaService as any).getHlsStreamUrlWithAudioTrack) {
        const hlsUrl = (mediaService as any).getHlsStreamUrlWithAudioTrack(embyId, currentUserId, audioTrackIndex);
        testMethods.push({
          method: 'hls',
          url: hlsUrl,
          description: 'HLS streaming con pista específica'
        });
      }
      
      // Método 3: Stream directo por defecto
      const defaultUrl = mediaService.getStreamUrl(embyId, currentUserId);
      testMethods.push({
        method: 'default',
        url: defaultUrl,
        description: 'Stream directo sin modificar'
      });
      
      console.log(`🧪 Testing ${testMethods.length} streaming methods for ${embyId} with audio track ${audioTrackIndex}`);
      
      res.json({ 
        embyId,
        audioTrackIndex,
        testMethods,
        recommendedMethod: 'transcoded'
      });
      
    } catch (error) {
      console.error("Test audio methods error:", error);
      res.status(500).json({ error: "Failed to test audio methods" });
    }
  });

  // Video proxy endpoint that actually streams the content
  app.get("/api/video-proxy/:embyId", async (req, res) => {
    try {
      console.log(`Video proxy request for embyId: ${req.params.embyId}`);
      console.log('mediaService exists:', !!mediaService);
      console.log('currentUserId:', currentUserId);
      
      if (!mediaService || !currentUserId) {
        console.log("No active server connection");
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId } = req.params;
      const audioTrack = req.query.audioTrack;
      const range = req.headers.range;
      
      // Get the actual Emby stream URL with audio track if specified
      let embyStreamUrl: string;
      if (audioTrack && (mediaService as any).getStreamUrlWithAudioTrack) {
        embyStreamUrl = (mediaService as any).getStreamUrlWithAudioTrack(embyId, currentUserId, parseInt(audioTrack as string));
        console.log(`🎵 Using specified audio track ${audioTrack} for ${embyId}`);
      } else {
        // Auto-detect Spanish audio track
        try {
          const mediaInfo = await (mediaService as any).getMediaInfo?.(embyId, currentUserId);
          if (mediaInfo && mediaInfo.MediaStreams) {
            const audioStreams = mediaInfo.MediaStreams.filter((stream: any) => stream.Type === 'Audio');
            const spanishStream = audioStreams.find((stream: any) => 
              stream.Language === 'spa' || stream.Language === 'es' || 
              stream.Language === 'es-ES' || 
              (stream.DisplayTitle && (
                stream.DisplayTitle.toLowerCase().includes('español') ||
                stream.DisplayTitle.toLowerCase().includes('spanish') ||
                stream.DisplayTitle.toLowerCase().includes('castellano') ||
                stream.DisplayTitle.toLowerCase().includes('doblado')
              ))
            );
            
            if (spanishStream && (mediaService as any).getStreamUrlWithAudioTrack) {
              // Intentar método de transcoding forzado primero
              try {
                embyStreamUrl = (mediaService as any).getStreamUrlWithAudioTrack(embyId, currentUserId, spanishStream.Index);
                console.log(`🎯 Using transcoded Spanish audio track ${spanishStream.Index} (${spanishStream.DisplayTitle || spanishStream.Language}) for ${embyId}`);
              } catch (error) {
                console.error('Error with transcoded stream, falling back to default:', error);
                embyStreamUrl = mediaService.getStreamUrl(embyId, currentUserId);
              }
            } else {
              embyStreamUrl = mediaService.getStreamUrl(embyId, currentUserId);
              console.log(`📺 No Spanish audio found, using default stream for ${embyId}`);
            }
          } else {
            embyStreamUrl = mediaService.getStreamUrl(embyId, currentUserId);
            console.log(`📺 No media info, using default stream for ${embyId}`);
          }
        } catch (error) {
          console.error('Error auto-detecting audio track:', error);
          embyStreamUrl = mediaService.getStreamUrl(embyId, currentUserId);
          console.log(`📺 Error detecting audio, using default stream for ${embyId}`);
        }
      }
      
      console.log(`Proxying video stream for ${embyId} from: ${embyStreamUrl}`);
      
      // Make request to Emby server
      // Using imported axios
      const headers: any = {
        'User-Agent': 'SoloVideoClub/1.0',
        'Accept': '*/*',
        'Accept-Encoding': 'identity'
      };
      
      // Forward range header for partial content support
      if (range) {
        headers['Range'] = range;
        console.log('Range header:', range);
      }
      
      console.log('Making axios request with headers:', headers);
      
      const response = await axios({
        method: 'GET',
        url: embyStreamUrl,
        headers,
        responseType: 'stream',
        timeout: 30000
      });
      
      console.log('Axios response status:', response.status);
      console.log('Axios response headers:', response.headers);
      
      // Headers para streaming en navegador (evitar descarga)
      res.setHeader('Content-Type', 'video/mp4'); // Forzar MP4 para mejor compatibilidad
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
      
      // NO configurar Content-Disposition para evitar descarga
      // Forzar streaming inline sin descargar
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Referrer-Policy', 'same-origin');
      
      // Forward content-length and range headers
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      
      if (response.headers['content-range']) {
        res.setHeader('Content-Range', response.headers['content-range']);
        res.status(206); // Partial Content
      }
      
      console.log('Starting to pipe response data');
      
      // Pipe the video stream
      response.data.pipe(res);
      
      response.data.on('error', (error: any) => {
        console.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      
    } catch (error) {
      console.error("Video proxy error details:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Video streaming failed" });
      }
    }
  });

  // Proxy stream endpoint to handle CORS and authentication
  app.get("/api/media/:embyId/play", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }
      
      const { embyId } = req.params;
      const streamUrl = mediaService.getStreamUrl(embyId, currentUserId);
      
      console.log("Proxying stream for:", embyId);
      console.log("Stream URL:", streamUrl);
      
      // Create HTML page with video player instead of direct redirect
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reproductor de Video</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: black; 
              font-family: Arial, sans-serif; 
            }
            .container {
              width: 100%;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .header {
              background: rgba(0,0,0,0.8);
              color: white;
              padding: 10px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .close-btn {
              background: #e74c3c;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
            }
            video { 
              width: 100%; 
              height: calc(100vh - 60px);
              background: black;
            }
            .error {
              color: white;
              text-align: center;
              padding: 20px;
              background: rgba(255,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h3>Reproductor de Video</h3>
              <button class="close-btn" onclick="window.close()">Cerrar</button>
            </div>
            <video controls autoplay preload="metadata" crossorigin="anonymous">
              <source src="${streamUrl}" type="video/mp4">
              <source src="${streamUrl}" type="video/webm">
              <p class="error">Tu navegador no soporta la reproducción de video.</p>
            </video>
          </div>
          <script>
            const video = document.querySelector('video');
            
            video.addEventListener('loadedmetadata', () => {
              console.log('Video metadata loaded, duration:', video.duration);
            });
            
            video.addEventListener('canplay', () => {
              console.log('Video can start playing');
            });
            
            video.addEventListener('progress', () => {
              if (video.buffered.length > 0) {
                const buffered = video.buffered.end(0);
                const duration = video.duration;
                const percent = (buffered / duration) * 100;
                console.log('Video buffered:', percent.toFixed(1) + '%');
              }
            });
            
            video.addEventListener('error', function(e) {
              console.error('Video error:', e);
              document.querySelector('.container').innerHTML = \`
                <div class="error">
                  <h3>Error de reproducción</h3>
                  <p>No se pudo reproducir el video. <a href="${streamUrl}" style="color: #3498db;">Descargar archivo</a></p>
                  <button onclick="window.close()" class="close-btn">Cerrar</button>
                </div>
              \`;
            });
          </script>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      
    } catch (error) {
      console.error("Stream proxy error:", error);
      res.status(500).json({ error: "Failed to proxy stream" });
    }
  });

  // Report playback start
  app.post("/api/playback/start", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId } = req.body;
      await mediaService.reportPlaybackStart(currentUserId, embyId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Playback start error:", error);
      res.status(500).json({ error: "Failed to report playback start" });
    }
  });

  // Report playback progress
  app.post("/api/playback/progress", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId, positionSeconds } = req.body;
      const positionTicks = positionSeconds * 10000000; // Convert to ticks
      
      await mediaService.reportPlaybackProgress(currentUserId, embyId, positionTicks);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Playback progress error:", error);
      res.status(500).json({ error: "Failed to report playback progress" });
    }
  });

  // Report playback stop
  app.post("/api/playback/stop", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId, positionSeconds } = req.body;
      const positionTicks = positionSeconds * 10000000; // Convert to ticks
      
      await mediaService.reportPlaybackStop(currentUserId, embyId, positionTicks);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Playback stop error:", error);
      res.status(500).json({ error: "Failed to report playback stop" });
    }
  });

  // Get all Live TV channels
  app.get("/api/livetv/channels/all", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      console.log('🔴 Getting all Live TV channels');
      const channels = await mediaService.getLiveTvChannels(currentUserId);
      
      res.json(channels);
    } catch (error) {
      console.error("Live TV channels error:", error);
      res.status(500).json({ error: "Failed to get Live TV channels" });
    }
  });

  // Get Live TV channels organized by categories
  app.get("/api/livetv/channels/categories", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      console.log('🔴 Getting categorized Live TV channels');
      const categorizedChannels = await mediaService.getLiveTvChannelsByCategories(currentUserId);
      
      res.json(categorizedChannels);
    } catch (error) {
      console.error("Live TV categories error:", error);
      res.status(500).json({ error: "Failed to get Live TV categories" });
    }
  });

  // Get Live TV programs
  app.get("/api/livetv/programs", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { channelIds } = req.query;
      const channelIdArray = channelIds ? (channelIds as string).split(',') : undefined;
      
      console.log('🔴 Getting Live TV programs');
      const programs = await mediaService.getLiveTvPrograms(currentUserId, channelIdArray);
      
      res.json(programs);
    } catch (error) {
      console.error("Live TV programs error:", error);
      res.status(500).json({ error: "Failed to get Live TV programs" });
    }
  });

  // Get Live TV stream URL - Simplified for Android
  app.get("/api/livetv/stream/:channelId", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { channelId } = req.params;
      console.log(`📱 Android stream request for channel: ${channelId}`);
      
      const accessToken = (mediaService as any)?.accessToken || (mediaService as any)?.apiKey;
      const baseUrl = (mediaService as any)?.baseUrl;
      
      if (!accessToken || !baseUrl) {
        return res.status(401).json({ error: "No authentication" });
      }
      
      // Direct Jellyfin Live TV streaming URL
      const streamUrl = `${baseUrl}/LiveTv/Channels/${channelId}/stream?api_key=${accessToken}&Static=false&Container=ts,mp4&AudioCodec=aac&VideoCodec=h264&MaxStreamingBitrate=8000000`;
      
      console.log(`🔗 Direct stream URL: ${streamUrl}`);
      
      // Set CORS headers and redirect
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.redirect(302, streamUrl);
      
    } catch (error) {
      console.error("Android stream error:", error);
      res.status(500).json({ error: "Stream failed" });
    }
  });

  // Android-specific video player page
  app.get('/api/livetv/player/:channelId', requireAuth, async (req, res) => {
    try {
      const { channelId } = req.params;
      const accessToken = (mediaService as any)?.accessToken || (mediaService as any)?.apiKey;
      const baseUrl = (mediaService as any)?.baseUrl;
      
      if (!accessToken || !baseUrl) {
        return res.status(401).send('<html><body><h1>Error de autenticación</h1></body></html>');
      }
      
      // Try to get the channel's direct streaming URL first
      let streamUrl = '';
      try {
        const channelResponse = await axios.get(`${baseUrl}/LiveTv/Channels/${channelId}`, {
          headers: {
            'X-Jellyfin-Token': accessToken,
            'Authorization': `MediaBrowser Token="${accessToken}"`
          }
        });
        
        const channel = channelResponse.data;
        if (channel && channel.MediaSources && channel.MediaSources.length > 0) {
          const mediaSource = channel.MediaSources[0];
          if (mediaSource.DirectStreamUrl) {
            streamUrl = mediaSource.DirectStreamUrl;
            console.log(`✅ Using direct stream URL: ${streamUrl}`);
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not get direct stream, using fallback`);
      }
      
      // Fallback to constructed URL if no direct stream URL found
      if (!streamUrl) {
        streamUrl = `${baseUrl}/LiveTv/Channels/${channelId}/stream?api_key=${accessToken}&Static=false&Container=ts,mp4&AudioCodec=aac&VideoCodec=h264&MaxStreamingBitrate=8000000`;
      }
      
      const htmlPlayer = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>TV en Vivo - Android</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: #000; 
            font-family: Arial, sans-serif;
            overflow: hidden;
            -webkit-user-select: none;
            user-select: none;
        }
        .container { 
            width: 100vw; 
            height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            position: relative;
        }
        video { 
            width: 100%; 
            height: 100%; 
            object-fit: cover;
            background: #000;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
            z-index: 10;
        }
        .spinner {
            border: 3px solid #333;
            border-top: 3px solid #007bff;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
            background: rgba(255, 0, 0, 0.8);
            padding: 20px;
            border-radius: 10px;
            z-index: 20;
        }
        .retry-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 10px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Cargando canal...</p>
        </div>
        
        <video id="video" 
               controls 
               autoplay 
               muted 
               playsinline
               webkit-playsinline="true"
               x5-video-player-type="h5"
               preload="none"
               crossorigin="anonymous">
            <source src="${streamUrl}" type="video/mp4">
            <source src="${streamUrl.replace('stream', 'master.m3u8')}" type="application/vnd.apple.mpegurl">
            <source src="${streamUrl}" type="video/mp2t">
            Tu navegador no soporta video HTML5.
        </video>
    </div>
    
    <script>
        const video = document.getElementById('video');
        const loading = document.getElementById('loading');
        
        video.addEventListener('loadstart', () => {
            console.log('📱 Android video loading...');
            loading.style.display = 'block';
        });
        
        video.addEventListener('canplay', () => {
            console.log('✅ Android video ready');
            loading.style.display = 'none';
        });
        
        video.addEventListener('error', (e) => {
            console.error('❌ Android video error:', e);
            loading.style.display = 'none';
            
            // Try alternative streaming URLs
            const currentSrc = video.currentSrc;
            console.log('Current failed source:', currentSrc);
            
            // Show error with fallback options
            document.body.innerHTML += \`
                <div class="error">
                    <h3>Error de reproducción</h3>
                    <p>Intentando conexión directa...</p>
                    <button class="retry-btn" onclick="tryDirectStream()">Stream Directo</button>
                    <button class="retry-btn" onclick="location.reload()">Reintentar</button>
                </div>
            \`;
        });
        
        // Function to try direct stream
        function tryDirectStream() {
            const directUrl = '${streamUrl}';
            console.log('Trying direct stream:', directUrl);
            window.open(directUrl, '_blank');
        }
        
        // Auto-unmute after user interaction
        document.addEventListener('click', () => {
            if (video.muted) {
                video.muted = false;
                video.volume = 0.8;
            }
        }, { once: true });
    </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.send(htmlPlayer);
      
    } catch (error) {
      console.error('Android player error:', error);
      res.status(500).send('<html><body><h1>Error del reproductor</h1></body></html>');
    }
  });

  // Test different Emby servers
  app.post("/api/test-server", async (req, res) => {
    try {
      const { serverUrl, username, password } = req.body;
      
      if (!serverUrl || !username || !password) {
        return res.status(400).json({ error: "Server URL, username and password are required" });
      }

      console.log(`Testing server: ${serverUrl} with user: ${username}`);
      
      // Test server connectivity
      try {
        const axios = (await import('axios')).default;
        const infoResponse = await axios.get(`${serverUrl}/System/Info/Public`, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (infoResponse.status !== 200) {
          return res.status(503).json({ 
            error: "Server not accessible",
            serverUrl 
          });
        }

        const serverName = infoResponse.data.ServerName || 'Unknown Server';
        
        // Test authentication
        const authResponse = await axios.post(`${serverUrl}/Users/AuthenticateByName`, {
          Username: username,
          Pw: password
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Emby-Authorization': 'MediaBrowser Client="SoloVideoClub", Device="WebPlayer", DeviceId="server-test", Version="1.0.0"'
          },
          timeout: 10000,
          validateStatus: () => true
        });

        if (authResponse.status === 200 && authResponse.data.AccessToken) {
          console.log(`✅ Server test success: ${serverUrl}`);
          return res.json({
            success: true,
            serverUrl,
            serverName,
            message: `User authenticated successfully on ${serverName}`,
            userInfo: {
              id: authResponse.data.User?.Id,
              name: authResponse.data.User?.Name
            }
          });
        } else {
          return res.status(401).json({
            error: "Authentication failed",
            serverUrl,
            serverName,
            message: `User not found on ${serverName}`
          });
        }
        
      } catch (error) {
        console.error(`Server test error for ${serverUrl}:`, error.message);
        return res.status(503).json({
          error: "Server connection failed",
          serverUrl,
          message: error.message
        });
      }
    } catch (error) {
      console.error("Test server error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get media libraries
  app.get("/api/libraries", requireAuth, async (req, res) => {
    try {
      if (!mediaService) {
        return res.status(503).json({ error: "No active server connection" });
      }

      // For demo users, use a working demo user ID - use the real Priscila user ID
      const userId = currentUserId?.startsWith('demo-') ? '5d402e4a10c24acc9f98241effabcbbd' : currentUserId;
      
      if (!userId) {
        return res.status(503).json({ error: "No user ID available" });
      }

      console.log(`🏛️ Getting libraries for user: ${userId}`);
      
      const libraries = await mediaService.getMediaLibraries(userId);
      
      const formattedLibraries = libraries.map(lib => ({
        embyId: lib.Id,
        name: lib.Name,
        type: lib.Type,
        overview: lib.Overview || "",
        posterUrl: lib.ImageTags?.Primary ? `/api/image-proxy/${lib.Id}/Primary?tag=${lib.ImageTags.Primary}` : null,
        backgroundImageUrl: lib.LibraryImageUrl || null,
      }));

      console.log(`✅ Found ${formattedLibraries.length} libraries`);
      
      // Only use demo data if explicitly in demo mode with fallback user
      if (formattedLibraries.length === 0 && currentUserId === 'demo-fallback') {
        const demoLibraries = [
          {
            embyId: "demo-movies",
            name: "Películas FHD",
            type: "movies",
            overview: "Colección de películas en alta definición",
            posterUrl: null,
            backgroundImageUrl: "/api/image-proxy/demo-movies/backdrop"
          },
          {
            embyId: "demo-series",
            name: "Series TV",
            type: "tvshows",
            overview: "Series de televisión y programas",
            posterUrl: null,
            backgroundImageUrl: "/api/image-proxy/demo-series/backdrop"
          },
          {
            embyId: "demo-anime",
            name: "Anime",
            type: "movies",
            overview: "Contenido de anime y animación japonesa",
            posterUrl: null,
            backgroundImageUrl: "/api/image-proxy/demo-anime/backdrop"
          },
          {
            embyId: "demo-music",
            name: "Música",
            type: "music",
            overview: "Biblioteca de música y audiolibros",
            posterUrl: null,
            backgroundImageUrl: "/api/image-proxy/demo-music/backdrop"
          }
        ];
        console.log(`📚 Using demo libraries for testing`);
        res.json(demoLibraries);
      } else {
        res.json(formattedLibraries);
      }
    } catch (error) {
      console.error("Libraries error:", error);
      res.status(500).json({ error: "Failed to fetch libraries" });
    }
  });

  // Get Live TV channels organized by categories
  app.get("/api/livetv/channels", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      if (!mediaService.getLiveTvChannelsByCategories) {
        return res.status(501).json({ error: "Live TV not supported on this server" });
      }

      const channelsByCategory = await mediaService.getLiveTvChannelsByCategories(currentUserId);
      console.log(`📺 Retrieved Live TV channels organized by categories`);
      res.json(channelsByCategory);
    } catch (error: any) {
      console.error("Error fetching Live TV channels:", error);
      res.status(500).json({ error: "Failed to fetch Live TV channels" });
    }
  });

  // Get Live TV channels (all) - Testing endpoint without auth
  app.get("/api/livetv/channels/test", async (req, res) => {
    try {
      console.log(`🔍 Live TV Test - MediaService: ${!!mediaService}, UserId: ${currentUserId}`);
      
      if (!mediaService || !currentUserId) {
        return res.json({ 
          error: "No active server connection",
          mediaService: !!mediaService,
          currentUserId: currentUserId,
          serverInfo: mediaService ? "Service exists" : "No service"
        });
      }

      console.log(`🔍 Testing Live TV channels for user: ${currentUserId}`);
      
      // Test direct API call
      const channels = await mediaService.getLiveTvChannels(currentUserId);
      console.log(`📺 Test retrieved ${channels.length} Live TV channels`);
      
      // Get categories if method is available
      let categories = {};
      if (mediaService.getLiveTvChannelsByCategories) {
        categories = await mediaService.getLiveTvChannelsByCategories(currentUserId);
      }
      
      res.json({
        success: true,
        channelCount: channels.length,
        channels: channels.slice(0, 3), // First 3 channels for testing
        categories: Object.keys(categories),
        userId: currentUserId,
        serverType: 'jellyfin'
      });
    } catch (error: any) {
      console.error("Error testing Live TV channels:", error);
      res.json({ 
        error: "Failed to fetch Live TV channels",
        details: error.message,
        mediaService: !!mediaService,
        currentUserId: currentUserId
      });
    }
  });

  // Get Live TV channels (all)
  app.get("/api/livetv/channels/all", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const channels = await mediaService.getLiveTvChannels(currentUserId);
      console.log(`📺 Retrieved ${channels.length} Live TV channels`);
      res.json(channels);
    } catch (error: any) {
      console.error("Error fetching Live TV channels:", error);
      res.status(500).json({ error: "Failed to fetch Live TV channels" });
    }
  });

  // Get current Live TV programs
  app.get("/api/livetv/programs", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { channelIds } = req.query;
      const channelIdArray = channelIds ? (channelIds as string).split(',') : undefined;

      if (!mediaService.getLiveTvPrograms) {
        return res.status(501).json({ error: "Live TV programs not supported on this server" });
      }

      const programs = await mediaService.getLiveTvPrograms(currentUserId, channelIdArray);
      console.log(`📅 Retrieved ${programs.length} Live TV programs`);
      res.json(programs);
    } catch (error: any) {
      console.error("Error fetching Live TV programs:", error);
      res.status(500).json({ error: "Failed to fetch Live TV programs" });
    }
  });

  // Stream Live TV channel
  app.get("/api/livetv/stream/:channelId", requireAuth, async (req, res) => {
    try {
      const { channelId } = req.params;
      
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      console.log(`📺 Streaming Live TV channel: ${channelId}`);
      
      // Get the stream URL from the media service
      const streamUrl = mediaService.getStreamUrl(channelId, currentUserId);
      
      // Redirect to the stream
      res.redirect(streamUrl);
    } catch (error: any) {
      console.error("Error streaming Live TV channel:", error);
      res.status(500).json({ error: "Failed to stream Live TV channel" });
    }
  });

  // Get personalized recommendations
  app.get("/api/media/recommendations", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { limit = 20 } = req.query;
      const recommendations = await mediaService.getRecommendations(currentUserId, parseInt(limit as string));
      
      const mediaItems = recommendations.map(item => ({
        embyId: item.Id,
        name: item.Name,
        type: item.Type,
        overview: item.Overview || "",
        year: item.ProductionYear || null,
        runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null,
        posterUrl: mediaService!.getBestImageUrl(item),
        backdropUrl: item.ImageTags?.Backdrop ? `/api/image-proxy/${item.Id}/Backdrop?tag=${item.ImageTags.Backdrop}` : null,
        playCount: item.UserData?.PlayCount || 0,
        resumePosition: item.UserData?.PlaybackPositionTicks ? Math.round(item.UserData.PlaybackPositionTicks / 10000000) : 0,
        playedPercentage: item.UserData?.PlayedPercentage || 0,
      }));

      res.json(mediaItems);
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // Get library items - prioritize real content
  app.get("/api/libraries/:libraryId/items", async (req, res) => {
    try {
      const { libraryId } = req.params;
      const { limit = 10000, startIndex = 0, page = 1 } = req.query;
      
      const limitNum = parseInt(limit as string);
      const pageNum = parseInt(page as string);
      const startIndexNum = pageNum > 1 ? (pageNum - 1) * limitNum : parseInt(startIndex as string);
      
      // Check if this is a demo library or specific demo library ID
      if (libraryId.startsWith('demo-') || libraryId === '357b2b218b5adb74c3e8d4e29f38683f') {
        const allDemoContent = getDemoLibraryContent(libraryId);
        
        // Aplicar paginación al contenido demo
        const startIndex = startIndexNum;
        const endIndex = startIndex + limitNum;
        const paginatedDemoContent = allDemoContent.slice(startIndex, endIndex);
        
        console.log(`📚 Demo content for ${libraryId}: ${paginatedDemoContent.length}/${allDemoContent.length} items (page ${pageNum})`);
        
        const response = {
          items: paginatedDemoContent,
          pagination: {
            page: pageNum,
            limit: limitNum,
            startIndex: startIndexNum,
            totalItems: allDemoContent.length,
            hasNextPage: endIndex < allDemoContent.length,
            hasPreviousPage: pageNum > 1
          }
        };
        
        res.json(response);
        return;
      }
      
      // For non-demo libraries, require authentication (but allow demo content to proceed)
      // Skip authentication check since we're handling demo content above
      
      // Try to get real content from authenticated server
      if (mediaService && currentUserId && currentUserId !== 'demo-fallback') {
        try {
          let items = [];
          let totalItems = 0;
          
          // Check if this is a Live TV library by getting library info first
          try {
            const libraries = await mediaService.getMediaLibraries(currentUserId);
            const currentLibrary = libraries.find(lib => lib.Id === libraryId);
            
            // If this is a Live TV library or has "TV" in the name, use specific Live TV endpoint
            console.log(`📺 Checking library: ${currentLibrary?.Name}, CollectionType: ${currentLibrary?.CollectionType}`);
            
            if (currentLibrary && (
              currentLibrary.Name?.toLowerCase().includes('tv') || 
              currentLibrary.Name?.toLowerCase().includes('televisión') ||
              currentLibrary.Name?.toLowerCase().includes('directo') ||
              currentLibrary.CollectionType === 'livetv'
            )) {
              console.log(`🔴 Detected Live TV library: ${currentLibrary.Name}, using Live TV channels endpoint`);
              items = await mediaService.getLiveTvChannels(currentUserId);
            } else {
              const result = await mediaService.getLibraryItems(
                currentUserId, 
                libraryId, 
                limitNum, 
                startIndexNum
              );
              items = result.items || result;
              totalItems = result.totalRecordCount || 0;
            }
          } catch (libError) {
            console.warn('Could not get library info, using standard endpoint:', libError);
            const result = await mediaService.getLibraryItems(
              currentUserId, 
              libraryId, 
              limitNum, 
              startIndexNum
            );
            items = result.items || result;
            totalItems = result.totalRecordCount || 0;
          }
          
          console.log(`🎬 Real content for library ${libraryId}: ${items.length} items (total: ${totalItems})`);
          
          if (items.length > 0) {
            // Eliminar duplicados basándose en el ID y en el nombre
            const seenIds = new Set<string>();
            const seenNames = new Set<string>();
            const uniqueItems = items.filter(item => {
              // Verificar duplicado por ID
              if (seenIds.has(item.Id)) {
                return false;
              }
              // Verificar duplicado por nombre (normalizado)
              const normalizedName = item.Name?.toLowerCase().trim();
              if (normalizedName && seenNames.has(normalizedName)) {
                return false;
              }
              seenIds.add(item.Id);
              if (normalizedName) {
                seenNames.add(normalizedName);
              }
              return true;
            });
            
            console.log(`🔄 Removed ${items.length - uniqueItems.length} duplicate items (by ID and name)`);
            
            const mediaItems = uniqueItems.map(item => {
              const posterUrl = mediaService!.getBestImageUrl(item);
              const backdropUrl = item.ImageTags?.Backdrop ? `/api/image-proxy/${item.Id}/Backdrop?tag=${item.ImageTags.Backdrop}` : null;
              
              const formattedItem = {
                embyId: item.Id,
                name: item.Name,
                type: item.Type,
                overview: item.Overview || "",
                year: item.ProductionYear || null,
                runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null,
                genres: item.Genres || [],
                rating: item.CommunityRating || null,
                officialRating: item.OfficialRating || null,
                posterUrl,
                backdropUrl,
                playCount: item.UserData?.PlayCount || 0,
                resumePosition: item.UserData?.PlaybackPositionTicks ? Math.round(item.UserData.PlaybackPositionTicks / 10000000) : 0,
                playedPercentage: item.UserData?.PlayedPercentage || 0,
              };
              
              return formattedItem;
            });

            // Crear respuesta con información de paginación
            const response = {
              items: mediaItems,
              pagination: {
                page: pageNum,
                limit: limitNum,
                startIndex: startIndexNum,
                totalItems: totalItems > 0 ? totalItems : mediaItems.length,
                hasNextPage: totalItems > 0 ? (startIndexNum + mediaItems.length < totalItems) : mediaItems.length >= limitNum,
                hasPreviousPage: pageNum > 1
              }
            };
            
            res.json(response);
            return;
          }
        } catch (realError) {
          console.log(`⚠️ Could not load real content for library ${libraryId}, falling back to demo content`);
        }
      }
      
      // Fallback to demo content if real content fails or not available
      console.log(`📚 Using fallback demo content for library ${libraryId}`);
      const allDemoContent = getDemoLibraryContent(libraryId);
      
      // Aplicar paginación al contenido demo fallback
      const fallbackStartIndex = startIndexNum;
      const fallbackEndIndex = fallbackStartIndex + limitNum;
      const paginatedDemoContent = allDemoContent.slice(fallbackStartIndex, fallbackEndIndex);
      
      const response = {
        items: paginatedDemoContent,
        pagination: {
          page: pageNum,
          limit: limitNum,
          startIndex: startIndexNum,
          totalItems: allDemoContent.length,
          hasNextPage: fallbackEndIndex < allDemoContent.length,
          hasPreviousPage: pageNum > 1
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error("Library items error:", error);
      res.status(500).json({ error: "Failed to fetch library items" });
    }
  });

  // Search media
  app.get("/api/search", async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { q: searchTerm, limit = 20 } = req.query;
      
      if (!searchTerm) {
        return res.status(400).json({ error: "Search term is required" });
      }

      const results = await mediaService.searchMedia(currentUserId, searchTerm as string, parseInt(limit as string));
      
      const mediaItems = results.map(item => ({
        embyId: item.Id,
        name: item.Name,
        type: item.Type,
        overview: item.Overview || "",
        year: item.ProductionYear || null,
        runtime: item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null,
        posterUrl: mediaService!.getBestImageUrl(item),
        backdropUrl: item.ImageTags?.Backdrop ? `/api/image-proxy/${item.Id}/Backdrop?tag=${item.ImageTags.Backdrop}` : null,
        playCount: item.UserData?.PlayCount || 0,
        resumePosition: item.UserData?.PlaybackPositionTicks ? Math.round(item.UserData.PlaybackPositionTicks / 10000000) : 0,
        playedPercentage: item.UserData?.PlayedPercentage || 0,
      }));

      res.json(mediaItems);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to search media" });
    }
  });

  // Get item details (to find parent series for episodes)
  app.get("/api/items/:itemId", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { itemId } = req.params;
      const itemDetails = await mediaService.getItemDetails(currentUserId, itemId);
      
      if (!itemDetails) {
        return res.status(404).json({ error: "Item not found" });
      }

      res.json({
        embyId: itemDetails.Id,
        name: itemDetails.Name,
        type: itemDetails.Type,
        seriesId: itemDetails.SeriesId || null,
        parentId: itemDetails.ParentId || null
      });
    } catch (error) {
      console.error("Item details error:", error);
      res.status(500).json({ error: "Failed to fetch item details" });
    }
  });

  // Get series details
  app.get("/api/series/:seriesId", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { seriesId } = req.params;
      const seriesDetails = await mediaService.getSeriesDetails(currentUserId, seriesId);
      
      if (!seriesDetails) {
        return res.status(404).json({ error: "Series not found" });
      }

      const formattedSeries = {
        embyId: seriesDetails.Id,
        name: seriesDetails.Name,
        type: seriesDetails.Type,
        overview: seriesDetails.Overview || "",
        year: seriesDetails.ProductionYear || null,
        genres: seriesDetails.Genres || [],
        rating: seriesDetails.CommunityRating || null,
        officialRating: seriesDetails.OfficialRating || null,
        people: seriesDetails.People || [],
        studios: seriesDetails.Studios || [],
        posterUrl: mediaService.getBestImageUrl(seriesDetails),
        backdropUrl: seriesDetails.ImageTags?.Backdrop ? `/api/image-proxy/${seriesDetails.Id}/Backdrop?tag=${seriesDetails.ImageTags.Backdrop}` : null,
        playCount: seriesDetails.UserData?.PlayCount || 0,
        userData: seriesDetails.UserData || {}
      };

      res.json(formattedSeries);
    } catch (error) {
      console.error("Series details error:", error);
      res.status(500).json({ error: "Failed to fetch series details" });
    }
  });

  // Get series seasons
  app.get("/api/series/:seriesId/seasons", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { seriesId } = req.params;
      const seasons = await mediaService.getSeriesSeasons(currentUserId, seriesId);
      
      const formattedSeasons = seasons.map(season => ({
        embyId: season.Id,
        name: season.Name,
        overview: season.Overview || "",
        seasonNumber: season.IndexNumber || 0,
        episodeCount: season.ChildCount || 0,
        posterUrl: mediaService.getBestImageUrl(season),
        userData: season.UserData || {}
      }));

      res.json(formattedSeasons);
    } catch (error) {
      console.error("Series seasons error:", error);
      res.status(500).json({ error: "Failed to fetch series seasons" });
    }
  });

  // Get season episodes
  app.get("/api/seasons/:seasonId/episodes", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { seasonId } = req.params;
      const episodes = await mediaService.getSeasonEpisodes(currentUserId, seasonId);
      
      const formattedEpisodes = episodes.map(episode => ({
        embyId: episode.Id,
        name: episode.Name,
        overview: episode.Overview || "",
        episodeNumber: episode.IndexNumber || 0,
        seasonNumber: episode.ParentIndexNumber || 0,
        runtime: episode.RunTimeTicks ? Math.round(episode.RunTimeTicks / 600000000) : null,
        posterUrl: mediaService.getBestImageUrl(episode),
        playCount: episode.UserData?.PlayCount || 0,
        resumePosition: episode.UserData?.PlaybackPositionTicks ? Math.round(episode.UserData.PlaybackPositionTicks / 10000000) : 0,
        playedPercentage: episode.UserData?.PlayedPercentage || 0
      }));

      res.json(formattedEpisodes);
    } catch (error) {
      console.error("Season episodes error:", error);
      res.status(500).json({ error: "Failed to fetch season episodes" });
    }
  });

  // Direct streaming endpoint - bypassing transcoding for now
  app.get("/api/media/:embyId/transcode", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId } = req.params;
      
      // Get direct stream URL from Emby
      const streamUrl = mediaService.getStreamUrl(embyId, currentUserId);
      
      console.log(`Direct stream redirect for ${embyId}: ${streamUrl}`);
      
      // Redirect directly to Emby stream to avoid transcoding issues
      return res.redirect(streamUrl);
      
    } catch (error) {
      console.error("Stream redirect error:", error);
      res.status(500).json({ error: "Transcoding failed" });
    }
  });

  // Get basic media information
  app.get("/api/media/:embyId/info", requireAuth, async (req, res) => {
    try {
      if (!mediaService || !currentUserId) {
        return res.status(503).json({ error: "No active server connection" });
      }

      const { embyId } = req.params;
      const streamUrl = mediaService.getStreamUrl(embyId, currentUserId);
      
      res.json({
        streamUrl,
        directPlaySupported: true,
        recommendedFormat: 'download'
      });
      
    } catch (error) {
      console.error("Media info error:", error);
      res.status(500).json({ error: "Failed to get media information" });
    }
  });

  // Viewing progress endpoints  
  app.post("/api/viewing/start", requireAuth, async (req, res) => {
    try {
      if (!currentUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const progress = await storage.startPlayback(currentUserId, req.body);
      res.json(progress);
    } catch (error) {
      console.error("Start playback error:", error);
      res.status(500).json({ error: "Failed to start playback tracking" });
    }
  });

  app.post("/api/viewing/progress", requireAuth, async (req, res) => {
    try {
      if (!currentUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const progress = await storage.updatePlaybackProgress(currentUserId, req.body);
      res.json(progress);
    } catch (error) {
      console.error("Update progress error:", error);
      res.status(500).json({ error: "Failed to update playback progress" });
    }
  });

  app.post("/api/viewing/stop", requireAuth, async (req, res) => {
    try {
      if (!currentUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      await storage.stopPlayback(currentUserId, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Stop playback error:", error);
      res.status(500).json({ error: "Failed to stop playback tracking" });
    }
  });

  app.get("/api/viewing/progress/:embyId", requireAuth, async (req, res) => {
    try {
      if (!currentUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const progress = await storage.getViewingProgress(currentUserId, req.params.embyId);
      res.json(progress);
    } catch (error) {
      console.error("Get progress error:", error);
      res.status(500).json({ error: "Failed to get viewing progress" });
    }
  });

  app.get("/api/viewing/continue", requireAuth, async (req, res) => {
    try {
      if (!currentUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const items = await storage.getUserContinueWatching(currentUserId);
      res.json(items);
    } catch (error) {
      console.error("Get continue watching error:", error);
      res.status(500).json({ error: "Failed to get continue watching items" });
    }
  });

  app.get("/api/viewing/history", requireAuth, async (req, res) => {
    try {
      if (!currentUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { limit = 50 } = req.query;
      const history = await storage.getUserViewingHistory(currentUserId, parseInt(limit as string));
      res.json(history);
    } catch (error) {
      console.error("Get viewing history error:", error);
      res.status(500).json({ error: "Failed to get viewing history" });
    }
  });

  app.post("/api/viewing/complete/:embyId", requireAuth, async (req, res) => {
    try {
      if (!currentUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      await storage.markAsCompleted(currentUserId, req.params.embyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark completed error:", error);
      res.status(500).json({ error: "Failed to mark as completed" });
    }
  });

  app.delete("/api/viewing/continue/:embyId", requireAuth, async (req, res) => {
    try {
      if (!currentUserId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      await storage.removeFromContinueWatching(currentUserId, req.params.embyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove continue watching error:", error);
      res.status(500).json({ error: "Failed to remove from continue watching" });
    }
  });

  // Dynamic image proxy endpoint that uses current active server
  app.get("/api/image-proxy/:itemId/:imageType", async (req, res) => {
    try {
      const { itemId, imageType } = req.params;
      const { tag, maxHeight = '600', maxWidth = '400', quality = '90' } = req.query;

      // Check if we have an active media service
      if (!mediaService) {
        console.error('No active media service for image proxy');
        return res.status(503).json({ error: "No active server connection" });
      }

      // Get current server details from storage
      const currentServer = await storage.getActiveServer();
      if (!currentServer) {
        console.error('No active server found in storage');
        return res.status(503).json({ error: "No active server connection" });
      }

      // Get current server details
      const baseUrl = `${currentServer.url}:${currentServer.port}`;
      const accessToken = currentServer.apiKey;
      
      const imageParams = new URLSearchParams();
      
      // For Jellyfin, use X-Emby-Token in the URL params
      if (currentServer.serverType === 'jellyfin') {
        imageParams.append('X-Emby-Token', accessToken);
      } else {
        // For Emby, use X-MediaBrowser-Token
        imageParams.append('X-MediaBrowser-Token', accessToken);
      }
      
      imageParams.append('maxHeight', maxHeight as string);
      imageParams.append('maxWidth', maxWidth as string);
      imageParams.append('quality', quality as string);
      
      if (tag) {
        imageParams.append('tag', tag as string);
      }

      const imageUrl = `${baseUrl}/Items/${itemId}/Images/${imageType}?${imageParams.toString()}`;
      
      console.log(`🖼️ Fetching image: ${imageUrl.replace(accessToken, 'TOKEN')}`);
      
      // Use axios with proper configuration
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream',
        timeout: 10000,
        headers: {
          'User-Agent': 'SoloVideoClub/1.0',
          // Also include authorization in headers as fallback
          'X-Emby-Token': accessToken,
          'X-MediaBrowser-Token': accessToken
        },
        validateStatus: (status) => status === 200
      });

      // Set headers
      res.set({
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': response.headers['content-length']
      });

      // Stream the image
      response.data.pipe(res);
      
    } catch (error: any) {
      console.error(`❌ Image proxy failed for ${req.params.itemId}/${req.params.imageType}:`, error.code || error.message);
      
      // Return a placeholder/transparent image instead of error
      res.status(404).json({ error: "Image not found" });
    }
  });

  // M3U Parser helper function
  function parseM3UContent(content: string) {
    const lines = content.split('\n');
    const channels: any[] = [];
    let currentChannel: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTM3U')) {
        // M3U header
        continue;
      } else if (line.startsWith('#EXTINF:')) {
        // Channel info line
        const match = line.match(/#EXTINF:([^,]*),(.+)/);
        if (match) {
          const duration = parseFloat(match[1]) || -1;
          const title = match[2].trim();
          
          currentChannel = {
            id: `channel_${channels.length + 1}`,
            title,
            duration,
            url: '',
            logo: '',
            group: '',
            language: '',
            country: ''
          };
          
          // Extract additional attributes from the line
          const attrMatch = line.match(/tvg-logo="([^"]*)"/) || line.match(/logo="([^"]*)"/);
          if (attrMatch) {
            currentChannel.logo = attrMatch[1];
          }
          
          const groupMatch = line.match(/group-title="([^"]*)"/) || line.match(/group="([^"]*)"/);
          if (groupMatch) {
            currentChannel.group = groupMatch[1];
          }
          
          const langMatch = line.match(/tvg-language="([^"]*)"/) || line.match(/language="([^"]*)"/);
          if (langMatch) {
            currentChannel.language = langMatch[1];
          }
          
          const countryMatch = line.match(/tvg-country="([^"]*)"/) || line.match(/country="([^"]*)"/);
          if (countryMatch) {
            currentChannel.country = countryMatch[1];
          }
        }
      } else if (line && !line.startsWith('#') && currentChannel) {
        // Stream URL
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = null;
      }
    }
    
    return channels;
  }

  // M3U Playlist Routes
  
  // Parse M3U playlist file
  app.post('/api/m3u/parse', async (req, res) => {
    try {
      const { url, content } = req.body;
      
      let playlistContent = content;
      
      // If URL is provided, fetch the content
      if (url && !content) {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'SoloVideoClub M3U Parser'
          }
        });
        playlistContent = response.data;
      }
      
      if (!playlistContent) {
        return res.status(400).json({ error: "No content or URL provided" });
      }
      
      // Parse M3U content
      const channels = parseM3UContent(playlistContent);
      
      res.json({
        success: true,
        channels,
        totalChannels: channels.length
      });
      
    } catch (error: any) {
      console.error('❌ M3U parsing failed:', error.message);
      res.status(500).json({ 
        error: "Failed to parse M3U playlist",
        details: error.message 
      });
    }
  });
  
  // Get HLS stream info
  app.get('/api/m3u/stream/:channelId', async (req, res) => {
    try {
      const { channelId } = req.params;
      const { streamUrl } = req.query;
      
      if (!streamUrl) {
        return res.status(400).json({ error: "Stream URL is required" });
      }
      
      // Fetch HLS manifest
      const response = await axios.get(streamUrl as string, {
        timeout: 10000,
        headers: {
          'User-Agent': 'SoloVideoClub HLS Player'
        }
      });
      
      // Parse HLS manifest
      const parser = new M3UParser();
      parser.push(response.data);
      parser.end();
      
      const manifest = parser.manifest;
      
      res.json({
        success: true,
        channelId,
        manifest,
        streamUrl,
        isLive: manifest.isLive || false,
        duration: manifest.duration || 0
      });
      
    } catch (error: any) {
      console.error('❌ HLS stream parsing failed:', error.message);
      res.status(500).json({ 
        error: "Failed to parse HLS stream",
        details: error.message 
      });
    }
  });
  
  // Get M3U stream from server content
  app.get('/api/m3u/server-stream/:itemId', async (req, res) => {
    const { itemId } = req.params;
    console.log(`📺 M3U Stream request for: ${itemId}`);
    
    // Handle demo channels first (before checking server connection)
    if (itemId.startsWith('live-channel-')) {
      console.log(`🎯 Detected demo channel: ${itemId}`);
      
      // Use different demo streams for each channel
      const demoStreams = {
        'live-channel-1': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'live-channel-2': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'live-channel-3': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'live-channel-4': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
      };
      
      const demoStreamUrl = demoStreams[itemId as keyof typeof demoStreams] || demoStreams['live-channel-1'];
      
      console.log(`🎬 Serving demo M3U content: ${itemId} - ${demoStreamUrl}`);
      
      return res.json({
        success: true,
        item: {
          id: itemId,
          title: `Canal Demo ${itemId.split('-')[2]}`,
          type: 'Channel',
          streamUrl: demoStreamUrl,
          isM3U: true
        }
      });
    }
    
    try {
      // For real content, check server connection
      if (!mediaService || !currentUserId) {
        console.log(`❌ No server connection for real content: ${itemId}`);
        return res.status(503).json({ error: "No active server connection" });
      }

      // Check if the item is M3U content
      const itemDetails = await mediaService.getItemDetails(currentUserId, itemId);
      if (!itemDetails) {
        return res.status(404).json({ error: "Item not found" });
      }

      let streamUrl = '';
      
      // Determine appropriate stream URL based on content type
      if (mediaService.isM3UContent && mediaService.isM3UContent(itemDetails)) {
        if (mediaService.getM3UStreamUrl) {
          streamUrl = mediaService.getM3UStreamUrl(itemId, currentUserId);
        } else if (mediaService.getChannelStreamUrl) {
          streamUrl = mediaService.getChannelStreamUrl(itemId, currentUserId);
        } else {
          streamUrl = mediaService.getStreamUrl(itemId, currentUserId);
        }
      } else {
        streamUrl = mediaService.getStreamUrl(itemId, currentUserId);
      }

      console.log(`🎬 Serving M3U content: ${itemDetails.Name} - ${streamUrl}`);
      
      res.json({
        success: true,
        item: {
          id: itemId,
          title: itemDetails.Name,
          type: itemDetails.Type,
          streamUrl,
          isM3U: mediaService.isM3UContent ? mediaService.isM3UContent(itemDetails) : false
        }
      });
      
    } catch (error: any) {
      console.error('❌ Failed to get server M3U stream:', error.message);
      res.status(500).json({ 
        error: "Failed to get server stream",
        details: error.message 
      });
    }
  });

  // Proxy M3U stream to avoid CORS issues
  app.get('/api/m3u/proxy', async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
      }
      
      const response = await axios.get(url as string, {
        timeout: 30000,
        responseType: 'stream',
        headers: {
          'User-Agent': 'SoloVideoClub Stream Proxy'
        }
      });
      
      // Set appropriate headers
      res.set({
        'Content-Type': response.headers['content-type'] || 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      
      // Stream the content
      response.data.pipe(res);
      
    } catch (error: any) {
      console.error('❌ M3U proxy failed:', error.message);
      res.status(500).json({ 
        error: "Failed to proxy stream",
        details: error.message 
      });
    }
  });

  // ========================================
  // TDT ESPAÑA ROUTES
  // ========================================

  // Get all TDT channels
  app.get("/api/tdt/channels", async (req, res) => {
    try {
      console.log('🇪🇸 Fetching TDT España channels...');
      const channels = await tdtService.getTDTChannels();
      res.json(channels);
    } catch (error) {
      console.error("TDT channels error:", error);
      res.status(500).json({ error: "Failed to fetch TDT channels" });
    }
  });

  // Get TDT channels by categories
  app.get("/api/tdt/categories", async (req, res) => {
    try {
      console.log('🇪🇸 Fetching TDT channels by categories...');
      const categorizedChannels = await tdtService.getTDTChannelsByCategories();
      res.json(categorizedChannels);
    } catch (error) {
      console.error("TDT categories error:", error);
      res.status(500).json({ error: "Failed to fetch TDT categories" });
    }
  });

  // Search TDT channels
  app.get("/api/tdt/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      console.log(`🔍 Searching TDT channels for: ${q}`);
      const channels = await tdtService.searchTDTChannels(q);
      res.json(channels);
    } catch (error) {
      console.error("TDT search error:", error);
      res.status(500).json({ error: "Failed to search TDT channels" });
    }
  });

  // Get TDT channel stream URL
  app.get("/api/tdt/channel/:channelId/stream", async (req, res) => {
    try {
      const { channelId } = req.params;
      console.log(`🎥 Getting TDT stream for channel: ${channelId}`);
      
      const streamUrl = await tdtService.getTDTChannelStream(channelId);
      if (!streamUrl) {
        return res.status(404).json({ error: "Channel not found" });
      }
      
      res.json({ streamUrl });
    } catch (error) {
      console.error("TDT stream error:", error);
      res.status(500).json({ error: "Failed to get channel stream" });
    }
  });

  // TDT channel player page
  app.get("/api/tdt/player/:channelId", async (req, res) => {
    try {
      const { channelId } = req.params;
      console.log(`📺 Creating TDT player for channel: ${channelId}`);
      
      const streamUrl = await tdtService.getTDTChannelStream(channelId);
      if (!streamUrl) {
        return res.status(404).send('Canal no encontrado');
      }
      
      const channels = await tdtService.getTDTChannels();
      const channel = channels.find(c => c.id === channelId);
      
      if (!channel) {
        return res.status(404).send('Canal no encontrado');
      }
      
      // HTML player optimizado para TDT
      const playerHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TDT ${channel.name} - SoloVideoClub</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              background: #000;
              color: #fff;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              overflow: hidden;
            }
            .player-container {
              width: 100vw;
              height: 100vh;
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            video {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .channel-info {
              position: absolute;
              top: 20px;
              left: 20px;
              background: rgba(0,0,0,0.8);
              padding: 15px;
              border-radius: 10px;
              z-index: 100;
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .channel-logo {
              width: 50px;
              height: 50px;
              border-radius: 8px;
              object-fit: cover;
            }
            .channel-details h3 {
              margin: 0;
              font-size: 18px;
              color: #fff;
            }
            .channel-details p {
              margin: 5px 0 0 0;
              font-size: 14px;
              color: #ccc;
            }
            .live-indicator {
              background: #e74c3c;
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.7; }
              100% { opacity: 1; }
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              z-index: 50;
            }
            .loading-spinner {
              width: 50px;
              height: 50px;
              border: 3px solid #333;
              border-top: 3px solid #e74c3c;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .error-message {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              background: rgba(231, 76, 60, 0.9);
              padding: 20px;
              border-radius: 10px;
              z-index: 100;
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        </head>
        <body>
          <div class="player-container">
            <div class="channel-info">
              <img src="${channel.logo || '/default-channel-logo.png'}" alt="${channel.name}" class="channel-logo" />
              <div class="channel-details">
                <h3>${channel.name}</h3>
                <p>${channel.group}</p>
                <span class="live-indicator">● EN VIVO</span>
              </div>
            </div>
            
            <div class="loading" id="loading">
              <div class="loading-spinner"></div>
              <p>Cargando canal ${channel.name}...</p>
            </div>
            
            <video 
              id="video" 
              controls 
              autoplay 
              muted
              playsinline
              style="display: none;"
            ></video>
            
            <div class="error-message" id="error" style="display: none;">
              <h3>Error de reproducción</h3>
              <p>No se pudo cargar el canal ${channel.name}</p>
              <p style="margin-top: 10px; font-size: 12px;">Verifica tu conexión a internet</p>
            </div>
          </div>

          <script>
            const video = document.getElementById('video');
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const streamUrl = '${streamUrl}';
            
            function showError(message) {
              loading.style.display = 'none';
              video.style.display = 'none';
              error.style.display = 'block';
              console.error('TDT Player Error:', message);
            }
            
            function hideLoading() {
              loading.style.display = 'none';
              video.style.display = 'block';
            }
            
            // Initialize HLS.js or fallback to native
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 5,
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                manifestLoadingTimeOut: 10000,
                manifestLoadingMaxRetry: 4,
                levelLoadingTimeOut: 10000,
                fragLoadingTimeOut: 20000
              });
              
              hls.loadSource(streamUrl);
              hls.attachMedia(video);
              
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                console.log('TDT Stream loaded successfully');
                hideLoading();
                video.play().catch(e => {
                  console.log('Autoplay failed, user interaction required');
                  hideLoading();
                });
              });
              
              hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error:', data);
                if (data.fatal) {
                  switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      showError('Error de red al cargar el stream');
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      showError('Error de reproducción de video');
                      break;
                    default:
                      showError('Error desconocido de reproducción');
                      break;
                  }
                }
              });
              
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              // Native HLS support (Safari)
              video.src = streamUrl;
              video.addEventListener('loadedmetadata', hideLoading);
              video.addEventListener('error', () => showError('Error de reproducción nativa'));
              
            } else {
              showError('Tu navegador no soporta streaming HLS');
            }
            
            // Auto-hide controls after inactivity
            let controlsTimeout;
            function resetControlsTimeout() {
              clearTimeout(controlsTimeout);
              video.controls = true;
              controlsTimeout = setTimeout(() => {
                if (!video.paused) {
                  video.controls = false;
                }
              }, 3000);
            }
            
            video.addEventListener('mousemove', resetControlsTimeout);
            video.addEventListener('touchstart', resetControlsTimeout);
            video.addEventListener('play', resetControlsTimeout);
            video.addEventListener('pause', () => {
              clearTimeout(controlsTimeout);
              video.controls = true;
            });
            
            // Initialize controls timeout
            resetControlsTimeout();
          </script>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(playerHTML);
      
    } catch (error) {
      console.error("TDT player error:", error);
      res.status(500).send('Error interno del servidor');
    }
  });

  // Get TDT channel program info
  app.get("/api/tdt/channel/:channelId/program", async (req, res) => {
    try {
      const { channelId } = req.params;
      const program = await tdtService.getTDTChannelProgram(channelId);
      
      if (!program) {
        return res.status(404).json({ error: "Channel program not found" });
      }
      
      res.json(program);
    } catch (error) {
      console.error("TDT program error:", error);
      res.status(500).json({ error: "Failed to get channel program" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
