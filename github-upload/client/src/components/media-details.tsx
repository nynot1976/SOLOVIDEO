import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Play, Star, Clock, Calendar, Users } from "lucide-react";
import { MediaItem } from "@/lib/emby-client";

interface MediaDetailsProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (item: MediaItem, options: PlaybackOptions) => void;
}

interface PlaybackOptions {
  subtitles: boolean;
  subtitleLanguage: string;
  audioTrack: string;
  quality: string;
}

export function MediaDetails({ item, isOpen, onClose, onPlay }: MediaDetailsProps) {
  const [playbackOptions, setPlaybackOptions] = useState<PlaybackOptions>({
    subtitles: true,
    subtitleLanguage: "es",
    audioTrack: "original",
    quality: "auto"
  });

  if (!isOpen || !item) {
    return null;
  }

  const handlePlay = () => {
    onPlay(item, playbackOptions);
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return "Duración desconocida";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatRating = (rating?: number) => {
    return rating ? rating.toFixed(1) : "N/A";
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Detalles del Contenido</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Poster */}
            <div className="lg:w-1/3">
              <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Sin Poster
                  </div>
                )}
              </div>
            </div>

            {/* Content Details */}
            <div className="lg:w-2/3 space-y-6">
              {/* Title and Basic Info */}
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{item.name}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-4">
                  {item.year && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{item.year}</span>
                    </div>
                  )}
                  {item.runtime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatRuntime(item.runtime)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>{formatRating(item.playedPercentage)}</span>
                  </div>
                </div>

                {/* Type Badge */}
                <div className="mb-4">
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    {item.type === 'Movie' ? 'Película' : 
                     item.type === 'Series' ? 'Serie' : 
                     item.type === 'Episode' ? 'Episodio' : item.type}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {item.overview && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Sinopsis</h3>
                  <p className="text-gray-300 leading-relaxed">{item.overview}</p>
                </div>
              )}

              {/* Playback Progress */}
              {item.resumePosition > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Progreso</h3>
                  <div className="bg-gray-700 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(item.playedPercentage || 0)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400">
                    {item.playedPercentage ? `${item.playedPercentage.toFixed(1)}% completado` : 'Sin progreso'}
                  </p>
                </div>
              )}

              {/* Playback Options */}
              <Card className="bg-gray-800 border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Opciones de Reproducción</h3>
                
                <div className="space-y-4">
                  {/* Subtitles Toggle */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subtitles" className="text-white">Subtítulos</Label>
                    <Switch
                      id="subtitles"
                      checked={playbackOptions.subtitles}
                      onCheckedChange={(checked) => 
                        setPlaybackOptions(prev => ({ ...prev, subtitles: checked }))
                      }
                    />
                  </div>

                  {/* Subtitle Language */}
                  {playbackOptions.subtitles && (
                    <div>
                      <Label className="text-white block mb-2">Idioma de Subtítulos</Label>
                      <Select
                        value={playbackOptions.subtitleLanguage}
                        onValueChange={(value) => 
                          setPlaybackOptions(prev => ({ ...prev, subtitleLanguage: value }))
                        }
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">Inglés</SelectItem>
                          <SelectItem value="fr">Francés</SelectItem>
                          <SelectItem value="de">Alemán</SelectItem>
                          <SelectItem value="it">Italiano</SelectItem>
                          <SelectItem value="pt">Portugués</SelectItem>
                          <SelectItem value="none">Sin subtítulos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Audio Track */}
                  <div>
                    <Label className="text-white block mb-2">Pista de Audio</Label>
                    <Select
                      value={playbackOptions.audioTrack}
                      onValueChange={(value) => 
                        setPlaybackOptions(prev => ({ ...prev, audioTrack: value }))
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Audio Original</SelectItem>
                        <SelectItem value="es">Español (Doblado)</SelectItem>
                        <SelectItem value="en">Inglés</SelectItem>
                        <SelectItem value="fr">Francés</SelectItem>
                        <SelectItem value="de">Alemán</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quality */}
                  <div>
                    <Label className="text-white block mb-2">Calidad</Label>
                    <Select
                      value={playbackOptions.quality}
                      onValueChange={(value) => 
                        setPlaybackOptions(prev => ({ ...prev, quality: value }))
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Automático</SelectItem>
                        <SelectItem value="4k">4K Ultra HD</SelectItem>
                        <SelectItem value="1080p">1080p Full HD</SelectItem>
                        <SelectItem value="720p">720p HD</SelectItem>
                        <SelectItem value="480p">480p</SelectItem>
                        <SelectItem value="360p">360p</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Play Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handlePlay}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {item.resumePosition > 0 ? 'Continuar Reproducción' : 'Reproducir'}
                </Button>
                
                {item.resumePosition > 0 && (
                  <Button
                    onClick={() => {
                      // Reset playback position and play from start
                      const resetOptions = { ...playbackOptions };
                      onPlay({ ...item, resumePosition: 0 }, resetOptions);
                    }}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Desde el Inicio
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}