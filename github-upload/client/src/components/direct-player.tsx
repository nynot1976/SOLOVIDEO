import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, ExternalLink, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react";
import { MediaItem, embyClient } from "@/lib/emby-client";
import { useToast } from "@/hooks/use-toast";

interface DirectPlayerProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DirectPlayer({ item, isOpen, onClose }: DirectPlayerProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasTriedLoad, setHasTriedLoad] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (item && isOpen) {
      loadDirectStream();
    } else {
      cleanup();
    }
  }, [item, isOpen]);

  const cleanup = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    setStreamUrl(null);
    setIsPlaying(false);
    setHasError(false);
  };

  const loadDirectStream = async () => {
    if (!item) return;
    
    setIsLoading(true);
    setHasError(false);
    
    try {
      // Get direct stream URL from Emby
      const response = await embyClient.getStreamUrl(item.embyId);
      const directUrl = typeof response === 'string' ? response : response?.streamUrl;
      
      if (directUrl) {
        setStreamUrl(directUrl);
        console.log('Direct stream URL loaded:', directUrl);
        
        toast({
          title: "Streaming directo",
          description: "Conectando directamente con Emby",
          duration: 2000,
        });
      } else {
        throw new Error('No stream URL available');
      }
      
    } catch (error) {
      console.error('Direct stream failed:', error);
      setHasError(true);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor Emby",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume > 0 ? volume : 0.5;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleExternalPlay = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank');
      toast({
        title: "Nueva pestaña",
        description: "Streaming abierto externamente",
      });
    }
  };

  const handleRetry = () => {
    setHasError(false);
    loadDirectStream();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-7xl mx-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white truncate">{item.name}</h2>
            <p className="text-gray-300 text-sm">{item.type} • Streaming Directo</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExternalPlay}
              className="text-white hover:bg-white/20"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Nueva Pestaña
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Video Container */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-black flex items-center justify-center"
          onMouseMove={() => setShowControls(true)}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
                <p className="text-white">Conectando a Emby...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 mb-4">
                  <p className="text-red-400 mb-4">Error de conexión con servidor de medios</p>
                  <p className="text-gray-400 text-sm mb-4">
                    El navegador no puede reproducir directamente este contenido debido a restricciones de seguridad.
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={handleExternalPlay}
                      variant="outline"
                      className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir en Nueva Pestaña
                    </Button>
                    <Button 
                      onClick={handleRetry}
                      variant="outline"
                      className="border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {streamUrl && !hasError && (
            <div className="w-full h-full">
              {/* Try iframe first for better compatibility */}
              <iframe
                src={streamUrl}
                className="w-full h-full border-none"
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
                title={item.name}
                onLoad={() => {
                  console.log('Iframe video loaded successfully');
                  setTimeout(() => {
                    setIsLoading(false);
                    setHasError(false);
                    toast({
                      title: "Reproducción iniciada",
                      description: "Video cargado correctamente",
                      duration: 2000,
                    });
                  }, 1000);
                }}
                onError={() => {
                  console.log('Iframe failed, showing external option');
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
              
              {/* Hidden video element as fallback */}
              <video
                ref={videoRef}
                src={streamUrl}
                className="hidden w-full h-full object-contain"
                controls
                playsInline
                crossOrigin="anonymous"
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadStart={() => {
                  console.log('Video loading started');
                  setHasError(false);
                }}
                onCanPlay={() => {
                  console.log('Video can play');
                  setHasError(false);
                }}
                onError={(e) => {
                  console.error('Video error:', e);
                  setHasError(true);
                  toast({
                    title: "Error de reproducción",
                    description: "Usa 'Nueva Pestaña' para streaming directo",
                    variant: "destructive",
                  });
                }}
              />
            </div>
          )}

          {/* Custom Controls Overlay */}
          {showControls && streamUrl && !hasError && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMuteToggle}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 accent-blue-500"
                    />
                  </div>
                </div>
                
                <div className="text-white text-sm">
                  Streaming Directo • {item.type}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}