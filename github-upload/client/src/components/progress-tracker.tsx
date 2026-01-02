import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Check } from "lucide-react";
import { embyClient } from "@/lib/emby-client";

interface ProgressTrackerProps {
  embyId: string;
  mediaTitle: string;
  mediaType: string;
  totalDuration: number;
  onPositionChange?: (position: number) => void;
  onComplete?: () => void;
  className?: string;
}

export function ProgressTracker({
  embyId,
  mediaTitle,
  mediaType,
  totalDuration,
  onPositionChange,
  onComplete,
  className
}: ProgressTrackerProps) {
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();

  // Get existing progress
  const { data: progress } = useQuery({
    queryKey: ["/api/viewing/progress", embyId],
    queryFn: () => embyClient.getViewingProgress(embyId),
  });

  // Start playback mutation
  const startPlaybackMutation = useMutation({
    mutationFn: (data: any) => embyClient.startPlayback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viewing/progress", embyId] });
    },
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: (data: any) => embyClient.updatePlaybackProgress(data),
  });

  // Stop playback mutation
  const stopPlaybackMutation = useMutation({
    mutationFn: (data: any) => embyClient.stopPlayback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viewing/progress", embyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/viewing/continue"] });
    },
  });

  // Mark as completed mutation
  const markCompletedMutation = useMutation({
    mutationFn: () => embyClient.markAsCompleted(embyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viewing/progress", embyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/viewing/continue"] });
      onComplete?.();
    },
  });

  // Initialize position from saved progress
  useEffect(() => {
    if (progress?.currentPosition) {
      setCurrentPosition(progress.currentPosition);
      onPositionChange?.(progress.currentPosition);
    }
  }, [progress, onPositionChange]);

  // Progress tracking interval
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentPosition(prev => {
          const newPosition = prev + 1;
          const progressPercentage = (newPosition / totalDuration) * 100;
          
          // Update progress every 10 seconds
          if (newPosition % 10 === 0) {
            updateProgressMutation.mutate({
              embyId,
              currentPosition: newPosition,
              totalDuration,
              progressPercentage,
            });
          }

          // Auto-complete at 95%
          if (progressPercentage >= 95 && !progress?.isCompleted) {
            setIsPlaying(false);
            markCompletedMutation.mutate();
            return newPosition;
          }

          onPositionChange?.(newPosition);
          return newPosition;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, totalDuration, embyId, updateProgressMutation, markCompletedMutation, progress?.isCompleted, onPositionChange]);

  const handlePlayPause = () => {
    if (!isPlaying && currentPosition === 0) {
      // Start new playback
      startPlaybackMutation.mutate({
        embyId,
        mediaType,
        totalDuration,
      });
    }

    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    const progressPercentage = (currentPosition / totalDuration) * 100;
    
    stopPlaybackMutation.mutate({
      embyId,
      currentPosition,
      totalDuration,
      progressPercentage,
      watchDuration: currentPosition,
    });
  };

  const handleRestart = () => {
    setCurrentPosition(0);
    setIsPlaying(false);
    onPositionChange?.(0);
  };

  const handleMarkCompleted = () => {
    markCompletedMutation.mutate();
  };

  const progressPercentage = (currentPosition / totalDuration) * 100;
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{mediaTitle}</h3>
          <Badge variant="secondary" className="text-xs">
            {mediaType}
          </Badge>
        </div>
        
        {progress?.isCompleted && (
          <Badge className="bg-green-600">
            <Check className="w-3 h-3 mr-1" />
            Completado
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <Progress value={progressPercentage} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(currentPosition)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
        <div className="text-xs text-center text-muted-foreground">
          {progressPercentage.toFixed(1)}% completado
        </div>
      </div>

      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPause}
          disabled={progress?.isCompleted}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 mr-1" />
          ) : (
            <Play className="w-4 h-4 mr-1" />
          )}
          {isPlaying ? "Pausar" : currentPosition > 0 ? "Continuar" : "Iniciar"}
        </Button>

        {currentPosition > 0 && !progress?.isCompleted && (
          <>
            <Button variant="outline" size="sm" onClick={handleStop}>
              Detener
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reiniciar
            </Button>
          </>
        )}

        {!progress?.isCompleted && progressPercentage > 80 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkCompleted}
            className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
          >
            <Check className="w-4 h-4 mr-1" />
            Marcar Completo
          </Button>
        )}
      </div>

      {progress?.lastWatched && (
        <div className="text-xs text-center text-muted-foreground">
          Última vez visto: {new Date(progress.lastWatched).toLocaleDateString('es-ES')}
        </div>
      )}
    </div>
  );
}