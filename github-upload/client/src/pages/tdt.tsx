import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowLeft, Search, Star, StarOff, Play, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface TDTChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  tvgName?: string;
  tvgId?: string;
}

interface TDTChannelsByCategory {
  [category: string]: TDTChannel[];
}

export default function TDTPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('tdt-favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Fetch TDT channels by categories
  const { data: channelsByCategory, isLoading } = useQuery<TDTChannelsByCategory>({
    queryKey: ['/api/tdt/categories'],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Search channels
  const { data: searchResults, isLoading: isSearching } = useQuery<TDTChannel[]>({
    queryKey: ['/api/tdt/search', searchQuery],
    enabled: searchQuery.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  useEffect(() => {
    localStorage.setItem('tdt-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (channelId: string) => {
    setFavorites(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getChannelsToShow = () => {
    if (searchQuery.length > 2 && searchResults) {
      return { 'Resultados de búsqueda': searchResults };
    }
    
    if (!channelsByCategory) return {};
    
    if (showOnlyFavorites) {
      const favoriteChannels: TDTChannel[] = [];
      Object.values(channelsByCategory).forEach(channels => {
        channels.forEach(channel => {
          if (favorites.includes(channel.id)) {
            favoriteChannels.push(channel);
          }
        });
      });
      return favoriteChannels.length > 0 ? { '⭐ Favoritos': favoriteChannels } : {};
    }
    
    return channelsByCategory;
  };

  const getTotalChannelCount = () => {
    if (!channelsByCategory) return 0;
    return Object.values(channelsByCategory).reduce((total, channels) => total + channels.length, 0);
  };

  const renderChannelCard = (channel: TDTChannel) => {
    const isFavorite = favorites.includes(channel.id);
    
    return (
      <div 
        key={channel.id}
        className="group relative bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-all duration-300 hover:scale-105"
      >
        {/* Canal favorito */}
        <button
          onClick={() => toggleFavorite(channel.id)}
          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
          {isFavorite ? (
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
          ) : (
            <StarOff className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Logo del canal */}
        <div className="aspect-video bg-gray-800 flex items-center justify-center p-4">
          {channel.logo ? (
            <img 
              src={channel.logo}
              alt={channel.name}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`flex flex-col items-center text-center ${channel.logo ? 'hidden' : ''}`}>
            <Tv className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm text-gray-400">{channel.name}</span>
          </div>
        </div>

        {/* Información del canal */}
        <div className="p-3">
          <h3 className="font-semibold text-white text-sm mb-1 truncate">{channel.name}</h3>
          <p className="text-xs text-gray-400 mb-2">{channel.group}</p>
          
          {/* Botón de reproducir */}
          <a
            href={`/api/tdt/player/${channel.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button 
              size="sm" 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <Play className="w-4 h-4 mr-1" />
              Ver en Vivo
            </Button>
          </a>
        </div>

        {/* Indicador EN VIVO */}
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
          ● EN VIVO
        </div>
      </div>
    );
  };

  const renderChannelGrid = (channels: TDTChannel[]) => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {channels.map(renderChannelCard)}
      </div>
    );
  };

  const renderLoadingSkeleton = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-lg overflow-hidden">
            <Skeleton className="aspect-video bg-gray-800" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 bg-gray-800" />
              <Skeleton className="h-3 bg-gray-800 w-2/3" />
              <Skeleton className="h-8 bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center">
                  🇪🇸 TDT España
                </h1>
                <p className="text-sm text-gray-400">
                  {getTotalChannelCount()} canales disponibles
                </p>
              </div>
            </div>
            
            {/* Controles */}
            <div className="flex items-center space-x-4">
              {/* Contador de favoritos */}
              {favorites.length > 0 && (
                <Button
                  variant={showOnlyFavorites ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  className="text-yellow-400"
                >
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  {favorites.length} Favoritos
                </Button>
              )}
            </div>
          </div>
          
          {/* Búsqueda */}
          <div className="mt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar canales TDT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          renderLoadingSkeleton()
        ) : (
          <div className="space-y-8">
            {Object.entries(getChannelsToShow()).map(([category, channels]) => {
              const isExpanded = expandedCategories[category] !== false; // Por defecto expandido
              
              return (
                <div key={category} className="space-y-4">
                  {/* Encabezado de categoría */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="flex items-center space-x-2 text-xl font-bold text-white hover:text-gray-300 transition-colors"
                    >
                      <span>{category}</span>
                      <span className="text-sm bg-red-600 px-2 py-1 rounded-full">
                        {channels.length}
                      </span>
                    </button>
                  </div>
                  
                  {/* Canales */}
                  {isExpanded && (
                    <div className="space-y-4">
                      {renderChannelGrid(channels)}
                    </div>
                  )}
                </div>
              );
            })}
            
            {Object.keys(getChannelsToShow()).length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Tv className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  {searchQuery ? 'No se encontraron canales' : 'No hay canales disponibles'}
                </h3>
                <p className="text-gray-500">
                  {searchQuery 
                    ? `Intenta con otros términos de búsqueda`
                    : `Verifica tu conexión a internet`
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}