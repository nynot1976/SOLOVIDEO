import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Clock, X } from "lucide-react";
import { embyClient } from "@/lib/emby-client";
import { ContinueWatchingSkeleton } from "@/components/loading-skeletons";

interface ContinueWatchingSectionProps {
  onItemClick: (item: any) => void;
}

export function ContinueWatchingSection({ onItemClick }: ContinueWatchingSectionProps) {
  const { data: continueWatchingItems = [], isLoading } = useQuery({
    queryKey: ["/api/viewing/continue"],
    queryFn: () => embyClient.getContinueWatchingItems(),
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTimeRemaining = (current: number, total: number) => {
    const remaining = total - current;
    return formatDuration(remaining);
  };

  const handleRemoveItem = async (e: React.MouseEvent, embyId: string) => {
    e.stopPropagation();
    try {
      await embyClient.removeFromContinueWatching(embyId);
    } catch (error) {
      console.error('Failed to remove from continue watching:', error);
    }
  };

  if (isLoading) {
    return <ContinueWatchingSkeleton />;
  }

  if (continueWatchingItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-500" />
          Continuar Viendo
        </h2>
        <Badge variant="secondary">
          {continueWatchingItems.length} elementos
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {continueWatchingItems.map((item) => (
          <Card
            key={item.embyId}
            className="relative overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 group"
            onClick={() => onItemClick(item)}
          >
            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 text-white p-1 h-auto"
              onClick={(e) => handleRemoveItem(e, item.embyId)}
            >
              <X className="w-3 h-3" />
            </Button>

            {/* Poster Image */}
            <div className="relative aspect-[2/3] overflow-hidden">
              {item.posterUrl ? (
                <img
                  src={item.posterUrl}
                  alt={item.mediaTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Play className="w-12 h-12 text-gray-600" />
                </div>
              )}
              
              {/* Progress Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <Progress value={item.progressPercentage} className="h-1 mb-2" />
                <div className="flex justify-between text-xs text-white">
                  <span>{item.progressPercentage.toFixed(0)}%</span>
                  <span>{formatTimeRemaining(item.currentPosition, item.totalDuration)} restantes</span>
                </div>
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-blue-600 rounded-full p-3">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Content Info */}
            <div className="p-3 space-y-2">
              <h3 className="font-medium text-sm line-clamp-2" title={item.mediaTitle}>
                {item.mediaTitle}
              </h3>
              
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-xs">
                  {item.mediaType}
                </Badge>
                
                {item.episodeNumber && item.seasonNumber && (
                  <Badge variant="outline" className="text-xs">
                    T{item.seasonNumber} E{item.episodeNumber}
                  </Badge>
                )}
              </div>

              {item.episodeTitle && (
                <p className="text-xs text-muted-foreground line-clamp-1" title={item.episodeTitle}>
                  {item.episodeTitle}
                </p>
              )}

              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>
                  {formatDuration(item.currentPosition)} / {formatDuration(item.totalDuration)}
                </span>
                <span>
                  {new Date(item.lastWatched).toLocaleDateString('es-ES', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}