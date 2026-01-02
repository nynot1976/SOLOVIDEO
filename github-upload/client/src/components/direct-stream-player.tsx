import { useState, useEffect } from "react";
import { X, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DirectStreamPlayerProps {
  item: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DirectStreamPlayer({ item, isOpen, onClose }: DirectStreamPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDirectPlay = async () => {
    if (!item) return;
    
    setIsLoading(true);
    
    try {
      // Get stream URL directly
      console.log('Getting direct stream for:', item.embyId);
      const response = await fetch(`/api/media/${item.embyId}/stream`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Direct stream URL received:', data.streamUrl);
        
        // Open in new tab immediately
        window.open(data.streamUrl, '_blank', 'noopener,noreferrer');
        
        toast({
          title: "Reproduciendo",
          description: `${item.name} se está abriendo en una nueva pestaña`,
          duration: 3000,
        });
        
        // Close player after opening
        setTimeout(() => {
          onClose();
        }, 1000);
        
      } else {
        console.error('Failed to get stream URL:', response.status);
        toast({
          title: "Error",
          description: "No se pudo obtener el enlace de reproducción",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error getting stream:', error);
      toast({
        title: "Error",
        description: "Error de conexión al servidor",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmbedPlay = () => {
    if (!item) return;
    
    // Create direct embed URL
    const embedUrl = `/api/media/${item.embyId}/transcode`;
    window.open(embedUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: "Reproduciendo",
      description: `${item.name} se está abriendo con reproductor integrado`,
      duration: 3000,
    });
    
    onClose();
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-center">
          {item.posterUrl && (
            <img 
              src={item.posterUrl} 
              alt={item.name}
              className="w-24 h-36 object-cover rounded-lg mx-auto mb-4"
            />
          )}
          
          <h2 className="text-xl font-semibold text-white mb-2">{item.name}</h2>
          <p className="text-gray-400 mb-6 text-sm">
            {item.year && `${item.year} • `}
            {item.type === 'Movie' ? 'Película' : 'Serie'}
          </p>

          <div className="space-y-3">
            <Button 
              onClick={handleDirectPlay}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cargando...
                </div>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  ▶ Reproducir Ahora
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleEmbedPlay}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Reproductor Integrado
            </Button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Se abrirá en una nueva pestaña para mejor compatibilidad
          </p>
        </div>
      </div>
    </div>
  );
}