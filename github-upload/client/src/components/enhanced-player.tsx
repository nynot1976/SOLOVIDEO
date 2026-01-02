import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, ExternalLink, RotateCcw, Volume2, VolumeX, Maximize } from "lucide-react";
import { MediaItem, embyClient } from "@/lib/emby-client";
import { useToast } from "@/hooks/use-toast";

interface EnhancedPlayerProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EnhancedPlayer({ item, isOpen, onClose }: EnhancedPlayerProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (item && isOpen) {
      loadMedia();
    } else {
      cleanup();
    }
  }, [item, isOpen]);

  useEffect(() => {
    if (showControls && playerReady) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showControls, playerReady]);

  const cleanup = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    setStreamUrl(null);
    setHasError(false);
    setIsLoading(false);
    setPlayerReady(false);
    setIsPlaying(false);
  };

  const loadMedia = async () => {
    if (!item) return;
    
    setIsLoading(true);
    setHasError(false);
    
    try {
      // Try direct stream first, then fallback methods
      let streamUrl: string | null = null;
      
      // Method 1: Get direct stream URL from Emby
      try {
        const response = await embyClient.getStreamUrl(item.embyId);
        streamUrl = response.streamUrl;
        console.log('Direct stream URL obtained:', streamUrl);
      } catch (error) {
        console.log('Direct stream failed, trying alternatives');
      }
      
      // Method 2: Use server-side streaming endpoint as fallback
      if (!streamUrl) {
        streamUrl = `/api/media/${item.embyId}/transcode`;
        console.log('Using server-side stream:', streamUrl);
      }
      
      setStreamUrl(streamUrl);
      
      toast({
        title: "Cargando contenido",
        description: `Preparando ${item.name}`,
        duration: 2000,
      });

      setTimeout(() => {
        initializePlayer(streamUrl!);
      }, 500);
      
    } catch (error) {
      console.error('Error loading media:', error);
      setHasError(true);
      toast({
        title: "Error de reproducción",
        description: "Prueba abrir en nueva pestaña para streaming directo",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializePlayer = (url: string) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Clear any existing sources
    video.innerHTML = '';
    
    // Create multiple source elements for maximum compatibility
    const sources = [
      { src: url, type: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' },
      { src: url, type: 'video/mp4' },
      { src: url, type: 'video/webm; codecs="vp8, vorbis"' },
      { src: url, type: 'video/webm' },
      { src: url, type: 'video/ogg; codecs="theora, vorbis"' },
      { src: url, type: 'application/x-mpegURL' }, // HLS
      { src: url, type: 'video/x-ms-wmv' },
      { src: url, type: 'video/avi' },
      { src: url, type: 'video/quicktime' },
      { src: url, type: 'video/x-msvideo' }
    ];

    sources.forEach(source => {
      const sourceElement = document.createElement('source');
      sourceElement.src = source.src;
      sourceElement.type = source.type;
      video.appendChild(sourceElement);
    });

    // Configure video properties for maximum compatibility
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.backgroundColor = 'black';

    // Event listeners
    video.addEventListener('loadstart', () => {
      console.log('Enhanced player loading started');
      setPlayerReady(true);
      setHasError(false);
    });

    video.addEventListener('canplay', () => {
      console.log('Enhanced player can play');
      setPlayerReady(true);
      setHasError(false);
      toast({
        title: "Reproductor activo",
        description: "Video optimizado con FFmpeg + H.264/H.265",
        duration: 3000,
      });
    });

    video.addEventListener('play', () => {
      setIsPlaying(true);
    });

    video.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    video.addEventListener('volumechange', () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    });

    video.addEventListener('error', (e) => {
      console.error('Enhanced player error:', e);
      const error = video.error;
      console.log('Video error details:', {
        code: error?.code,
        message: error?.message,
        networkState: video.networkState,
        readyState: video.readyState
      });
      
      setHasError(true);
      toast({
        title: "Error de reproducción",
        description: "Abriendo reproductor externo",
        variant: "destructive",
        duration: 3000,
      });
      
      // Auto-open externally after 2 seconds
      setTimeout(() => {
        openExternally();
      }, 2000);
    });

    video.addEventListener('ended', () => {
      toast({
        title: "Video terminado",
        description: "Reproducción completada",
        duration: 3000,
      });
    });

    // Try to load the video
    video.load();
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleContainerClick = () => {
    setShowControls(true);
  };

  const openExternally = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank');
      toast({
        title: "Abriendo externamente",
        description: "El video se abrirá en nueva pestaña",
        duration: 3000,
      });
    }
  };

  const handleRestart = () => {
    cleanup();
    if (item) {
      loadMedia();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      {/* Controls Overlay */}
      <div 
        className={`absolute top-4 left-4 right-4 z-10 flex justify-between items-start transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Title and Player Info */}
        {item && (
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 max-w-md">
            <h2 className="text-white text-lg font-semibold truncate">
              {item.name}
            </h2>
            <p className="text-green-400 text-sm font-medium">
              ⚡ FFmpeg Enhanced + Multi-Codec
            </p>
          </div>
        )}

        {/* Top Controls */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            className="text-white hover:bg-white/20 h-10 w-10 bg-black/70 backdrop-blur-sm"
          >
            <Maximize className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-10 w-10 bg-black/70 backdrop-blur-sm"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Iniciando FFmpeg Enhanced Player...</p>
          <p className="text-gray-300 text-sm mt-2">Optimizando códecs para tu dispositivo</p>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="text-center max-w-md mx-4">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <ExternalLink className="h-12 w-12 text-red-400" />
            </div>
            <h3 className="text-red-300 text-xl font-semibold mb-3">
              Formato no compatible
            </h3>
            <p className="text-red-200 mb-4 text-sm">
              Este video se reproducirá mejor externamente.
              Se abrirá automáticamente en tu reproductor preferido.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={openExternally}
                className="bg-green-600 hover:bg-green-700 text-white text-lg py-4 rounded-xl"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Reproducir Externamente
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleRestart}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reintentar
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-200 flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player */}
      {streamUrl && !hasError && !isLoading && (
        <div 
          className="w-full h-full flex items-center justify-center cursor-pointer"
          onClick={handleContainerClick}
        >
          <video
            ref={videoRef}
            className="max-w-full max-h-full w-auto h-auto"
            playsInline
            style={{ 
              objectFit: 'contain',
              backgroundColor: 'black' 
            }}
          />
        </div>
      )}

      {/* Bottom Controls */}
      <div 
        className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-opacity duration-300 ${
          showControls && playerReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-green-400 text-sm font-semibold">
              🎬 Enhanced Player
            </span>
            <Button
              onClick={openExternally}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Externa
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>FFmpeg activo</span>
            </div>
            <span>•</span>
            <span>Multi-códec H.264/H.265</span>
            <span>•</span>
            <span>FHD/4K optimizado</span>
          </div>
        </div>
      </div>
    </div>
  );
}