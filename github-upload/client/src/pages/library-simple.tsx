import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { embyClient } from "@/lib/emby-client";
import { MediaGrid } from "@/components/clickable-media-grid";
import { MediaGridSkeleton } from "@/components/loading-skeletons";
import { SimpleVideoModal } from "@/components/simple-video-modal";
import { StreamingVideoPlayer } from "@/components/streaming-video-player";
import { MediaDetails } from "@/components/media-details";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { useLocation as useWouterLocation } from "wouter";
import { Input } from "@/components/ui/input";

export function LibrarySimple() {
  const [location] = useLocation();
  const [, navigate] = useWouterLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [playingItem, setPlayingItem] = useState<any>(null); // NUEVO
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  
  // Extract library ID from URL
  const libraryId = location.split('/').pop();

  // Get connection status
  const { data: connectionStatus } = useQuery({
    queryKey: ["/api/connection/status"],
    queryFn: () => embyClient.getConnectionStatus(),
  });

  // Get libraries list
  const { data: libraries = [] } = useQuery({
    queryKey: ["/api/libraries"],
    queryFn: () => embyClient.getLibraries(),
    enabled: !!connectionStatus?.connected,
  });

  // Get library items
  const { data: libraryItems = [], isLoading } = useQuery({
    queryKey: ["/api/libraries", libraryId, "items"],
    queryFn: async () => {
      if (!libraryId) return [];
      const items = await embyClient.getLibraryItems(libraryId, 10000, 0);
      return items;
    },
    enabled: !!libraryId && !!connectionStatus?.connected,
  });

  // Get current library info
  const currentLibrary = libraries.find(lib => lib.embyId === libraryId);

  // Filter items based on search
  const filteredItems = searchTerm
    ? libraryItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : libraryItems;

  const handleItemClick = (item: any) => {
    // Check if item is playable
    if (item.type === 'Studio' || item.type === 'Person' || item.type === 'Genre') {
      console.log('Non-playable item clicked:', item.type, item.name);
      return; // Don't open details for non-playable items
    }
    
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  const handlePlay = async (item: any, options: any) => {
    try {
      console.log('Getting direct stream for:', item.embyId);
      const response = await fetch(`/api/media/${item.embyId}/stream`);
      const data = await response.json();
      
      if (data.streamUrl) {
        console.log('Direct stream URL received:', data.streamUrl);
        setStreamUrl(data.streamUrl);
        setPlayingItem(item);
        setIsDetailsOpen(false);
        setIsPlayerOpen(true);
      } else {
        console.error('No stream URL received');
      }
    } catch (error) {
      console.error('Error getting stream URL:', error);
    }
  };

  if (!connectionStatus?.connected) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Sin conexión</h2>
        <p className="text-gray-400">No hay conexión activa al servidor Emby</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Atrás
          </Button>
          
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
              {currentLibrary?.name || 'Biblioteca'}
            </h1>
            <p className="text-sm text-gray-400">
              {filteredItems.length} elementos
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar contenido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <MediaGridSkeleton count={12} />
        ) : (
          <MediaGrid
            items={filteredItems}
            onItemClick={handleItemClick}
            title=""
          />
        )}
      </div>

      {/* Media Details Modal */}
      <MediaDetails
        item={selectedItem}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedItem(null);
        }}
        onPlay={handlePlay}
      />

      {/* Streaming Video Player */}
      {isPlayerOpen && streamUrl && (
        <StreamingVideoPlayer
          streamUrl={streamUrl}
          title={playingItem?.name || "Video"}
          onClose={() => {
            setIsPlayerOpen(false);
            setStreamUrl("");
            setPlayingItem(null);
          }}
        />
      )}
    </div>
  );
}