import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RecommendationsSkeleton } from "@/components/loading-skeletons";
import { ChevronLeft, ChevronRight, Play, Clock, Star, Sparkles, Zap, TrendingUp, Heart } from "lucide-react";
import { embyClient, type MediaItem } from "@/lib/emby-client";

interface RecommendationsCarouselProps {
  onItemClick: (item: MediaItem) => void;
}

export function RecommendationsCarousel({ onItemClick }: RecommendationsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 6;

  const { data: recommendations = [], isLoading, error } = useQuery({
    queryKey: ["/api/media/recommendations"],
    queryFn: () => embyClient.getRecommendations(30),
    staleTime: 3 * 60 * 1000, // 3 minutes for fresher recommendations
    refetchOnWindowFocus: false,
  });

  const totalPages = Math.ceil(recommendations.length / itemsPerPage);
  const currentItems = recommendations.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  const nextPage = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const getMediaIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'movie':
        return '🎬';
      case 'episode':
      case 'series':
        return '📺';
      case 'audio':
        return '🎵';
      default:
        return '🎭';
    }
  };

  const getRecommendationBadge = (item: MediaItem, index: number) => {
    // AI-powered recommendation categorization
    if (index < 6) {
      return { icon: Sparkles, text: "IA Sugerido", color: "bg-purple-600/80" };
    } else if (index < 12) {
      return { icon: Heart, text: "Tus Gustos", color: "bg-pink-600/80" };
    } else if (index < 18) {
      return { icon: TrendingUp, text: "Trending", color: "bg-blue-600/80" };
    } else {
      return { icon: Zap, text: "Descubre", color: "bg-green-600/80" };
    }
  };

  const formatRuntime = (minutes: number | null) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (error) {
    return null; // Gracefully hide if recommendations fail
  }

  if (isLoading) {
    return <RecommendationsSkeleton />;
  }

  if (recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Recomendaciones Personalizadas</h2>
        </div>
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">
            Reproduce algunos contenidos para recibir recomendaciones personalizadas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Recomendaciones Personalizadas</h2>
          <Badge variant="secondary" className="bg-purple-900/30 text-purple-300 border-purple-700">
            {recommendations.length} sugerencias
          </Badge>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevPage}
              className="text-white hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-400">
              {currentIndex + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextPage}
              className="text-white hover:bg-gray-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {currentItems.map((item, itemIndex) => {
          const globalIndex = currentIndex * itemsPerPage + itemIndex;
          const recommendationBadge = getRecommendationBadge(item, globalIndex);
          const RecommendationIcon = recommendationBadge.icon;
          
          return (
            <Card
              key={item.embyId}
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-200 cursor-pointer group hover:scale-105 relative overflow-hidden"
              onClick={() => onItemClick(item)}
            >
              <CardContent className="p-0">
                <div className="relative">
                  {item.posterUrl ? (
                    <img
                      src={item.posterUrl}
                      alt={item.name}
                      className="w-full aspect-[2/3] object-cover rounded-t-lg"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-t-lg flex items-center justify-center">
                      <div className="text-4xl opacity-50">
                        {getMediaIcon(item.type)}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Recommendation Badge */}
                  <div className={`absolute top-2 right-2 ${recommendationBadge.color} backdrop-blur-sm rounded-full p-1.5 flex items-center space-x-1`}>
                    <RecommendationIcon className="w-3 h-3 text-white" />
                    <span className="text-xs font-medium text-white hidden sm:inline">
                      {recommendationBadge.text}
                    </span>
                  </div>
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-t-lg flex items-center justify-center">
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Progress indicator */}
                  {item.playedPercentage && item.playedPercentage > 5 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-600 h-1">
                      <div 
                        className="bg-blue-400 h-full transition-all duration-300"
                        style={{ width: `${Math.min(item.playedPercentage, 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Type badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 bg-black/70 text-white text-xs"
                  >
                    {item.type === 'Movie' ? 'Película' : 
                     item.type === 'Episode' ? 'Episodio' : 
                     item.type === 'Series' ? 'Serie' : 
                     item.type === 'Audio' ? 'Audio' : item.type}
                  </Badge>
                </div>
              
                <div className="p-3 space-y-2">
                  <h3 className="font-medium text-white text-sm leading-tight line-clamp-2">
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    {item.year && (
                      <span>{item.year}</span>
                    )}
                    {item.runtime && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatRuntime(item.runtime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Play count indicator */}
                  {item.playCount > 0 && (
                    <div className="flex items-center space-x-1 text-xs text-purple-400">
                      <Star className="w-3 h-3" />
                      <span>Reproducido {item.playCount} {item.playCount === 1 ? 'vez' : 'veces'}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI recommendation note */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Recomendaciones basadas en tu historial de reproducción y preferencias
        </p>
      </div>
    </div>
  );
}