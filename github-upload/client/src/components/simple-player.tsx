import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ExternalLink } from "lucide-react";
import { MediaItem } from "@/lib/emby-client";
import { useToast } from "@/hooks/use-toast";

interface SimplePlayerProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SimplePlayer({ item, isOpen, onClose }: SimplePlayerProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (item && isOpen && !streamUrl) {
      loadStream();
    }
    if (!isOpen) {
      setStreamUrl(null);
      setHasError(false);
      setIsLoading(false);
    }
  }, [item, isOpen]);

  const loadStream = async () => {
    if (!item) return;
    
    setIsLoading(true);
    setHasError(false);
    
    try {
      console.log('Fetching stream URL for:', item.embyId);
      const response = await fetch(`/api/media/${item.embyId}/stream`);
      console.log('Stream response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Stream data received:', data);
        setStreamUrl(data.streamUrl);
        setIsLoading(false);
        console.log('Stream URL set to:', data.streamUrl);
        toast({
          title: "Video listo",
          description: "Haz clic en 'Reproducir Video' para abrir",
          duration: 3000,
        });
      } else {
        console.error('Stream response error:', response.status, response.statusText);
        setHasError(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading stream:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleExternalPlay = () => {
    if (streamUrl) {
      window.open(streamUrl, '_blank');
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full h-full max-w-6xl mx-auto relative flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white truncate">{item.name}</h2>
            <p className="text-gray-300 text-sm">{item.type} • SoloVideoClub</p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          {isLoading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-6 mx-auto"></div>
              <h3 className="text-white text-xl mb-2">Preparando video...</h3>
              <p className="text-gray-400">Conectando al servidor de medios</p>
            </div>
          )}

          {hasError && (
            <div className="text-center max-w-md">
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-8">
                <h3 className="text-red-400 text-xl mb-4">Error de conexión</h3>
                <p className="text-gray-400 mb-6">
                  No se puede reproducir directamente en el navegador debido a restricciones de seguridad.
                </p>
                <Button 
                  onClick={loadStream}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white w-full mb-3"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {streamUrl && !hasError && !isLoading && (
            <div className="text-center max-w-md">
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-8">
                <h3 className="text-blue-400 text-xl mb-4">¡Listo para reproducir!</h3>
                <p className="text-gray-400 mb-6">
                  El video se abrirá en una nueva pestaña con el reproductor optimizado del servidor.
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={handleExternalPlay}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    ▶ Reproducir Video
                  </Button>
                  <p className="text-xs text-gray-500">
                    Se abrirá en una nueva pestaña para mejor compatibilidad
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}