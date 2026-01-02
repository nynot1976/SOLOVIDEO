import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeriesDetailsSkeleton } from "@/components/loading-skeletons";
import { 
  Play, 
  Star, 
  Calendar, 
  Clock, 
  Users, 
  ChevronRight,
  ArrowLeft,
  PlayCircle,
  X
} from "lucide-react";

interface SeriesDetailsProps {
  seriesId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayEpisode: (episodeId: string) => void;
}

interface SeriesData {
  embyId: string;
  name: string;
  overview: string;
  year: number;
  genres: string[];
  rating: number;
  officialRating: string;
  people: any[];
  studios: any[];
  posterUrl: string;
  backdropUrl: string;
}

interface Season {
  embyId: string;
  name: string;
  overview: string;
  seasonNumber: number;
  episodeCount: number;
  posterUrl: string;
}

interface Episode {
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

export function SeriesDetails({ seriesId, isOpen, onClose, onPlayEpisode }: SeriesDetailsProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Get series details
  const { data: seriesData, isLoading: isLoadingSeries } = useQuery<SeriesData>({
    queryKey: [`/api/series/${seriesId}`],
    enabled: !!seriesId && isOpen,
  });

  // Get series seasons
  const { data: seasons = [], isLoading: isLoadingSeasons } = useQuery<Season[]>({
    queryKey: [`/api/series/${seriesId}/seasons`],
    enabled: !!seriesId && isOpen,
  });



  // Get episodes for selected season
  const { data: episodes = [], isLoading: isLoadingEpisodes } = useQuery<Episode[]>({
    queryKey: [`/api/seasons/${selectedSeasonId}/episodes`],
    enabled: !!selectedSeasonId,
  });

  const handleSeasonSelect = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
  };

  const handleBackToSeasons = () => {
    setSelectedSeasonId(null);
  };

  const formatRuntime = (minutes: number) => {
    if (!minutes) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getProgressWidth = (playedPercentage: number) => {
    return Math.min(Math.max(playedPercentage || 0, 0), 100);
  };

  if (!isOpen || !seriesId) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl h-[95vh] sm:h-[90vh] bg-gray-900 text-white border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoadingSeries ? (
          <div className="p-6 overflow-y-auto h-full">
            <SeriesDetailsSkeleton />
          </div>
        ) : seriesData ? (
          <div className="flex flex-col h-full">
            {/* Hero Section */}
            <div className="relative">
              {seriesData.backdropUrl && (
                <div 
                  className="h-48 md:h-64 bg-cover bg-center"
                  style={{ backgroundImage: `url(${seriesData.backdropUrl})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
                </div>
              )}
              
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {seriesData.posterUrl && (
                    <img 
                      src={seriesData.posterUrl} 
                      alt={seriesData.name}
                      className="w-24 h-36 md:w-32 md:h-48 object-cover rounded-lg shadow-lg"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="space-y-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-white">
                        {seriesData.name}
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                        {seriesData.year && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {seriesData.year}
                          </div>
                        )}
                        {seriesData.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {seriesData.rating.toFixed(1)}
                          </div>
                        )}
                        {seriesData.officialRating && (
                          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                            {seriesData.officialRating}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {seriesData.genres.slice(0, 3).map((genre) => (
                          <Badge key={genre} variant="outline" className="border-blue-500 text-blue-300">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {!selectedSeasonId ? (
                // Seasons View
                <div className="space-y-6">
                  {/* Synopsis */}
                  {seriesData.overview && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Sinopsis</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{seriesData.overview}</p>
                    </div>
                  )}

                  {/* Cast & Crew */}
                  {seriesData.people && seriesData.people.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Reparto Principal</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {seriesData.people.slice(0, 6).map((person, index) => (
                          <div key={index} className="flex-shrink-0 text-center">
                            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-2">
                              <Users className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-300 max-w-16 truncate">{person.Name}</p>
                            {person.Role && (
                              <p className="text-xs text-gray-500 max-w-16 truncate">{person.Role}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seasons */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Temporadas</h3>
                    {isLoadingSeasons ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-gray-400 text-sm">Cargando temporadas...</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {seasons.map((season) => (
                          <Card 
                            key={season.embyId}
                            className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                            onClick={() => handleSeasonSelect(season.embyId)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                {season.posterUrl && (
                                  <img 
                                    src={season.posterUrl}
                                    alt={season.name}
                                    className="w-16 h-24 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-semibold text-white">{season.name}</h4>
                                  <p className="text-sm text-gray-400">{season.episodeCount} episodios</p>
                                  {season.overview && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                      {season.overview}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Episodes View
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      onClick={handleBackToSeasons}
                      className="text-blue-400 hover:text-blue-300 p-2"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Volver a Temporadas
                    </Button>
                  </div>

                  {isLoadingEpisodes ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-sm">Cargando episodios...</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {episodes.map((episode) => (
                        <Card 
                          key={episode.embyId}
                          className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              {episode.posterUrl && (
                                <div className="relative">
                                  <img 
                                    src={episode.posterUrl}
                                    alt={episode.name}
                                    className="w-24 h-14 object-cover rounded"
                                  />
                                  {episode.playedPercentage > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 h-1">
                                      <div 
                                        className="bg-blue-500 h-full"
                                        style={{ width: `${getProgressWidth(episode.playedPercentage)}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-semibold text-white text-sm">
                                      {episode.episodeNumber}. {episode.name}
                                    </h4>
                                    {episode.runtime && (
                                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" />
                                        {formatRuntime(episode.runtime)}
                                      </p>
                                    )}
                                    {episode.overview && (
                                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                                        {episode.overview}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    onClick={() => onPlayEpisode(episode.embyId)}
                                    className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0 flex-shrink-0"
                                  >
                                    <PlayCircle className="w-5 h-5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No se pudo cargar la información de la serie</p>
          </div>
        )}
      </div>
    </div>
  );
}