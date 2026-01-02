import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { SimplePlayer } from "@/components/simple-player";
import { MediaDetails } from "@/components/media-details";
import { ActiveSessions } from "@/components/active-sessions";
import { DevicesModal } from "@/components/devices-modal";
import { embyClient, MediaItem } from "@/lib/emby-client";
import { Button } from "@/components/ui/button";
import { Film, Tv, LibraryIcon, Play, Sparkles, Clock, Monitor } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);

  const { data: connectionStatus } = useQuery({
    queryKey: ["/api/connection/status"],
    queryFn: () => embyClient.getConnectionStatus(),
    refetchInterval: 30000,
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

  const handleDetailsClose = () => {
    setIsDetailsOpen(false);
    setSelectedMedia(null);
  };

  const handlePlayerClose = () => {
    setIsPlayerOpen(false);
    setSelectedMedia(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900/20 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 py-4 md:px-6 md:py-8 pb-24 safe-area-inset-bottom">
        <div className="space-y-4 md:space-y-8">
          <section className="bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-pink-900/40 rounded-xl p-4 md:p-6 border border-blue-500/20">
            <div className="text-center space-y-3 md:space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-xl md:text-3xl font-bold text-white">
                Bienvenido a SoloVideoClub
              </h1>
              <p className="text-gray-300 text-sm md:text-base">
                Tu centro de entretenimiento personalizado
              </p>
              <div className="flex items-center justify-center space-x-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-300">
                  {connectionStatus?.connected ? 'Conectado y listo' : 'Conectando...'}
                </span>
              </div>
            </div>
          </section>

          {/* Active Sessions Section */}
          <ActiveSessions />

          <section className="space-y-4">
            <h2 className="text-lg md:text-xl font-semibold text-white">Acceso Rápido</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Link href="/library" className="bg-blue-900/30 hover:bg-blue-900/50 active:bg-blue-900/60 transition-colors rounded-xl p-5 md:p-4 text-center border border-blue-500/20 touch-manipulation">
                <Film className="w-8 h-8 md:w-6 md:h-6 mx-auto mb-3 md:mb-2 text-blue-400" />
                <span className="text-sm md:text-sm text-white font-medium">Películas</span>
              </Link>
              <Link href="/library" className="bg-purple-900/30 hover:bg-purple-900/50 active:bg-purple-900/60 transition-colors rounded-xl p-5 md:p-4 text-center border border-purple-500/20 touch-manipulation">
                <Tv className="w-8 h-8 md:w-6 md:h-6 mx-auto mb-3 md:mb-2 text-purple-400" />
                <span className="text-sm md:text-sm text-white font-medium">Series</span>
              </Link>
              <Link href="/library" className="bg-green-900/30 hover:bg-green-900/50 active:bg-green-900/60 transition-colors rounded-xl p-5 md:p-4 text-center border border-green-500/20 touch-manipulation">
                <LibraryIcon className="w-8 h-8 md:w-6 md:h-6 mx-auto mb-3 md:mb-2 text-green-400" />
                <span className="text-sm md:text-sm text-white font-medium">Biblioteca</span>
              </Link>
              <button 
                onClick={() => setIsDevicesModalOpen(true)}
                className="bg-yellow-900/30 hover:bg-yellow-900/50 active:bg-yellow-900/60 transition-colors rounded-xl p-5 md:p-4 text-center border border-yellow-500/20 touch-manipulation"
              >
                <Monitor className="w-8 h-8 md:w-6 md:h-6 mx-auto mb-3 md:mb-2 text-yellow-400" />
                <span className="text-sm md:text-sm text-white font-medium">Dispositivos</span>
              </button>
            </div>
          </section>

          <section className="text-center space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-8">
              <Play className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Explora tu contenido
              </h3>
              <p className="text-gray-400 mb-4">
                Accede a tu biblioteca completa de películas y series
              </p>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/library">
                  <LibraryIcon className="w-4 h-4 mr-2" />
                  Ir a Biblioteca
                </Link>
              </Button>
            </div>
          </section>

          {connectionStatus && (
            <section className="bg-gray-800/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-white">Estado del servidor</h4>
                  <p className="text-xs text-gray-400">
                    {connectionStatus.connected ? 
                      `Conectado a ${connectionStatus.serverName}` : 
                      'Verificando conexión...'
                    }
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              </div>
            </section>
          )}
        </div>
      </main>

      <MediaDetails
        item={selectedMedia}
        isOpen={isDetailsOpen}
        onClose={handleDetailsClose}
        onPlay={handlePlayMedia}
      />

      <SimplePlayer
        item={selectedMedia}
        isOpen={isPlayerOpen}
        onClose={handlePlayerClose}
      />

      <DevicesModal
        isOpen={isDevicesModalOpen}
        onClose={() => setIsDevicesModalOpen(false)}
      />
    </div>
  );
}