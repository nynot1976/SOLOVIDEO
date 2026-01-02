import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Tv, 
  Radio, 
  Globe, 
  Newspaper, 
  Trophy, 
  Heart,
  Baby,
  Music,
  Camera,
  MapPin,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Search,
  Filter,
  Clock,
  Signal,
  ChevronDown,
  ChevronRight
} from "lucide-react";

// Definición de tipos
interface LiveTVChannel {
  Id: string;
  Name: string;
  Type: string;
  Number?: string;
  ChannelType?: string;
  CurrentProgram?: {
    Name: string;
    Overview: string;
    StartDate: string;
    EndDate: string;
  };
  ServerId?: string;
  ImageTags?: any;
  ChannelNumber?: number;
}

// Funciones de categorización y utilidades
function categorizeLiveTVChannels(channels: LiveTVChannel[]) {
  const categories: { [key: string]: LiveTVChannel[] } = {
    'Noticias': [],
    'Deportes': [],
    'Entretenimiento': [],
    'Infantil': [],
    'Música': [],
    'Documentales': [],
    'Cine': [],
    'Series': [],
    'Locales': [],
    'Internacionales': [],
    'Otros': []
  };

  channels.forEach(channel => {
    const name = channel.Name?.toLowerCase() || '';
    const number = parseInt(channel.Number || channel.ChannelNumber?.toString() || '0') || 0;

    if (name.includes('news') || name.includes('noticias') || name.includes('info') || name.includes('24h')) {
      categories['Noticias'].push(channel);
    } else if (name.includes('sport') || name.includes('deportes') || name.includes('espn') || name.includes('fox') || name.includes('eurosport')) {
      categories['Deportes'].push(channel);
    } else if (name.includes('kids') || name.includes('infantil') || name.includes('cartoon') || name.includes('disney') || name.includes('nick')) {
      categories['Infantil'].push(channel);
    } else if (name.includes('music') || name.includes('mtv') || name.includes('música') || name.includes('hit') || name.includes('radio')) {
      categories['Música'].push(channel);
    } else if (name.includes('discovery') || name.includes('national') || name.includes('documentary') || name.includes('history') || name.includes('animal')) {
      categories['Documentales'].push(channel);
    } else if (name.includes('movie') || name.includes('cinema') || name.includes('film') || name.includes('cine') || name.includes('hbo')) {
      categories['Cine'].push(channel);
    } else if (name.includes('series') || name.includes('drama') || name.includes('comedy') || name.includes('tv') || name.includes('show')) {
      categories['Series'].push(channel);
    } else if (number < 100) {
      categories['Locales'].push(channel);
    } else if (number >= 100) {
      categories['Internacionales'].push(channel);
    } else {
      categories['Otros'].push(channel);
    }
  });

  // Ordenar canales por número dentro de cada categoría
  Object.keys(categories).forEach(category => {
    categories[category].sort((a, b) => {
      const numA = parseInt(a.Number || a.ChannelNumber?.toString() || '0') || 0;
      const numB = parseInt(b.Number || b.ChannelNumber?.toString() || '0') || 0;
      return numA - numB;
    });
  });

  return categories;
}

function getCategoryIcon(category: string) {
  const icons = {
    'Noticias': Newspaper,
    'Deportes': Trophy,
    'Entretenimiento': Heart,
    'Infantil': Baby,
    'Música': Music,
    'Documentales': Camera,
    'Cine': Play,
    'Series': Tv,
    'Locales': MapPin,
    'Internacionales': Globe,
    'Otros': Radio
  };
  return icons[category] || Radio;
}

export default function LiveTVProfessional() {
  const [selectedChannel, setSelectedChannel] = useState<LiveTVChannel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Obtener canales de Live TV del servidor real
  const { data: channels, isLoading, error } = useQuery({
    queryKey: ['/api/livetv/channels/all'],
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Canales demo para fallback
  const demoChannels = [
    {
      Id: 'demo-news',
      Name: 'Canal 24 Horas Noticias',
      Type: 'LiveTv',
      Number: '101',
      ChannelType: 'TV',
      CurrentProgram: {
        Name: 'Noticias en Directo',
        Overview: 'Información actualizada las 24 horas del día',
        StartDate: '2025-01-08T09:00:00Z',
        EndDate: '2025-01-08T10:00:00Z'
      }
    },
    {
      Id: 'demo-sports',
      Name: 'ESPN Deportes HD',
      Type: 'LiveTv',
      Number: '102',
      ChannelType: 'TV',
      CurrentProgram: {
        Name: 'Fútbol Internacional',
        Overview: 'Los mejores partidos de fútbol en vivo',
        StartDate: '2025-01-08T09:00:00Z',
        EndDate: '2025-01-08T11:00:00Z'
      }
    },
    {
      Id: 'demo-movies',
      Name: 'Cine Premium',
      Type: 'LiveTv',
      Number: '103',
      ChannelType: 'TV',
      CurrentProgram: {
        Name: 'Película de Acción',
        Overview: 'Blockbuster hollywoodense de estreno',
        StartDate: '2025-01-08T08:30:00Z',
        EndDate: '2025-01-08T10:30:00Z'
      }
    }
  ];

  // Usar canales reales si están disponibles, sino usar demo
  const finalChannels = channels?.length > 0 ? channels : demoChannels;
  const categorizedChannels = categorizeLiveTVChannels(finalChannels);

  // Filtrar canales por categoría y búsqueda
  const filteredChannels = finalChannels.filter(channel => {
    const matchesCategory = selectedCategory === 'all' || 
      categorizedChannels[selectedCategory]?.some(c => c.Id === channel.Id);
    const matchesSearch = channel.Name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleChannelSelect = (channel: LiveTVChannel) => {
    setSelectedChannel(channel);
    setIsPlaying(true);
    console.log(`🎬 Selected channel: ${channel.Name}`);
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-900">
        <div className="w-1/3 border-r border-gray-700 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 p-4">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-700 rounded mb-4"></div>
            <div className="h-16 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Panel Izquierdo - Lista de Canales */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        {/* Header del Panel */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Tv className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold">TV en Vivo</h1>
            {channels?.length > 0 ? (
              <Badge variant="default" className="text-xs">
                {finalChannels.length} canales
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Demo
              </Badge>
            )}
          </div>

          {/* Barra de búsqueda */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar canales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-600 text-white"
            />
          </div>

          {/* Filtros de categoría */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="text-xs"
            >
              Todos
            </Button>
            {Object.keys(categorizedChannels).map(category => {
              const count = categorizedChannels[category].length;
              if (count === 0) return null;
              
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs"
                >
                  {category} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Lista de Canales */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredChannels.map((channel) => (
              <Card 
                key={channel.Id}
                className={`cursor-pointer transition-all duration-200 hover:bg-gray-700 ${
                  selectedChannel?.Id === channel.Id 
                    ? 'bg-blue-900 border-blue-500' 
                    : 'bg-gray-800 border-gray-600'
                }`}
                onClick={() => handleChannelSelect(channel)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {channel.Number || channel.ChannelNumber || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate text-sm">
                        {channel.Name}
                      </h3>
                      {channel.CurrentProgram && (
                        <div className="text-xs text-gray-400 mt-1">
                          <div className="truncate">{channel.CurrentProgram.Name}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(channel.CurrentProgram.StartDate).toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })} - 
                              {new Date(channel.CurrentProgram.EndDate).toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedChannel?.Id === channel.Id && (
                      <div className="flex items-center">
                        <Signal className="w-4 h-4 text-green-500" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Panel Derecho - Reproductor */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Área del Reproductor */}
            <div className="flex-1 relative bg-black">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-800 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <Tv className="w-16 h-16 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{selectedChannel.Name}</h2>
                  <p className="text-gray-400 mb-4">Canal {selectedChannel.Number || selectedChannel.ChannelNumber}</p>
                  {selectedChannel.CurrentProgram && (
                    <div className="bg-gray-800 rounded-lg p-4 max-w-md mx-auto">
                      <h3 className="font-semibold mb-2">{selectedChannel.CurrentProgram.Name}</h3>
                      <p className="text-sm text-gray-300 mb-2">{selectedChannel.CurrentProgram.Overview}</p>
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(selectedChannel.CurrentProgram.StartDate).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - 
                          {new Date(selectedChannel.CurrentProgram.EndDate).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                  {channels?.length > 0 ? (
                    <Badge variant="default" className="mt-4">
                      Streaming desde Servidor Real
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-4">
                      Vista Previa Demo
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Controles del Reproductor */}
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlayPause}
                    className="text-white hover:bg-gray-700"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                      className="text-white hover:bg-gray-700"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <div className="w-20">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8">{isMuted ? 0 : volume}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-gray-700"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-gray-700"
                  >
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Estado Inicial - Sin Canal Seleccionado */
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-lg flex items-center justify-center mb-6 mx-auto">
                <Tv className="w-16 h-16 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Selecciona un Canal</h2>
              <p className="text-gray-400 mb-4">
                Elige un canal de la lista para comenzar a ver TV en vivo
              </p>
              <Badge variant="secondary">
                {finalChannels.length} canales disponibles
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}