import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Volume2, VolumeX, Maximize, X, Tv, Radio } from "lucide-react";
import Hls from "hls.js";

interface M3UServerPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  title: string;
  itemType: string;
}

interface ServerStreamResponse {
  success: boolean;
  item: {
    id: string;
    title: string;
    type: string;
    streamUrl: string;
    isM3U: boolean;
  };
}

export function M3UServerPlayer({ isOpen, onClose, itemId, title, itemType }: M3UServerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [streamData, setStreamData] = useState<ServerStreamResponse['item'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Get server stream
  const getServerStreamMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/m3u/server-stream/${itemId}`, {
        method: 'GET'
      });
    },
    onSuccess: (data: ServerStreamResponse) => {
      if (data.success) {
        setStreamData(data.item);
        console.log(`✅ Got server stream: ${data.item.title} - M3U: ${data.item.isM3U}`);
        loadStream(data.item.streamUrl);
      }
    },
    onError: (error) => {
      console.error("❌ Failed to get server stream:", error);
    }
  });

  // Load stream into video player
  const loadStream = (streamUrl: string) => {
    if (!videoRef.current) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('hls');

    console.log(`🎬 Loading stream: ${streamUrl} (HLS: ${isHLS})`);

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferLength: 30 // 30 seconds
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log(`✅ HLS manifest loaded for: ${title}`);
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error(`❌ HLS error for ${title}:`, data);
        if (data.fatal) {
          // Try fallback to native video
          video.src = streamUrl;
          video.load();
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = streamUrl;
      video.load();
      setIsLoading(false);
    } else {
      // Direct stream
      video.src = streamUrl;
      video.load();
      setIsLoading(false);
    }
  };

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && itemId && !streamData) {
      setIsLoading(true);
      getServerStreamMutation.mutate(itemId);
    }
  }, [isOpen, itemId]);

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setStreamData(null);
    setIsPlaying(false);
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {itemType === 'Channel' || itemType === 'LiveTv' ? (
                <Tv className="w-5 h-5" />
              ) : (
                <Radio className="w-5 h-5" />
              )}
              {title}
            </CardTitle>
            <CardDescription>
              {streamData?.isM3U ? 'Transmisión M3U en vivo' : 'Contenido del servidor'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Video Container */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Cargando transmisión...</p>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                className="w-full h-[400px] object-contain"
                controls={false}
                crossOrigin="anonymous"
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.volume = volume;
                    videoRef.current.muted = isMuted;
                  }
                }}
                onError={(e) => {
                  console.error("❌ Video error:", e);
                }}
              >
                Tu navegador no soporta la reproducción de video.
              </video>
            )}

            {!isLoading && !streamData && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <Tv className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Error al cargar la transmisión</p>
                </div>
              </div>
            )}
          </div>

          {/* Video Controls */}
          {streamData && !isLoading && (
            <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
              <div className="flex items-center gap-4">
                <Button onClick={togglePlay} variant="outline" size="sm">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <div className="flex items-center gap-2">
                  <Button onClick={toggleMute} variant="outline" size="sm">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="m3u-volume-slider w-20"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {streamData.isM3U && (
                  <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
                    EN VIVO
                  </Badge>
                )}
                <Button onClick={toggleFullscreen} variant="outline" size="sm">
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Stream Info */}
          {streamData && (
            <div className="p-4 bg-accent rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{streamData.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Tipo: {streamData.type} • {streamData.isM3U ? 'M3U/HLS' : 'Video estándar'}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>ID: {streamData.id}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}