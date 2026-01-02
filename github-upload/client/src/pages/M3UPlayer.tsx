import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Play, Pause, Volume2, VolumeX, Maximize, FileText, Link, Upload, Search, Filter, Globe, Users, Clock } from "lucide-react";
import Hls from "hls.js";

interface M3UChannel {
  id: string;
  title: string;
  url: string;
  logo: string;
  group: string;
  language: string;
  country: string;
  duration: number;
}

interface M3UParseResult {
  success: boolean;
  channels: M3UChannel[];
  totalChannels: number;
}

export default function M3UPlayer() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistContent, setPlaylistContent] = useState("");
  const [channels, setChannels] = useState<M3UChannel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<M3UChannel | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [activeTab, setActiveTab] = useState("url");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Parse M3U playlist
  const parseM3UMutation = useMutation({
    mutationFn: async (data: { url?: string; content?: string }) => {
      return await apiRequest("/api/m3u/parse", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data: M3UParseResult) => {
      if (data.success) {
        setChannels(data.channels);
        console.log(`✅ Parsed M3U playlist: ${data.totalChannels} channels`);
      }
    },
    onError: (error) => {
      console.error("❌ Failed to parse M3U playlist:", error);
    }
  });

  // Handle playlist parsing
  const handleParsePlaylist = () => {
    if (activeTab === "url" && playlistUrl) {
      parseM3UMutation.mutate({ url: playlistUrl });
    } else if (activeTab === "content" && playlistContent) {
      parseM3UMutation.mutate({ content: playlistContent });
    }
  };

  // Handle channel selection
  const handleChannelSelect = (channel: M3UChannel) => {
    setCurrentChannel(channel);
    setIsPlaying(false);
    
    if (videoRef.current) {
      // Clean up previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // Check if HLS is supported
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        
        hls.loadSource(channel.url);
        hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log(`✅ HLS manifest loaded for: ${channel.title}`);
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error(`❌ HLS error for ${channel.title}:`, data);
        });
        
        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = channel.url;
      } else {
        console.warn("HLS not supported, trying direct URL");
        videoRef.current.src = channel.url;
      }
    }
  };

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

  // Filter channels
  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === "all" || channel.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  // Get unique groups
  const groups = Array.from(new Set(channels.map(ch => ch.group).filter(Boolean)));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Reproductor M3U
        </h1>
        <p className="text-muted-foreground">
          Carga y reproduce listas de reproducción M3U con streaming HLS
        </p>
      </div>

      {/* Playlist Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Cargar Lista de Reproducción M3U
          </CardTitle>
          <CardDescription>
            Ingresa una URL de playlist M3U o pega el contenido directamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Contenido
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playlist-url">URL de la Lista M3U</Label>
                <Input
                  id="playlist-url"
                  placeholder="https://ejemplo.com/playlist.m3u"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playlist-content">Contenido M3U</Label>
                <Textarea
                  id="playlist-content"
                  placeholder="#EXTM3U&#10;#EXTINF:-1,Canal de Ejemplo&#10;http://ejemplo.com/stream.m3u8"
                  value={playlistContent}
                  onChange={(e) => setPlaylistContent(e.target.value)}
                  rows={6}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <Button 
            onClick={handleParsePlaylist}
            disabled={parseM3UMutation.isPending || (!playlistUrl && !playlistContent)}
            className="w-full mt-4"
          >
            {parseM3UMutation.isPending ? "Analizando..." : "Cargar Lista de Reproducción"}
          </Button>
        </CardContent>
      </Card>

      {/* Channel List */}
      {channels.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Channel Browser */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Canales ({filteredChannels.length})
                </CardTitle>
                <div className="space-y-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar canales..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  
                  {/* Group filter */}
                  <select 
                    value={selectedGroup} 
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">Todos los grupos</option>
                    {groups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredChannels.map((channel) => (
                      <div
                        key={channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        className={`m3u-channel-item p-3 rounded-lg ${
                          currentChannel?.id === channel.id
                            ? "m3u-channel-active"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {channel.logo && (
                            <img 
                              src={channel.logo} 
                              alt={channel.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{channel.title}</p>
                            <div className="flex items-center gap-2 text-sm opacity-75">
                              {channel.group && (
                                <Badge variant="secondary" className="text-xs">
                                  {channel.group}
                                </Badge>
                              )}
                              {channel.language && (
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  {channel.language}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Reproductor de Video
                </CardTitle>
                {currentChannel && (
                  <CardDescription>
                    Reproduciendo: {currentChannel.title}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Video Element */}
                  <div className="m3u-video-container">
                    <video
                      ref={videoRef}
                      className="w-full"
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
                      Tu navegador no soporta el elemento de video.
                    </video>
                    
                    {!currentChannel && (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <div className="text-center">
                          <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Selecciona un canal para reproducir</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video Controls */}
                  {currentChannel && (
                    <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                      <div className="flex items-center gap-4">
                        <Button
                          onClick={togglePlay}
                          variant="outline"
                          size="sm"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={toggleMute}
                            variant="outline"
                            size="sm"
                          >
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
                      
                      <Button
                        onClick={toggleFullscreen}
                        variant="outline"
                        size="sm"
                      >
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Channel Info */}
                  {currentChannel && (
                    <div className="p-4 bg-accent rounded-lg">
                      <h3 className="font-medium mb-2">{currentChannel.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {currentChannel.group && (
                          <Badge variant="secondary">{currentChannel.group}</Badge>
                        )}
                        {currentChannel.language && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {currentChannel.language}
                          </span>
                        )}
                        {currentChannel.country && (
                          <span>{currentChannel.country}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}