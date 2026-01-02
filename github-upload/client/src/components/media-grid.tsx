import { Card } from "@/components/ui/card";
import { MediaItem } from "@/lib/emby-client";
import { Play, Tv } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface MediaGridProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  title: string;
}

function formatDuration(runtime?: number): string {
  if (!runtime) return "";
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function MediaGrid({ items, onItemClick, title }: MediaGridProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const columns = 6;

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number, item: MediaItem) => {
    let newIndex = index;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(0, index - columns);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(items.length - 1, index + columns);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = Math.max(0, index - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = Math.min(items.length - 1, index + 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onItemClick(item);
        return;
      default:
        return;
    }

    if (newIndex !== index) {
      setFocusedIndex(newIndex);
      const element = document.querySelector(`[data-tv-index="${newIndex}"]`) as HTMLElement;
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [items.length, columns, onItemClick]);

  if (!items || items.length === 0) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-6">{title}</h2>
        <div className="text-center py-8">
          <p className="text-gray-400">No hay contenido disponible</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold text-white mb-6">{title}</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {items.map((item, index) => (
          <div 
            key={item.embyId}
            tabIndex={0}
            data-tv-index={index}
            data-tv-focusable="true"
            className="media-card group cursor-pointer bg-transparent border-none hover:bg-gray-800/20 transition-colors rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500 focus:scale-105"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onItemClick(item);
            }}
            onKeyDown={(e) => handleKeyDown(e, index, item)}
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          >
            <div className="relative overflow-hidden rounded-xl bg-gray-800">
              {item.posterUrl ? (
                <img 
                  src={item.posterUrl}
                  alt={item.name}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-64 bg-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center mb-2 mx-auto">
                      {item.type === 'Series' || item.type === 'Episode' ? (
                        <Tv className="w-8 h-8 text-gray-400" />
                      ) : (
                        <Play className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">No Image</p>
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <Play className="text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-12 h-12" />
              </div>
              
              {(item.type === 'Series' || item.type === 'Episode') && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  TV
                </div>
              )}
            </div>
            
            <div className="mt-3">
              <h3 className="font-medium text-sm text-white truncate" title={item.name}>
                {item.name}
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                {formatDuration(item.runtime)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface ContinueWatchingProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
}

export function ContinueWatching({ items, onItemClick }: ContinueWatchingProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold text-white mb-6">Continuar viendo</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {items.map((item) => (
          <Card 
            key={item.embyId}
            className="group cursor-pointer bg-transparent border-none hover:bg-gray-800/20 transition-colors"
            onClick={() => onItemClick(item)}
          >
            <div className="relative overflow-hidden rounded-xl bg-gray-800">
              {item.posterUrl ? (
                <img 
                  src={item.posterUrl}
                  alt={item.name}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-64 bg-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center mb-2 mx-auto">
                      <Play className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-xs">No Image</p>
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <Play className="text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-12 h-12" />
              </div>
              
              {item.resumePosition > 0 && item.runtime && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                  <div 
                    className="h-full bg-blue-600" 
                    style={{ width: `${(item.resumePosition / ((item.runtime || 0) * 60)) * 100}%` }}
                  />
                </div>
              )}
            </div>
            
            <div className="mt-3">
              <h3 className="font-medium text-sm text-white truncate" title={item.name}>
                {item.name}
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                {formatDuration(item.runtime)}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}