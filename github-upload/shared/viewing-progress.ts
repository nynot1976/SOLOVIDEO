import { pgTable, serial, varchar, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabla para registrar el progreso de visualización
export const viewingProgress = pgTable("viewing_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // ID del usuario de Emby
  embyId: varchar("emby_id").notNull(), // ID del contenido en Emby
  mediaType: varchar("media_type").notNull(), // 'Movie', 'Episode', etc.
  currentPosition: integer("current_position").default(0), // Posición actual en segundos
  totalDuration: integer("total_duration").default(0), // Duración total en segundos
  progressPercentage: real("progress_percentage").default(0), // Porcentaje completado
  isCompleted: boolean("is_completed").default(false), // Si se vio completamente
  lastWatched: timestamp("last_watched").defaultNow(), // Última vez que se vio
  deviceInfo: varchar("device_info"), // Info del dispositivo usado
  // Para series - información del episodio
  seriesId: varchar("series_id"), // ID de la serie si es un episodio
  seasonNumber: integer("season_number"), // Número de temporada
  episodeNumber: integer("episode_number"), // Número de episodio
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabla para historial de visualización completo
export const viewingHistory = pgTable("viewing_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  embyId: varchar("emby_id").notNull(),
  mediaTitle: varchar("media_title").notNull(),
  mediaType: varchar("media_type").notNull(),
  watchedAt: timestamp("watched_at").defaultNow(),
  watchDuration: integer("watch_duration").default(0), // Tiempo que se vio en segundos
  completedPercentage: real("completed_percentage").default(0),
  // Para series
  seriesId: varchar("series_id"),
  seasonNumber: integer("season_number"),
  episodeNumber: integer("episode_number"),
  episodeTitle: varchar("episode_title"),
});

// Tabla para continuar viendo (vista rápida)
export const continueWatching = pgTable("continue_watching", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  embyId: varchar("emby_id").notNull(),
  mediaTitle: varchar("media_title").notNull(),
  mediaType: varchar("media_type").notNull(),
  posterUrl: varchar("poster_url"),
  backdropUrl: varchar("backdrop_url"),
  currentPosition: integer("current_position").default(0),
  totalDuration: integer("total_duration").default(0),
  progressPercentage: real("progress_percentage").default(0),
  lastWatched: timestamp("last_watched").defaultNow(),
  // Para series
  seriesId: varchar("series_id"),
  seasonNumber: integer("season_number"),
  episodeNumber: integer("episode_number"),
  episodeTitle: varchar("episode_title"),
  nextEpisodeId: varchar("next_episode_id"), // Próximo episodio para reproducción automática
});

// Esquemas de inserción
export const insertViewingProgressSchema = createInsertSchema(viewingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertViewingHistorySchema = createInsertSchema(viewingHistory).omit({
  id: true,
});

export const insertContinueWatchingSchema = createInsertSchema(continueWatching).omit({
  id: true,
});

// Tipos
export type ViewingProgress = typeof viewingProgress.$inferSelect;
export type InsertViewingProgress = z.infer<typeof insertViewingProgressSchema>;

export type ViewingHistory = typeof viewingHistory.$inferSelect;
export type InsertViewingHistory = z.infer<typeof insertViewingHistorySchema>;

export type ContinueWatching = typeof continueWatching.$inferSelect;
export type InsertContinueWatching = z.infer<typeof insertContinueWatchingSchema>;

// Interfaces para la API
export interface PlaybackStartRequest {
  embyId: string;
  mediaType: string;
  totalDuration: number;
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  deviceInfo?: string;
}

export interface PlaybackProgressRequest {
  embyId: string;
  currentPosition: number;
  totalDuration: number;
  progressPercentage: number;
}

export interface PlaybackStopRequest {
  embyId: string;
  currentPosition: number;
  totalDuration: number;
  progressPercentage: number;
  watchDuration: number;
}

export interface ContinueWatchingItem {
  embyId: string;
  mediaTitle: string;
  mediaType: string;
  posterUrl?: string;
  backdropUrl?: string;
  currentPosition: number;
  totalDuration: number;
  progressPercentage: number;
  lastWatched: Date;
  // Para series
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  nextEpisodeId?: string;
}