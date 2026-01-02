import { useState, useRef, useEffect } from "react";
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
  ChevronRight,
  Star,
  Hash
} from "lucide-react";

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

// Funciones de detección de canales españoles
function isSpanishChannel(name: string) {
  const spanishChannels = [
    'la 1', 'la2', 'antena 3', 'cuatro', 'telecinco', 'la sexta', 'clan', 
    'tdp', 'neox', 'nova', 'mega', 'atreseries', 'fdf', 'energy', 'divinity',
    'be mad', 'dmax', 'paramount', 'comedy central', 'mtv', 'nickelodeon',
    'canal sur', 'telemadrid', 'tv3', 'etb', 'canal extremadura', 'canal castilla',
    'aragón tv', 'rtpa', 'crtvg', 'ib3', 'canal 9', 'rtvc', 'canal 24h',
    'tve', 'rtve', 'teledeporte', 'clan tv'
  ];
  return spanishChannels.some(spanish => name.includes(spanish));
}

function isSpanishSportsChannel(name: string) {
  const spanishSportsChannels = [
    'teledeporte', 'tdp', 'movistar deportes', 'gol', 'gol play', 'gol tv',
    'real madrid tv', 'barca tv', 'deportes cuatro', 'mega deportes',
    'esport3', 'andalucía turismo', 'aragón deporte', 'etb deportes',
    'canal + deportes', 'dazn', 'laliga', 'liga de campeones', 'copa del rey',
    'barcelona tv', 'madrid tv deportes', 'deportes valencia', 'sevilla fc tv',
    'españa', 'spain', 'spanish', 'valencia', 'sevilla', 'atletico',
    'la liga', 'primera división', 'segunda división', 'fútbol español',
    'vamos', 'movistar', 'realmadrid', 'fcbarcelona', 'athletic',
    'real sociedad', 'villarreal', 'betis', 'celta', 'espanyol'
  ];
  return spanishSportsChannels.some(spanish => name.includes(spanish));
}

// Funciones de categorización y utilidades
function categorizeLiveTVChannels(channels: LiveTVChannel[], favoriteChannelIds: string[] = []) {
  const categories: { [key: string]: LiveTVChannel[] } = {
    '⭐ Favoritos': [],
    '🇪🇸 Canales de España': [],
    '📺 Entretenimiento': [],
    '📰 Noticias': [],
    '⚽ Deportes': [],
    '🎬 Cine y Series': [],
    '🎵 Música': [],
    '👶 Infantil': [],
    '🎓 Documentales': [],
    '🌍 Internacionales': [],
    '📡 Otros': []
  };

  channels.forEach(channel => {
    const name = channel.Name?.toLowerCase() || '';
    const number = parseInt(channel.Number || channel.ChannelNumber?.toString() || '0') || 0;

    // Añadir a favoritos si está en la lista
    if (favoriteChannelIds.includes(channel.Id)) {
      categories['⭐ Favoritos'].push(channel);
    }

    // Prioridad: Canales españoles primero
    if (isSpanishChannel(name)) {
      categories['🇪🇸 Canales de España'].push(channel);
    } else if (name.includes('news') || name.includes('noticias') || name.includes('info') || name.includes('24h')) {
      categories['📰 Noticias'].push(channel);
    } else if (name.includes('sport') || name.includes('deportes') || name.includes('espn') || name.includes('fox') || name.includes('eurosport') || isSpanishSportsChannel(name)) {
      categories['⚽ Deportes'].push(channel);
    } else if (name.includes('kids') || name.includes('infantil') || name.includes('cartoon') || name.includes('disney') || name.includes('nick')) {
      categories['👶 Infantil'].push(channel);
    } else if (name.includes('music') || name.includes('mtv') || name.includes('música') || name.includes('hit') || name.includes('radio')) {
      categories['🎵 Música'].push(channel);
    } else if (name.includes('documentary') || name.includes('documental') || name.includes('discovery') || name.includes('national') || name.includes('history')) {
      categories['🎓 Documentales'].push(channel);
    } else if (name.includes('movie') || name.includes('cine') || name.includes('film') || name.includes('cinema') || name.includes('series') || name.includes('tv') || name.includes('show') || name.includes('drama')) {
      categories['🎬 Cine y Series'].push(channel);
    } else if (name.includes('international') || name.includes('world') || name.includes('global') || number >= 500) {
      categories['🌍 Internacionales'].push(channel);
    } else {
      categories['📺 Entretenimiento'].push(channel);
    }
  });

  // Ordenar canales dentro de cada categoría
  Object.keys(categories).forEach(category => {
    categories[category].sort((a, b) => {
      // En deportes, priorizar canales españoles
      if (category === '⚽ Deportes') {
        const aIsSpanish = isSpanishSportsChannel(a.Name?.toLowerCase() || '');
        const bIsSpanish = isSpanishSportsChannel(b.Name?.toLowerCase() || '');
        
        if (aIsSpanish && !bIsSpanish) return -1;
        if (!aIsSpanish && bIsSpanish) return 1;
      }
      
      const aNum = parseInt(a.Number || a.ChannelNumber?.toString() || '999');
      const bNum = parseInt(b.Number || b.ChannelNumber?.toString() || '999');
      return aNum - bNum;
    });
  });

  return categories;
}

function getCategoryIcon(category: string) {
  const icons: { [key: string]: any } = {
    '🇪🇸 Canales de España': MapPin,
    '📺 Entretenimiento': Heart,
    '📰 Noticias': Newspaper,
    '⚽ Deportes': Trophy,
    '🎬 Cine y Series': Play,
    '🎵 Música': Music,
    '👶 Infantil': Baby,
    '🎓 Documentales': Camera,
    '🌍 Internacionales': Globe,
    '📡 Otros': Radio
  };
  return icons[category] || Radio;
}

export default function LiveTVCollapsible() {
  const [selectedChannel, setSelectedChannel] = useState<LiveTVChannel | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>(() => {
    const saved = localStorage.getItem('liveTV_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    '⭐ Favoritos': true,
    '🇪🇸 Canales de España': true
  });
  const videoRef = useRef<HTMLVideoElement>(null);

  // Obtener canales de Live TV del servidor real
  const { data: channels, isLoading, error } = useQuery({
    queryKey: ['/api/livetv/channels/all'],
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Canales demo para fallback
  const demoChannels: LiveTVChannel[] = [
    {
      Id: 'demo-1',
      Name: 'Canal 24 Horas',
      Type: 'TvChannel',
      Number: '24',
      CurrentProgram: {
        Name: 'Noticias',
        Overview: 'Información actualizada',
        StartDate: new Date().toISOString(),
        EndDate: new Date(Date.now() + 3600000).toISOString()
      }
    },
    {
      Id: 'demo-2', 
      Name: 'ESPN Deportes',
      Type: 'TvChannel',
      Number: '101',
      CurrentProgram: {
        Name: 'Fútbol Internacional',
        Overview: 'Lo mejor del fútbol mundial',
        StartDate: new Date().toISOString(),
        EndDate: new Date(Date.now() + 7200000).toISOString()
      }
    },
    {
      Id: 'demo-3',
      Name: 'Discovery Channel',
      Type: 'TvChannel', 
      Number: '201',
      CurrentProgram: {
        Name: 'Vida Salvaje',
        Overview: 'Documentales de naturaleza',
        StartDate: new Date().toISOString(),
        EndDate: new Date(Date.now() + 5400000).toISOString()
      }
    }
  ];

  const channelList = channels && channels.length > 0 ? channels : demoChannels;
  const categorizedChannels = categorizeLiveTVChannels(channelList, favoriteChannels);

  // Guardar favoritos en localStorage
  const saveFavorites = (favorites: string[]) => {
    localStorage.setItem('liveTV_favorites', JSON.stringify(favorites));
    setFavoriteChannels(favorites);
  };

  // Añadir/quitar canal de favoritos
  const toggleFavorite = (channelId: string) => {
    const newFavorites = favoriteChannels.includes(channelId)
      ? favoriteChannels.filter(id => id !== channelId)
      : [...favoriteChannels, channelId];
    saveFavorites(newFavorites);
  };

  // Comprobar si un canal es favorito
  const isFavorite = (channelId: string) => favoriteChannels.includes(channelId);

  const handleChannelSelect = (channel: LiveTVChannel) => {
    setSelectedChannel(channel);
    setIsPlaying(true);
    console.log(`🎬 Selected channel: ${channel.Name}`);
    
    // Reset video when changing channels
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(err => {
        console.log('Auto-play blocked, user interaction required');
      });
    }
  };

  // Update video volume and mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.log('Play failed:', err);
        });
      }
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
      videoRef.current.muted = newVolume === 0;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Cargando canales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white android-optimized">
      {/* Layout responsivo: móvil vertical, tablet/desktop horizontal */}
      <div className="flex flex-col lg:flex-row h-screen android-layout">
        {/* Panel de Canales - Adaptativo según tamaño de pantalla */}
        <div className="w-full lg:w-1/3 bg-gray-800 border-b lg:border-b-0 lg:border-r border-gray-700 flex flex-col max-h-[50vh] lg:max-h-none">
          <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-purple-800 to-blue-800 border-b border-purple-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                📺 <span className="bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">TV en Vivo</span>
              </CardTitle>
              <Badge variant="secondary" className="bg-yellow-400 text-purple-800 font-bold text-sm sm:text-lg px-2 sm:px-3 py-1 self-start sm:self-auto">
                {channelList.length} canales
              </Badge>
            </div>
            <p className="text-purple-200 mt-2 text-xs sm:text-sm">🇪🇸 Canales españoles prioritarios • Entretenimiento premium</p>
          </CardHeader>

          {/* Barra de Búsqueda */}
          <div className="p-3 sm:p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
            <div className="relative mb-3">
              <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-yellow-400 text-base sm:text-lg font-bold">#</span>
              <Input
                placeholder="🔢 Buscar por número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-gradient-to-r from-gray-700 to-gray-800 border-2 border-blue-500 text-white text-sm sm:text-lg rounded-xl focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300"
              />
            </div>
            
            {/* Controles de favoritos */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 transition-all duration-200 text-xs sm:text-sm w-full sm:w-auto ${
                  showFavoritesOnly 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600' 
                    : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Star className={`w-3 sm:w-4 h-3 sm:h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                <span className="sm:hidden">{showFavoritesOnly ? 'Todos' : 'Favoritos'}</span>
                <span className="hidden sm:inline">{showFavoritesOnly ? 'Mostrar todos' : 'Solo favoritos'}</span>
              </Button>
              
              {favoriteChannels.length > 0 && (
                <Badge variant="secondary" className="bg-yellow-600 text-white text-xs sm:text-sm">
                  {favoriteChannels.length} favorito{favoriteChannels.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            {/* Resultado de búsqueda por número */}
            {searchTerm && (
              <div className="mt-3 p-3 bg-gradient-to-r from-purple-800 to-blue-800 rounded-lg border border-purple-500">
                {(() => {
                  // Buscar canal exacto primero
                  const exactChannel = channelList.find(channel => {
                    const channelNumber = (channel.Number || channel.ChannelNumber || '').toString();
                    return channelNumber === searchTerm;
                  });
                  
                  if (exactChannel) {
                    return (
                      <div 
                        className="flex items-center gap-3 text-white cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-all"
                        onClick={() => handleChannelSelect(exactChannel)}
                      >
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">
                          {exactChannel.Number || exactChannel.ChannelNumber}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-green-300 text-lg">
                            📺 Canal {searchTerm}: {exactChannel.Name}
                          </div>
                          {exactChannel.CurrentProgram && (
                            <div className="text-sm text-gray-300">
                              🎬 Ahora: {exactChannel.CurrentProgram.Name}
                            </div>
                          )}
                        </div>
                        <div className="text-green-400 font-bold">
                          ▶️ CLIC PARA VER
                        </div>
                      </div>
                    );
                  } else {
                    // Buscar canales que contengan el número
                    const partialChannels = channelList.filter(channel => {
                      const channelNumber = (channel.Number || channel.ChannelNumber || '').toString();
                      return channelNumber.includes(searchTerm);
                    }).slice(0, 3); // Mostrar máximo 3 resultados parciales
                    
                    if (partialChannels.length > 0) {
                      return (
                        <div className="space-y-2">
                          <div className="text-yellow-300 font-bold">
                            📋 Canales que contienen "{searchTerm}":
                          </div>
                          {partialChannels.map(channel => (
                            <div 
                              key={channel.Id}
                              className="flex items-center gap-3 text-white cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-all"
                              onClick={() => handleChannelSelect(channel)}
                            >
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                                {channel.Number || channel.ChannelNumber}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">
                                  📺 {channel.Name}
                                </div>
                              </div>
                              <div className="text-blue-400 text-sm">
                                ▶️
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-red-300 flex items-center gap-2">
                          <span>❌</span>
                          <span>No se encontró el canal #{searchTerm}</span>
                        </div>
                      );
                    }
                  }
                })()}
              </div>
            )}
          </div>

          {/* Secciones Colapsables por Categoría */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {Object.entries(categorizedChannels).map(([categoryName, channels]) => {
                // Filtrar por favoritos si está activado
                const filteredChannels = showFavoritesOnly 
                  ? channels.filter(channel => favoriteChannels.includes(channel.Id))
                  : channels;
                
                if (filteredChannels.length === 0) return null;
                
                const Icon = getCategoryIcon(categoryName);
                const isExpanded = expandedSections[categoryName];
                
                return (
                  <Collapsible
                    key={categoryName}
                    open={isExpanded}
                    onOpenChange={() => toggleSection(categoryName)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`w-full justify-between p-3 sm:p-4 h-auto rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                          categoryName === '🇪🇸 Canales de España' 
                            ? 'bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 border-red-400 shadow-lg shadow-red-500/25' 
                            : 'bg-gradient-to-r from-blue-800 to-purple-700 hover:from-blue-700 hover:to-purple-600 border-blue-500 shadow-lg shadow-blue-500/25'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                            categoryName === '🇪🇸 Canales de España' 
                              ? 'bg-white/20 text-white' 
                              : 'bg-white/20 text-blue-200'
                          }`}>
                            <Icon className="w-4 sm:w-5 h-4 sm:h-5" />
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <span className="font-bold text-white text-sm sm:text-lg block truncate">{categoryName}</span>
                            <div className="text-xs text-gray-200 opacity-90 hidden sm:block">
                              {filteredChannels.length} canales disponibles
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 ${
                              categoryName === '🇪🇸 Canales de España' 
                                ? 'bg-white text-red-600' 
                                : 'bg-blue-200 text-blue-800'
                            }`}
                          >
                            {filteredChannels.length}
                          </Badge>
                          <div className={`transform transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : 'rotate-0'
                          }`}>
                            <ChevronDown className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                          </div>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-1 mt-1">
                      {filteredChannels
                        .filter(channel => {
                          // Buscar solo por número de canal
                          const channelNumber = (channel.Number || channel.ChannelNumber || '').toString();
                          return channelNumber.includes(searchTerm);
                        })
                        .map((channel) => (
                          <Card 
                            key={channel.Id}
                            className={`cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ml-2 sm:ml-4 rounded-lg border-2 ${
                              selectedChannel?.Id === channel.Id 
                                ? 'bg-gradient-to-r from-green-600 to-blue-600 border-green-400 shadow-lg shadow-green-500/30' 
                                : 'bg-gradient-to-r from-gray-700 to-gray-800 border-gray-500 hover:from-gray-600 hover:to-gray-700'
                            }`}
                            onClick={() => handleChannelSelect(channel)}
                          >
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <div className={`w-8 sm:w-12 h-8 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border-2 flex-shrink-0 ${
                                  selectedChannel?.Id === channel.Id 
                                    ? 'bg-white text-green-600 border-white' 
                                    : 'bg-blue-600 text-white border-blue-400'
                                }`}>
                                  {channel.Number || channel.ChannelNumber || '📺'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold truncate text-sm sm:text-base text-white flex items-center gap-1 sm:gap-2">
                                    {/* Indicador especial para deportes españoles */}
                                    {categoryName === '⚽ Deportes' && isSpanishSportsChannel(channel.Name?.toLowerCase() || '') && (
                                      <span className="text-red-400 font-bold text-xs sm:text-sm">🇪🇸</span>
                                    )}
                                    <span className="truncate">{channel.Name}</span>
                                  </h3>
                                  {channel.CurrentProgram && (
                                    <div className="text-xs sm:text-sm text-gray-200 mt-1">
                                      <div className="truncate font-medium">
                                        🎬 {channel.CurrentProgram.Name}
                                      </div>
                                      <div className="hidden sm:flex items-center gap-2 mt-1 text-xs text-gray-300">
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
                                <div className="flex flex-col items-center gap-1 sm:gap-2 flex-shrink-0">
                                  {selectedChannel?.Id === channel.Id && (
                                    <div className="flex items-center">
                                      <Signal className="w-4 sm:w-5 h-4 sm:h-5 text-green-300 animate-pulse" />
                                    </div>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`p-1 h-auto transition-all duration-200 ${
                                      isFavorite(channel.Id) 
                                        ? 'text-yellow-400 hover:text-yellow-300' 
                                        : 'text-gray-400 hover:text-yellow-400'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(channel.Id);
                                    }}
                                  >
                                    <Star className={`w-3 sm:w-4 h-3 sm:h-4 ${isFavorite(channel.Id) ? 'fill-current' : ''}`} />
                                  </Button>
                                  <div className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold ${
                                    selectedChannel?.Id === channel.Id 
                                      ? 'bg-green-200 text-green-800' 
                                      : 'bg-blue-200 text-blue-800'
                                  }`}>
                                    <span className="hidden sm:inline">EN VIVO</span>
                                    <span className="sm:hidden">LIVE</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Panel Reproductor - Adaptativo según tamaño de pantalla */}
        <div className="flex-1 bg-gray-900 flex flex-col min-h-[50vh] lg:min-h-0">
          {selectedChannel ? (
            <>
              {/* Información del Canal */}
              <div className="p-3 sm:p-4 border-b border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Tv className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl font-bold truncate">{selectedChannel.Name}</h2>
                      {selectedChannel.CurrentProgram && (
                        <p className="text-gray-400 text-sm sm:text-base truncate">{selectedChannel.CurrentProgram.Name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-3 py-1 flex-shrink-0">
                    {selectedChannel.Number || selectedChannel.ChannelNumber || '?'}
                  </Badge>
                </div>
              </div>

              {/* Área del Reproductor - Android optimizado con detección de dispositivo */}
              <div className="flex-1 bg-black flex items-center justify-center p-2 lg:p-4">
                <div className="w-full h-full flex items-center justify-center relative">
                  {/* Mensaje informativo para Android */}
                  <div className="absolute top-2 left-2 z-40 bg-blue-600/90 text-white px-3 py-1 rounded-lg text-xs">
                    📱 Optimizado para Android
                  </div>
                  
                  {/* Reproductor HTML optimizado para Android */}
                  <iframe
                    key={selectedChannel.Id}
                    src={`/api/livetv/player/${selectedChannel.Id}`}
                    className="w-full h-full border-0 rounded-lg"
                    style={{ 
                      backgroundColor: '#000000',
                      minHeight: '300px'
                    }}
                    allowFullScreen
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    loading="lazy"
                    title={`TV en vivo: ${selectedChannel.Name}`}
                    onLoad={() => {
                      console.log('✅ Android HTML player loaded:', selectedChannel.Name);
                    }}
                    onError={() => {
                      console.log('❌ Android HTML player error:', selectedChannel.Name);
                    }}
                  />
                  
                  {/* Reproductor de video alternativo (oculto inicialmente) */}
                  <video
                    ref={videoRef}
                    className="hidden w-full h-full max-w-full max-h-full object-cover lg:object-contain"
                    controls
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    style={{ 
                      backgroundColor: '#000000',
                      borderRadius: '4px'
                    }}
                  >
                    <source 
                      src={`/api/livetv/stream/${selectedChannel.Id}`} 
                      type="video/mp4"
                    />
                  </video>
                  
                  {/* Mensaje de carga centrado */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30 pointer-events-none">
                    <div className="text-white text-center">
                      <div className="animate-pulse text-2xl mb-2">📺</div>
                      <p className="text-sm font-medium">{selectedChannel.Name}</p>
                      <p className="text-xs text-gray-300 mt-1">Cargando transmisión...</p>
                    </div>
                  </div>
                  
                  {/* Controles Android optimizados */}
                  <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
                    <Button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = false;
                          videoRef.current.volume = volume / 100;
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                    >
                      🔊 Audio
                    </Button>
                    
                    <Button
                      onClick={() => {
                        const playerUrl = `/api/livetv/player/${selectedChannel.Id}`;
                        window.open(playerUrl, '_blank');
                      }}
                      size="sm"
                      variant="outline"
                      className="bg-blue-600/80 border-blue-400/20 text-white hover:bg-blue-700/80"
                    >
                      📱 Ventana
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (videoRef.current) {
                          const video = videoRef.current;
                          video.load();
                          video.play().then(() => {
                            console.log('✅ Manual play successful');
                          }).catch((playError) => {
                            console.log('❌ Manual play failed:', playError);
                            // Fallback to external window
                            window.open(`/api/livetv/stream/${selectedChannel.Id}`, '_blank');
                          });
                        }
                      }}
                      size="sm"
                      variant="outline"
                      className="bg-green-600/80 border-green-400/20 text-white hover:bg-green-700/80"
                    >
                      🔄 Reintentar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Controles del Reproductor */}
              <div className="p-3 sm:p-4 bg-gray-800 border-t border-gray-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePlayPause}
                      className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                      ) : (
                        <Play className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                      )}
                    </Button>
                    
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="w-7 sm:w-8 h-7 sm:h-8 flex-shrink-0"
                      >
                        {isMuted ? (
                          <VolumeX className="w-3 sm:w-4 h-3 sm:h-4" />
                        ) : (
                          <Volume2 className="w-3 sm:w-4 h-3 sm:h-4" />
                        )}
                      </Button>
                      
                      <div className="w-16 sm:w-20 h-2 bg-gray-600 rounded-full flex-shrink-0">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-200"
                          style={{ width: `${isMuted ? 0 : volume}%` }}
                        />
                      </div>
                      
                      <span className="text-xs text-gray-400 w-8 flex-shrink-0 text-center">
                        {isMuted ? 0 : volume}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Tv className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Selecciona un canal</h3>
                <p className="text-gray-400">Elige un canal de la lista para comenzar a ver TV en vivo</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}