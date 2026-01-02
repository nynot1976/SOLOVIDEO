import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRouter } from "wouter";
import { Header } from "@/components/header";
import { MediaGrid } from "@/components/media-grid";
import { AndroidVideoPlayer } from "@/components/android-video-player";
import { MediaDetails } from "@/components/media-details";
import { useGestures } from "@/hooks/use-gestures";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { embyClient, MediaItem, Library } from "@/lib/emby-client";
import { Search, Library as LibraryIcon, Film, Tv, Music, Book, ArrowLeft } from "lucide-react";

export default function LibraryPage() {
  const [location, setLocation] = useLocation();
  const router = useRouter();
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
    enabled: !isLoadingConnection && connectionStatus?.connected === true,
  });

  // Use selectedLibrary state instead of URL parameter
  const activeLibraryId = selectedLibrary || libraryIdFromUrl;

  const { data: libraryItems = [], isLoading: isLoadingItems, error: itemsError } = useQuery({
    queryKey: ["/api/libraries", activeLibraryId, "items"],
    queryFn: async () => {
      console.log('Fetching items for library:', activeLibraryId);
      const items = await embyClient.getLibraryItems(activeLibraryId!, 100, 0);
      console.log('Library items received:', items.length);
      return items;
    },
    enabled: !isLoadingConnection && connectionStatus?.connected === true && !!activeLibraryId,
    retry: 2,
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", debouncedSearch],
    queryFn: () => embyClient.searchMedia(debouncedSearch, 50),
    enabled: !isLoadingConnection && connectionStatus?.connected === true && debouncedSearch.length > 2,
  });



  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia(item);
    setIsDetailsOpen(true);
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
    if (connectionStatus) {
      console.log('Connection status:', connectionStatus);
    }
    console.log('Libraries loaded:', libraries.length);
  }, [location, libraryIdFromUrl, connectionStatus, libraries]);

  const handlePlayerClose = () => {
    setIsPlayerOpen(false);
    setSelectedMedia(null);
  };

  const handleDetailsClose = () => {
    setIsDetailsOpen(false);
    setSelectedMedia(null);
  };

  // Gesture handlers for library navigation
  const handleLibrarySwipeLeft = () => {
    if (selectedLibrary) {
      // Navigate to next library
      const currentIndex = libraries.findIndex(lib => lib.embyId === selectedLibrary);
      if (currentIndex < libraries.length - 1) {
        const nextLibrary = libraries[currentIndex + 1];
        setSelectedLibrary(nextLibrary.embyId);
        toast({
          title: `Navegando a: ${nextLibrary.name}`,
          duration: 1500,
        });
      }
    } else if (libraries.length > 0) {
      // Select first library
      setSelectedLibrary(libraries[0].embyId);
      toast({
        title: `Abriendo: ${libraries[0].name}`,
        duration: 1500,
      });
    }
  };

  const handleLibrarySwipeRight = () => {
    if (selectedLibrary) {
      // Navigate to previous library or go back
      const currentIndex = libraries.findIndex(lib => lib.embyId === selectedLibrary);
      if (currentIndex > 0) {
        const prevLibrary = libraries[currentIndex - 1];
        setSelectedLibrary(prevLibrary.embyId);
        toast({
          title: `Navegando a: ${prevLibrary.name}`,
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

  // Set up gesture controls for library page
  useGestures(libraryPageRef, {
    onSwipeLeft: handleLibrarySwipeLeft,
    onSwipeRight: handleLibrarySwipeRight, 
    onSwipeUp: handleLibrarySwipeUp,
    onSwipeDown: handleLibrarySwipeDown,
    onDoubleTap: () => {
      // Quick action: toggle between first library and overview
      if (selectedLibrary) {
        setSelectedLibrary(null);
      } else if (libraries.length > 0) {
        setSelectedLibrary(libraries[0].embyId);
      }
    },
  }, {
    swipeThreshold: 80,
    velocityThreshold: 0.5,
    doubleTapDelay: 300,
  });

  const handleLibraryClick = (library: Library) => {
    console.log('Navigating to library:', library.name, 'ID:', library.embyId);
    
    // Use state management instead of URL navigation
    setSelectedLibrary(library.embyId);
    console.log('Selected library set to:', library.embyId);
  };

  const getLibraryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'movies':
        return <Film className="w-6 h-6" />;
      case 'tvshows':
      case 'series':
        return <Tv className="w-6 h-6" />;
      case 'music':
        return <Music className="w-6 h-6" />;
      case 'books':
        return <Book className="w-6 h-6" />;
      default:
        return <LibraryIcon className="w-6 h-6" />;
    }
  };

  if (!connectionStatus?.connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <LibraryIcon className="w-24 h-24 text-gray-600 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-4">Library Not Available</h2>
            <p className="text-gray-400">
              Connect to your Emby server to access your media library.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div ref={libraryPageRef} className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8">


        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar en tu biblioteca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Show search results if searching */}
        {debouncedSearch.length > 2 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Search Results</h2>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                {searchResults.length} results for "{debouncedSearch}"
              </Badge>
            </div>
            
            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Searching...</p>
              </div>
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

                {isLoadingItems ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando contenido de la biblioteca...</p>
                  </div>
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
                ) : libraryItems.length > 0 ? (
                  <MediaGrid
                    items={libraryItems}
                    onItemClick={handleMediaClick}
                    title=""
                  />
                ) : (
                  <div className="text-center py-8">
                    <LibraryIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">Esta biblioteca está vacía</p>
                    <p className="text-gray-500 text-sm">No se encontró contenido en esta biblioteca</p>
                  </div>
                )}
              </>
            ) : (
              // Viewing all libraries
              <>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Media Library</h1>
                  <p className="text-gray-400">Browse your media collections</p>
                </div>

                {isLoadingLibraries ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading libraries...</p>
                  </div>
                ) : libraries.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {libraries.map((library) => (
                      <Card
                        key={library.embyId}
                        className="bg-gray-800 border-gray-700 p-6 cursor-pointer hover:bg-gray-750 transition-colors group"
                        onClick={() => handleLibraryClick(library)}
                      >
                        <div className="text-center">
                          {library.posterUrl ? (
                            <img
                              src={library.posterUrl}
                              alt={library.name}
                              className="w-full h-32 object-cover rounded-lg mb-4"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-700 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-600 transition-colors">
                              {getLibraryIcon(library.type)}
                            </div>
                          )}
                          
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {library.name}
                          </h3>
                          
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                            {library.type}
                          </Badge>
                          
                          {library.overview && (
                            <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                              {library.overview}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <LibraryIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Libraries Found</h3>
                    <p className="text-gray-400">
                      Your Emby server doesn't have any configured libraries yet.
                    </p>
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

      {/* Mobile Gesture Guide */}
      <div className="fixed bottom-20 left-4 right-4 md:hidden pointer-events-none z-30">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 text-center">
            <span>← → Cambiar biblioteca</span>
            <span>↑ Buscar contenido</span>
            <span>👆👆 Alternar vista</span>
            <span>↓ Actualizar</span>
          </div>
        </div>
      </div>

      {/* Media Details Modal */}
      <MediaDetails
        item={selectedMedia}
        isOpen={isDetailsOpen}
        onClose={handleDetailsClose}
        onPlay={handlePlayMedia}
      />

      {/* Media Player */}
      <AndroidVideoPlayer
        item={selectedMedia}
        isOpen={isPlayerOpen}
        onClose={handlePlayerClose}
      />
    </div>
  );
}