import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, ExternalLink, Volume2, VolumeX, SkipBack, SkipForward, Pause } from "lucide-react";
import { MediaItem, embyClient } from "@/lib/emby-client";
import { useGestures } from "@/hooks/use-gestures";
import { useToast } from "@/hooks/use-toast";

interface MediaPlayerProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaPlayer({ item, isOpen, onClose }: MediaPlayerProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playerMode, setPlayerMode] = useState<'streaming' | 'html5' | 'external'>('streaming');
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (item && isOpen) {
      loadMedia();
    }
    return () => {
      setStreamUrl(null);
    };
  }, [item, isOpen]);

  const loadMedia = async () => {
    if (!item) return;
    
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    
    try {
      console.log("Loading media item:", item.name, "Type:", item.type);
      const url = await embyClient.getStreamUrl(item.embyId);
      console.log("Stream URL received:", url);
      setStreamUrl(url);
      
      if (url) {
        // Report playback start to Emby
        await embyClient.reportPlaybackStart(item.embyId);
        // Start with streaming mode for better compatibility
        setPlayerMode('streaming');
        
        // Pre-test the URL for compatibility
        const testVideo = document.createElement('video');
        testVideo.src = url;
        testVideo.crossOrigin = 'anonymous';
        testVideo.preload = 'metadata';
        
        testVideo.addEventListener('loadedmetadata', () => {
          console.log('URL is compatible with HTML5 video');
        });
        
        testVideo.addEventListener('error', () => {
          console.log('URL may not be compatible with HTML5, streaming mode recommended');
        });
        
        setTimeout(() => {
          testVideo.remove();
        }, 5000);
      }
    } catch (error) {
      console.error("Error loading media:", error);
      setHasError(true);
      setErrorMessage("No se pudo cargar el contenido multimedia");
      toast({
        title: "Error de reproducción",
        description: "Intentando con modo alternativo...",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-hide controls
  const resetControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setShowControls(true);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Gesture handlers for video controls
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
      resetControlsTimeout();
    }
  };

  const handleSeekForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
      toast({
        title: "Adelantado 10s",
        duration: 1000,
      });
      resetControlsTimeout();
    }
  };

  const handleSeekBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
      toast({
        title: "Retrocedido 10s", 
        duration: 1000,
      });
      resetControlsTimeout();
    }
  };

  const handleVolumeUp = () => {
    if (videoRef.current) {
      const newVolume = Math.min(1, volume + 0.1);
      setVolume(newVolume);
      videoRef.current.volume = newVolume;
      toast({
        title: `Volumen: ${Math.round(newVolume * 100)}%`,
        duration: 1000,
      });
      resetControlsTimeout();
    }
  };

  const handleVolumeDown = () => {
    if (videoRef.current) {
      const newVolume = Math.max(0, volume - 0.1);
      setVolume(newVolume);
      videoRef.current.volume = newVolume;
      toast({
        title: `Volumen: ${Math.round(newVolume * 100)}%`,
        duration: 1000,
      });
      resetControlsTimeout();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
      toast({
        title: newMuted ? "Silenciado" : "Sonido activado",
        duration: 1000,
      });
      resetControlsTimeout();
    }
  };

  // Set up gesture controls
  useGestures(playerContainerRef, {
    onTap: resetControlsTimeout,
    onDoubleTap: handlePlayPause,
    onSwipeLeft: handleSeekForward,
    onSwipeRight: handleSeekBackward,
    onSwipeUp: handleVolumeUp,
    onSwipeDown: handleVolumeDown,
    onLongPress: toggleMute,
  }, {
    swipeThreshold: 50,
    velocityThreshold: 0.3,
    longPressDelay: 500,
    doubleTapDelay: 300,
  });

  const handleClose = () => {
    if (item) {
      // Report playback stop to Emby
      embyClient.reportPlaybackStop(item.embyId, 0);
    }
    
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setStreamUrl(null);
    onClose();
  };

  if (!isOpen || !item) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header with close button */}
      <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white">{item.name}</h2>
          {item.year && (
            <p className="text-gray-300">{item.year}</p>
          )}
        </div>
        <Button
          onClick={handleClose}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Media Container */}
      <div className="flex-1 relative flex items-center justify-center">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">Cargando contenido multimedia...</p>
          </div>
        ) : hasError ? (
          <div className="text-center text-white p-8">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <Play className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Problema de reproducción</h3>
              <p className="text-gray-300 mb-6 text-sm leading-relaxed">{errorMessage}</p>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => {
                      if (streamUrl) {
                        const directUrl = streamUrl.includes('?') 
                          ? `${streamUrl}&mode=direct&format=mp4` 
                          : `${streamUrl}?mode=direct&format=mp4`;
                        window.open(directUrl, '_blank', 'width=1200,height=700');
                        toast({
                          title: "Video abierto",
                          description: "Reproduciendo en ventana nueva",
                          duration: 2000,
                        });
                      }
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Reproducir en ventana nueva
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        setHasError(false);
                        setPlayerMode('streaming');
                        toast({
                          title: "Reintentando",
                          description: "Modo streaming...",
                          duration: 1500,
                        });
                      }}
                      variant="outline"
                      className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                    >
                      📺 Streaming
                    </Button>
                    <Button
                      onClick={() => {
                        setHasError(false);
                        setPlayerMode('html5');
                        toast({
                          title: "Reintentando",
                          description: "Modo HTML5...",
                          duration: 1500,
                        });
                      }}
                      variant="outline"
                      className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
                    >
                      🎬 HTML5
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
                  💡 Consejo: La reproducción externa suele funcionar mejor en dispositivos móviles
                </div>
              </div>
            </div>
          </div>
        ) : streamUrl ? (
          <div className="w-full h-full relative">
            {/* Player Mode Controls */}
            <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setPlayerMode('streaming');
                    setHasError(false);
                    toast({
                      title: "Modo Streaming",
                      description: "Reproducción optimizada via iframe",
                      duration: 2000,
                    });
                  }}
                  className={`${playerMode === 'streaming' ? 'bg-blue-600' : 'bg-black/70'} hover:bg-blue-700 text-white backdrop-blur-sm transition-all`}
                  size="sm"
                >
                  📺 Streaming
                </Button>
                <Button
                  onClick={() => {
                    setPlayerMode('html5');
                    setHasError(false);
                    toast({
                      title: "Modo HTML5",
                      description: "Video nativo del navegador",
                      duration: 2000,
                    });
                  }}
                  className={`${playerMode === 'html5' ? 'bg-green-600' : 'bg-black/70'} hover:bg-green-700 text-white backdrop-blur-sm transition-all`}
                  size="sm"
                >
                  🎬 HTML5
                </Button>
                <Button
                  onClick={() => {
                    setPlayerMode('external');
                    if (streamUrl) {
                      window.open(streamUrl, '_blank');
                      toast({
                        title: "Abriendo externamente",
                        description: "Contenido abierto en nueva pestaña",
                        duration: 2000,
                      });
                    }
                  }}
                  className={`${playerMode === 'external' ? 'bg-purple-600' : 'bg-black/70'} hover:bg-purple-700 text-white backdrop-blur-sm transition-all`}
                  size="sm"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Externo
                </Button>
              </div>
              
              {/* Status Indicator */}
              <div className="bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
                Estado: {hasError ? '❌ Error' : '✅ Funcionando'} | Modo: {playerMode === 'streaming' ? 'Streaming' : playerMode === 'html5' ? 'HTML5' : 'Externo'}
              </div>
            </div>

            {/* Player Content */}
            <div 
              ref={playerContainerRef}
              className="w-full h-full bg-black relative"
            >
              {playerMode === 'streaming' && (
                <div className="w-full h-full bg-black flex items-center justify-center relative">
                  <iframe
                    ref={iframeRef}
                    src={streamUrl}
                    className="w-full h-full border-0 bg-black"
                    allow="autoplay; fullscreen; encrypted-media; camera; microphone; geolocation; cross-origin-isolated"
                    allowFullScreen
                    sandbox="allow-same-origin allow-scripts allow-forms allow-top-navigation allow-presentation allow-downloads allow-popups allow-pointer-lock allow-storage-access-by-user-activation"
                    title={`Reproduciendo: ${item.name}`}
                    referrerPolicy="unsafe-url"
                    loading="eager"
                    style={{
                      colorScheme: 'dark',
                      filter: 'brightness(1)',
                    }}
                    onLoad={() => {
                      console.log('Streaming iframe loaded successfully');
                      setHasError(false);
                      setIsLoading(false);
                    }}
                    onError={() => {
                      console.error('Streaming iframe failed to load');
                      setHasError(true);
                      setErrorMessage('Error en modo streaming. Prueba HTML5 o Externo.');
                      setIsLoading(false);
                    }}
                  />
                  
                  {/* Streaming Success Indicator */}
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs z-10">
                    🔴 LIVE
                  </div>
                </div>
              )}
              
              {playerMode === 'html5' && (
                <div className="w-full h-full bg-black relative">
                  <video
                    ref={videoRef}
                    src={streamUrl}
                    className="w-full h-full object-contain bg-black"
                    controls={true}
                    autoPlay={true}
                    muted={false}
                    preload="metadata"
                    playsInline={true}
                    controlsList="nodownload"
                    disablePictureInPicture={false}
                    crossOrigin="anonymous"
                    style={{
                      backgroundColor: 'black',
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      console.error('HTML5 video error:', e);
                      const video = e.target as HTMLVideoElement;
                      console.log('Video error details:', {
                        error: video.error,
                        networkState: video.networkState,
                        readyState: video.readyState,
                        src: video.src
                      });
                      
                      // Try alternative method: create new video element with different approach
                      if (streamUrl) {
                        const newVideo = document.createElement('video');
                        newVideo.src = streamUrl;
                        newVideo.crossOrigin = 'anonymous';
                        newVideo.load();
                        
                        newVideo.addEventListener('loadstart', () => {
                          console.log('Alternative video loading started');
                        });
                        
                        newVideo.addEventListener('error', () => {
                          console.log('Alternative video also failed, switching to streaming');
                          setPlayerMode('streaming');
                          setHasError(true);
                          setErrorMessage('HTML5 no compatible. Usando streaming...');
                          toast({
                            title: "Cambiando a Streaming",
                            description: "HTML5 no es compatible con este contenido",
                            variant: "destructive",
                          });
                        });
                        
                        newVideo.addEventListener('canplay', () => {
                          console.log('Alternative video can play - replacing current video');
                          if (videoRef.current) {
                            videoRef.current.src = streamUrl;
                            videoRef.current.load();
                          }
                        });
                      }
                    }}
                    onLoadStart={() => {
                      console.log('HTML5 video loading started');
                      setIsLoading(false);
                      setHasError(false);
                    }}
                    onCanPlay={() => {
                      console.log('HTML5 video can play');
                      setHasError(false);
                      setIsLoading(false);
                    }}
                    onLoadedData={() => {
                      console.log('HTML5 video data loaded');
                      setHasError(false);
                      if (videoRef.current) {
                        videoRef.current.play().catch(e => {
                          console.log('Autoplay prevented:', e);
                        });
                      }
                    }}
                    onPlay={() => {
                      console.log('HTML5 video started playing');
                      setIsPlaying(true);
                      setHasError(false);
                      resetControlsTimeout();
                    }}
                    onPause={() => {
                      setIsPlaying(false);
                      setShowControls(true);
                    }}
                    onVolumeChange={(e) => {
                      const video = e.target as HTMLVideoElement;
                      setVolume(video.volume);
                      setIsMuted(video.muted);
                    }}
                  >
                    <source src={streamUrl} type="video/mp4" />
                    <source src={streamUrl} type="video/webm" />
                    <source src={streamUrl} type="video/ogg" />
                    Tu navegador no soporta la reproducción de video HTML5.
                  </video>
                  
                  {/* HTML5 Success Indicator */}
                  {!hasError && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs z-10">
                      🎬 HTML5
                    </div>
                  )}
                </div>
              )}
              
              {/* Touch Controls Overlay for HTML5 Mode */}
              {playerMode === 'html5' && showControls && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center md:hidden">
                  <div className="flex items-center space-x-8">
                    <Button
                      onClick={handleSeekBackward}
                      className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full"
                      size="icon"
                    >
                      <SkipBack className="w-6 h-6" />
                    </Button>
                    
                    <Button
                      onClick={handlePlayPause}
                      className="bg-black/50 hover:bg-black/70 text-white p-6 rounded-full"
                      size="icon"
                    >
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                    </Button>
                    
                    <Button
                      onClick={handleSeekForward}
                      className="bg-black/50 hover:bg-black/70 text-white p-4 rounded-full"
                      size="icon"
                    >
                      <SkipForward className="w-6 h-6" />
                    </Button>
                  </div>
                  
                  {/* Volume Control */}
                  <div className="absolute top-4 right-4">
                    <Button
                      onClick={toggleMute}
                      className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"
                      size="icon"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                  </div>
                  
                  {/* Gesture Hints */}
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-xs">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <span>👆 Doble toque: Play/Pausa</span>
                        <span>👆 Mantener: Silenciar</span>
                        <span>← → Buscar</span>
                        <span>↑ ↓ Volumen</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {playerMode === 'external' && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white max-w-md px-6">
                    <Play className="w-20 h-20 mx-auto mb-6 text-blue-400" />
                    <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                    <p className="text-gray-300 mb-6 text-sm">
                      Abrir en reproductor externo para mejor compatibilidad
                    </p>
                    
                    <div className="space-y-3">
                      <Button
                        onClick={() => window.open(streamUrl, '_blank')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                      >
                        <ExternalLink className="w-5 h-5 mr-2" />
                        Reproducir en nueva pestaña
                      </Button>
                      
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(streamUrl);
                          alert('URL copiada al portapapeles.');
                        }}
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        Copiar URL de streaming
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Controls */}
            <div className="absolute bottom-4 left-4 right-4 md:hidden z-20">
              <div className="bg-black/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate text-sm">
                      {item?.name}
                    </h4>
                    <p className="text-gray-400 text-xs flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${hasError ? 'bg-red-500' : 'bg-green-500'}`}></span>
                      {hasError ? 'Error de reproducción' : 
                       playerMode === 'streaming' ? 'Streaming activo' : 
                       playerMode === 'html5' ? 'Reproducción HTML5' : 
                       'Modo externo'}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-2">
                    {playerMode === 'html5' && (
                      <Button
                        onClick={handlePlayPause}
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        if (streamUrl) {
                          window.open(streamUrl, '_blank');
                          toast({
                            title: "Abriendo externamente",
                            description: "Video abierto en nueva pestaña",
                            duration: 2000,
                          });
                        }
                      }}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Quick Mode Switch */}
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    onClick={() => {
                      setPlayerMode('streaming');
                      setHasError(false);
                      toast({
                        title: "Streaming",
                        description: "Reproducción integrada",
                        duration: 1500,
                      });
                    }}
                    size="sm"
                    className={`${playerMode === 'streaming' ? 'bg-blue-500 text-white' : 'bg-white/20 text-gray-300'} hover:bg-blue-600 transition-all text-xs py-2`}
                  >
                    📺 Stream
                  </Button>
                  <Button
                    onClick={() => {
                      setPlayerMode('html5');
                      setHasError(false);
                      toast({
                        title: "HTML5",
                        description: "Video nativo",
                        duration: 1500,
                      });
                    }}
                    size="sm"
                    className={`${playerMode === 'html5' ? 'bg-green-500 text-white' : 'bg-white/20 text-gray-300'} hover:bg-green-600 transition-all text-xs py-2`}
                  >
                    🎬 HTML5
                  </Button>
                  <Button
                    onClick={() => {
                      if (streamUrl) {
                        // Create optimized URL for direct playback
                        const directUrl = streamUrl.includes('?') 
                          ? `${streamUrl}&direct=true&player=browser` 
                          : `${streamUrl}?direct=true&player=browser`;
                        
                        window.open(directUrl, '_blank', 'noopener,noreferrer');
                        toast({
                          title: "Reproducción directa",
                          description: "Abierto en nueva pestaña",
                          duration: 2000,
                        });
                      }
                    }}
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600 text-white transition-all text-xs py-2"
                  >
                    🚀 Directo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-white">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-600 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8" />
              </div>
              <p className="mb-4">No se pudo cargar el contenido multimedia</p>
              <div className="space-y-2">
                <Button onClick={loadMedia} className="bg-blue-600 hover:bg-blue-700 mb-2">
                  Intentar de nuevo
                </Button>
                <p className="text-xs text-gray-400">
                  Verifica tu conexión a internet y que el servidor esté disponible
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media info overlay */}
      {item.overview && (
        <div className="absolute bottom-20 left-4 right-4 bg-black/70 backdrop-blur-sm p-4 rounded-lg max-h-32 overflow-y-auto">
          <p className="text-white text-sm">{item.overview}</p>
        </div>
      )}
    </div>
  );
}