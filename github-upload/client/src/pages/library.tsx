import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRouter } from "wouter";
import { Header } from "@/components/header";
import { MediaGrid } from "@/components/clickable-media-grid";
import { DirectStreamPlayer } from "@/components/direct-stream-player";
import { MediaDetails } from "@/components/media-details";
import { SeriesDetails } from "@/components/series-details";
import { M3UServerPlayer } from "@/components/m3u-server-player";
import { ContentFilters } from "@/components/content-filters";
import { ContinueWatchingSection } from "@/components/continue-watching-section";
import { LibraryGridSkeleton, MediaGridSkeleton } from "@/components/loading-skeletons";
import { Pagination } from "@/components/pagination";
import { useGestures } from "@/hooks/use-gestures";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { embyClient, MediaItem, Library } from "@/lib/emby-client";
import { Search, Library as LibraryIcon, Film, Tv, Music, Book, ArrowLeft, Sparkles, Zap, Star } from "lucide-react";

export default function LibraryPage() {
  const [location, setLocation] = useLocation();
  const router = useRouter();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [isSeriesDetailsOpen, setIsSeriesDetailsOpen] = useState(false);
  const [isM3UPlayerOpen, setIsM3UPlayerOpen] = useState(false);
  const [selectedM3UItem, setSelectedM3UItem] = useState<{ id: string; title: string; type: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [animatingLibraries, setAnimatingLibraries] = useState<Set<string>>(new Set());
  const [hasAnimated, setHasAnimated] = useState(false);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<any>(null);
  const libraryPageRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get library ID from URL if viewing specific library
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const libraryIdFromUrl = urlParams.get('library');
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: connectionStatus, isLoading: isLoadingConnection } = useQuery({
    queryKey: ["/api/connection/status"],
    queryFn: () => embyClient.getConnectionStatus(),
    refetchInterval: 30000,
  });

  const { data: libraries = [], isLoading: isLoadingLibraries } = useQuery({
    queryKey: ["/api/libraries"],
    queryFn: () => embyClient.getLibraries(),
    enabled: !!connectionStatus?.connected,
  });

  // Use selectedLibrary state instead of URL parameter
  const activeLibraryId = selectedLibrary || libraryIdFromUrl;

  // Reset page when changing library
  useEffect(() => {
    setCurrentPage(1);
  }, [activeLibraryId]);

  const { data: libraryData, isLoading: isLoadingItems, error: itemsError } = useQuery({
    queryKey: ["/api/libraries", activeLibraryId, "items", currentPage],
    queryFn: async () => {
      if (!activeLibraryId) return { items: [], pagination: null };
      console.log('Fetching items for library:', activeLibraryId, 'page:', currentPage);
      const data = await embyClient.getLibraryItems(activeLibraryId, 100, currentPage);
      console.log('Library items received:', data.items.length, 'pagination:', data.pagination);
      setPaginationInfo(data.pagination);
      return data;
    },
    enabled: !!connectionStatus?.connected && !!activeLibraryId,
    retry: 2,
  });

  const libraryItems = libraryData?.items || [];

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", debouncedSearch],
    queryFn: () => embyClient.searchMedia(debouncedSearch, 1000),
    enabled: !!connectionStatus?.connected && debouncedSearch.length > 2 && !activeLibraryId,
  });

  const handleMediaClick = async (item: MediaItem) => {
    console.log('Media clicked:', item.name, 'Type:', item.type);
    
    // Check if this is M3U content (Live TV, Channel, or contains M3U indicators)
    const isM3UContent = item.type === 'Channel' || 
                        item.type === 'LiveTv' || 
                        item.name?.toLowerCase().includes('m3u') ||
                        item.name?.toLowerCase().includes('iptv') ||
                        item.name?.toLowerCase().includes('live');
    
    if (isM3UContent) {
      console.log('🎥 M3U content detected:', item.name, 'Opening M3U player');
      setSelectedM3UItem({
        id: item.embyId,
        title: item.name,
        type: item.type
      });
      setIsM3UPlayerOpen(true);
      return;
    }
    
    if (item.type === 'Series') {
      console.log('Opening series details for:', item.name, 'ID:', item.embyId);
      setSelectedSeriesId(item.embyId);
      setIsSeriesDetailsOpen(true);
    } else if (item.type === 'Episode') {
      console.log('Episode clicked, finding parent series for:', item.name);
      try {
        // Get item details to find the series ID
        const response = await fetch(`/api/items/${item.embyId}`);
        if (response.ok) {
          const itemDetails = await response.json();
          const seriesId = itemDetails.seriesId || itemDetails.parentId;
          
          if (seriesId) {
            console.log('Found parent series ID:', seriesId);
            setSelectedSeriesId(seriesId);
            setIsSeriesDetailsOpen(true);
          } else {
            console.log('No parent series found, showing episode details');
            setSelectedMedia(item);
            setIsDetailsOpen(true);
          }
        } else {
          console.log('Failed to get item details, showing episode details');
          setSelectedMedia(item);
          setIsDetailsOpen(true);
        }
      } catch (error) {
        console.error('Error finding parent series:', error);
        setSelectedMedia(item);
        setIsDetailsOpen(true);
      }
    } else {
      console.log('Opening media details for:', item.name);
      setSelectedMedia(item);
      setIsDetailsOpen(true);
    }
  };

  const handlePlayMedia = (item: MediaItem, options: any) => {
    setSelectedMedia(item);
    setIsDetailsOpen(false);
    setIsPlayerOpen(true);
  };

  // Debug logging
  useEffect(() => {
    console.log('Current location:', location);
    console.log('Library ID from URL:', libraryIdFromUrl);
    console.log('Connection status:', connectionStatus);
    console.log('Libraries loaded:', libraries.length);
  }, [location, libraryIdFromUrl, connectionStatus, libraries]);

  const handleDetailsClose = () => {
    setIsDetailsOpen(false);
    setSelectedMedia(null);
  };

  const handleSeriesDetailsClose = () => {
    setIsSeriesDetailsOpen(false);
    setSelectedSeriesId(null);
  };

  const handleM3UPlayerClose = () => {
    setIsM3UPlayerOpen(false);
    setSelectedM3UItem(null);
  };

  const handlePlayEpisode = (episodeId: string) => {
    // Create a MediaItem object for the episode
    const episodeItem: MediaItem = {
      embyId: episodeId,
      name: "Episodio",
      type: "Episode",
      overview: "",
      playCount: 0,
      resumePosition: 0
    };
    setSelectedMedia(episodeItem);
    setIsSeriesDetailsOpen(false);
    setIsPlayerOpen(true);
  };

  const handlePlayerClose = () => {
    setIsPlayerOpen(false);
    setSelectedMedia(null);
  };

  const handleLibrarySwipeLeft = () => {
    // Navigate to next library
    const currentIndex = libraries.findIndex(lib => lib.embyId === selectedLibrary);
    const nextIndex = (currentIndex + 1) % libraries.length;
    if (nextIndex !== currentIndex && libraries[nextIndex]) {
      setSelectedLibrary(libraries[nextIndex].embyId);
      toast({
        title: `Cambiando a ${libraries[nextIndex].name}`,
        duration: 1500,
      });
    }
  };

  const handleLibrarySwipeRight = () => {
    // Navigate to previous library or go back
    if (selectedLibrary) {
      const currentIndex = libraries.findIndex(lib => lib.embyId === selectedLibrary);
      if (currentIndex > 0) {
        setSelectedLibrary(libraries[currentIndex - 1].embyId);
        toast({
          title: `Cambiando a ${libraries[currentIndex - 1].name}`,
          duration: 1500,
        });
      } else {
        // Go back to library overview
        setSelectedLibrary(null);
        toast({
          title: "Volviendo a bibliotecas",
          duration: 1500,
        });
      }
    } else {
      // Go to home
      setLocation('/');
    }
  };

  const handleLibrarySwipeUp = () => {
    // Focus search
    const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      toast({
        title: "Búsqueda activada",
        description: "Escribe para buscar contenido",
        duration: 2000,
      });
    }
  };

  const handleLibrarySwipeDown = () => {
    // Refresh library data
    window.location.reload();
    toast({
      title: "Actualizando biblioteca",
      description: "Recargando contenido...",
      duration: 2000,
    });
  };

  // Set up gesture controls for library page - disabled to allow card clicks
  // useGestures is temporarily disabled to fix click issues
  // TODO: Re-enable with proper event delegation

  const handleLibraryClick = (library: Library) => {
    console.log('Navigating to library:', library.name, 'ID:', library.embyId);
    setSelectedLibrary(library.embyId);
    toast({
      title: `Abriendo ${library.name}`,
      description: `Cargando contenido de la biblioteca...`,
      duration: 2000,
    });
  };

  const getLibraryIcon = (libraryName: string) => {
    const name = libraryName.toLowerCase();
    if (name.includes('película') || name.includes('movie') || name.includes('film')) {
      return <Film className="w-6 h-6" />;
    } else if (name.includes('serie') || name.includes('tv') || name.includes('show')) {
      return <Tv className="w-6 h-6" />;
    } else if (name.includes('música') || name.includes('music')) {
      return <Music className="w-6 h-6" />;
    } else if (name.includes('libro') || name.includes('book')) {
      return <Book className="w-6 h-6" />;
    } else {
      return <LibraryIcon className="w-6 h-6" />;
    }
  };

  const getLibraryGradient = (libraryName: string) => {
    const name = libraryName.toLowerCase();
    if (name.includes('película') || name.includes('movie') || name.includes('film')) {
      if (name.includes('4k') || name.includes('uhd')) {
        return 'bg-gradient-to-br from-red-800 via-red-700 to-red-900';
      }
      return 'bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900';
    } else if (name.includes('serie') || name.includes('tv') || name.includes('show')) {
      if (name.includes('anime')) {
        return 'bg-gradient-to-br from-orange-800 via-orange-700 to-orange-900';
      }
      return 'bg-gradient-to-br from-purple-800 via-purple-700 to-purple-900';
    } else if (name.includes('música') || name.includes('music')) {
      return 'bg-gradient-to-br from-green-800 via-green-700 to-green-900';
    } else if (name.includes('libro') || name.includes('book')) {
      return 'bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900';
    } else if (name.includes('documental')) {
      return 'bg-gradient-to-br from-teal-800 via-teal-700 to-teal-900';
    } else {
      return 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900';
    }
  };

  // Welcome animation effects
  const triggerLibraryAnimation = (libraryId: string) => {
    setAnimatingLibraries(prev => new Set([...prev, libraryId]));
    setTimeout(() => {
      setAnimatingLibraries(prev => {
        const newSet = new Set(prev);
        newSet.delete(libraryId);
        return newSet;
      });
    }, 1000);
  };

  const getLibraryWelcomeMessage = (libraryName: string) => {
    const name = libraryName.toLowerCase();
    if (name.includes('película') || name.includes('movie')) {
      if (name.includes('4k')) return "¡Experiencia cinematográfica en 4K!";
      return "¡Disfruta del mejor cine!";
    } else if (name.includes('serie') || name.includes('tv')) {
      if (name.includes('4k')) return "¡Series en calidad Ultra HD!";
      return "¡Tus series favoritas te esperan!";
    } else if (name.includes('anime') || name.includes('animación')) {
      return "¡Aventuras animadas increíbles!";
    } else if (name.includes('documental')) {
      return "¡Descubre nuevos mundos!";
    } else if (name.includes('deporte')) {
      return "¡La emoción del deporte!";
    } else if (name.includes('música')) {
      return "¡Melodías para el alma!";
    }
    return "¡Explora contenido increíble!";
  };

  const getLibraryAnimationIcon = (libraryName: string) => {
    const name = libraryName.toLowerCase();
    if (name.includes('4k') || name.includes('uhd')) {
      return <Zap className="w-5 h-5 text-yellow-400" />;
    } else if (name.includes('serie') || name.includes('tv')) {
      return <Star className="w-5 h-5 text-purple-400" />;
    } else if (name.includes('anime') || name.includes('animación')) {
      return <Sparkles className="w-5 h-5 text-orange-400" />;
    }
    return <Star className="w-5 h-5 text-blue-400" />;
  };

  // Trigger entrance animations when libraries load
  useEffect(() => {
    if (libraries && libraries.length > 0 && !hasAnimated) {
      libraries.forEach((library, index) => {
        setTimeout(() => {
          triggerLibraryAnimation(library.embyId);
        }, index * 150); // Staggered animation
      });
      setHasAnimated(true);
    }
  }, [libraries, hasAnimated]);

  // Loading state
  if (isLoadingConnection) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Conectando al servidor...</p>
          </div>
        </main>
      </div>
    );
  }

  // Not connected state
  if (!connectionStatus?.connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <LibraryIcon className="w-24 h-24 text-gray-600 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-4">Biblioteca No Disponible</h2>
            <p className="text-gray-400">
              Conecta a tu servidor Emby para acceder a tu biblioteca de medios.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div ref={libraryPageRef} className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8 pb-24 safe-area-inset-bottom">
        {/* Search Bar */}
        <div className="mb-6 md:mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Buscar en tu biblioteca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 h-12 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 rounded-xl text-base"
            />
          </div>
        </div>

        {/* Show search results if searching */}
        {debouncedSearch.length > 2 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Resultados de Búsqueda</h2>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {searchResults.length} resultados para "{debouncedSearch}"
              </Badge>
            </div>
            
            {isSearching ? (
              <MediaGridSkeleton count={12} />
            ) : (
              <MediaGrid
                items={searchResults}
                onItemClick={handleMediaClick}
                title=""
              />
            )}
          </>
        )}

        {/* Show library content if no search or specific library selected */}
        {debouncedSearch.length <= 2 && (
          <>
            {activeLibraryId ? (
              // Viewing specific library
              <>
                <div className="mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedLibrary(null)}
                    className="text-blue-400 hover:text-blue-300 mb-4"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a Bibliotecas
                  </Button>
                  
                  {libraries.find(lib => lib.embyId === activeLibraryId) && (
                    <h1 className="text-3xl font-bold">
                      {libraries.find(lib => lib.embyId === activeLibraryId)?.name}
                    </h1>
                  )}
                </div>

                {/* Content Filters */}
                <div className="mb-6">
                  <ContentFilters
                    items={libraryItems}
                    onFilteredItemsChange={setFilteredItems}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                  />
                </div>

                {isLoadingItems ? (
                  <MediaGridSkeleton count={24} />
                ) : itemsError ? (
                  <div className="text-center py-8">
                    <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 max-w-md mx-auto">
                      <p className="text-red-400 mb-4">Error al cargar el contenido de la biblioteca</p>
                      <Button 
                        onClick={() => window.location.reload()} 
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        Reintentar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <MediaGrid
                      items={filteredItems.length > 0 ? filteredItems : libraryItems}
                      onItemClick={handleMediaClick}
                      title={paginationInfo ? `${paginationInfo.totalItems > paginationInfo.limit ? `+${paginationInfo.limit}` : paginationInfo.totalItems} elementos (página ${paginationInfo.page})` : `${filteredItems.length > 0 ? filteredItems.length : libraryItems.length} elementos`}
                    />
                    
                    {paginationInfo && (
                      <Pagination
                        currentPage={currentPage}
                        totalItems={paginationInfo.totalItems || 0}
                        itemsPerPage={paginationInfo.limit || 100}
                        hasNextPage={paginationInfo.hasNextPage}
                        hasPreviousPage={paginationInfo.hasPreviousPage}
                        onPageChange={setCurrentPage}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              // Library overview
              <>
                {/* Continue Watching Section */}
                <div className="mb-8">
                  <ContinueWatchingSection onItemClick={handleMediaClick} />
                </div>

                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Tus Bibliotecas</h1>
                  <p className="text-gray-400">Explora tu colección de medios</p>
                  
                  {/* Server Connection Status */}
                  {connectionStatus?.connected && (
                    <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <div>
                          <p className="text-green-400 font-medium">
                            Conectado al servidor
                          </p>
                          <p className="text-green-300 text-sm">
                            Estado: Conexión activa
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isLoadingLibraries ? (
                  <LibraryGridSkeleton count={6} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {libraries.map((library) => (
                      <Card
                        key={library.embyId}
                        className={`relative overflow-hidden border-gray-700 hover:scale-105 transition-all duration-500 cursor-pointer group transform ${
                          animatingLibraries.has(library.embyId) 
                            ? 'animate-pulse scale-110 shadow-2xl ring-2 ring-blue-500/50 border-blue-500/50' 
                            : 'animate-in slide-in-from-bottom-8 duration-700'
                        }`}
                        style={{ 
                          animationDelay: `${libraries.indexOf(library) * 150}ms`,
                          animationFillMode: 'both'
                        }}
                        onClick={() => handleLibraryClick(library)}
                      >
                        {/* Background Image */}
                        {library.backgroundImageUrl && (
                          <div 
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${library.backgroundImageUrl})` }}
                          >
                            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors duration-300" />
                          </div>
                        )}
                        
                        {/* Enhanced fallback gradient if no image */}
                        {!library.backgroundImageUrl && (
                          <div className={`absolute inset-0 ${getLibraryGradient(library.name)}`} />
                        )}
                        
                        <div className="relative p-6 h-40 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 bg-black/40 rounded-lg backdrop-blur-sm transition-all duration-300 ${
                              animatingLibraries.has(library.embyId) ? 'bg-blue-500/60 animate-pulse' : ''
                            }`}>
                              {getLibraryIcon(library.name)}
                            </div>
                            <div className="flex items-center space-x-2">
                              {animatingLibraries.has(library.embyId) && (
                                <div className="animate-bounce">
                                  {getLibraryAnimationIcon(library.name)}
                                </div>
                              )}
                              <Badge variant="secondary" className="bg-black/40 text-white backdrop-blur-sm">
                                Biblioteca
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-2 drop-shadow-lg">
                              {library.name}
                            </h3>
                            <p className={`text-sm drop-shadow-md transition-all duration-500 ${
                              animatingLibraries.has(library.embyId) 
                                ? 'text-yellow-200 font-medium' 
                                : 'text-gray-200'
                            }`}>
                              {animatingLibraries.has(library.embyId) 
                                ? getLibraryWelcomeMessage(library.name)
                                : (library.overview || 'Colección de medios')
                              }
                            </p>
                          </div>
                        </div>

                        {/* Welcome Animation Overlay */}
                        {animatingLibraries.has(library.embyId) && (
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 welcome-glow opacity-75">
                            <div className="absolute top-2 right-2">
                              <div className="bg-black/80 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20 welcome-float">
                                <span className="text-white font-medium text-xs flex items-center space-x-1">
                                  <div className="welcome-sparkle">
                                    <Sparkles className="w-3 h-3" />
                                  </div>
                                  <span>¡Bienvenido!</span>
                                </span>
                              </div>
                            </div>
                            
                            {/* Center welcome message */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/30 welcome-float">
                                <div className="flex items-center space-x-3">
                                  <div className="welcome-sparkle">
                                    {getLibraryAnimationIcon(library.name)}
                                  </div>
                                  <div className="text-center">
                                    <p className="text-white font-bold text-sm">
                                      {getLibraryWelcomeMessage(library.name)}
                                    </p>
                                    <p className="text-white/80 text-xs mt-1">
                                      Toca para explorar
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}


      </main>

      {/* Media Details Modal */}
      <MediaDetails
        item={selectedMedia}
        isOpen={isDetailsOpen}
        onClose={handleDetailsClose}
        onPlay={handlePlayMedia}
      />

      {/* Series Details Modal */}
      <SeriesDetails
        seriesId={selectedSeriesId}
        isOpen={isSeriesDetailsOpen}
        onClose={handleSeriesDetailsClose}
        onPlayEpisode={handlePlayEpisode}
      />

      {/* Media Player */}
      <DirectStreamPlayer
        item={selectedMedia}
        isOpen={isPlayerOpen}
        onClose={handlePlayerClose}
      />

      {/* M3U Server Player */}
      {selectedM3UItem && (
        <M3UServerPlayer
          isOpen={isM3UPlayerOpen}
          onClose={handleM3UPlayerClose}
          itemId={selectedM3UItem.id}
          title={selectedM3UItem.title}
          itemType={selectedM3UItem.type}
        />
      )}
    </div>
  );
}