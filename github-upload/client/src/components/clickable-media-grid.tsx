import { Play, Tv } from "lucide-react";

interface ClickableMediaGridProps {
  items: any[];
  onItemClick: (item: any) => void;
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

export function MediaGrid({ items, onItemClick, title }: ClickableMediaGridProps) {
  if (!items.length) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-6">{title}</h2>
        <div className="text-center py-12">
          <p className="text-gray-400">No hay contenido disponible</p>
        </div>
      </section>
    );
  }

  const handleClick = (item: any) => {
    console.log('Card clicked:', item.name);
    console.log('Media clicked:', item.name, 'Type:', item.type);
    console.log('Opening media details for:', item.name);
    onItemClick(item);
  };

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold text-white mb-6">{title}</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {items.map((item) => (
          <div 
            key={item.embyId}
            className="group cursor-pointer hover:bg-gray-800/20 transition-colors rounded-xl p-2"
            onClick={() => handleClick(item)}
            onTouchEnd={() => handleClick(item)}
          >
            <div className="relative overflow-hidden rounded-xl bg-gray-800">
              {item.posterUrl ? (
                <img 
                  src={item.posterUrl}
                  alt={item.name}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  onLoad={() => {
                    console.log(`✓ Image loaded: ${item.name}`);
                  }}
                  onError={(e) => {
                    console.log(`✗ Image failed: ${item.name} - ${item.posterUrl}`);
                    // Try alternative image URLs if available
                    const fallbackUrl = item.posterUrl?.replace('/Primary?', '/Backdrop?') || 
                                       item.posterUrl?.replace('/Primary?', '/Thumb?');
                    if (fallbackUrl && fallbackUrl !== item.posterUrl) {
                      e.currentTarget.src = fallbackUrl;
                      return;
                    }
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.fallback-container');
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`fallback-container w-full h-64 bg-gray-700 flex items-center justify-center ${item.posterUrl ? 'hidden' : ''}`}>
                <div className="text-center p-4">
                  <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center mb-2 mx-auto">
                    {item.type === 'Series' || item.type === 'Episode' ? (
                      <Tv className="w-8 h-8 text-gray-400" />
                    ) : (
                      <Play className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <p className="text-gray-400 text-xs text-center line-clamp-2">{item.name}</p>
                </div>
              </div>
              
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
  items: any[];
  onItemClick: (item: any) => void;
}

export function ContinueWatching({ items, onItemClick }: ContinueWatchingProps) {
  if (!items.length) return null;

  const handleClick = (item: any) => {
    console.log('Continue watching card clicked:', item.name);
    console.log('Media clicked:', item.name, 'Type:', item.type);
    console.log('Opening media details for:', item.name);
    onItemClick(item);
  };

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold text-white mb-6">Continuar viendo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <div 
            key={item.embyId}
            className="group cursor-pointer hover:bg-gray-800/20 transition-colors rounded-xl p-2"
            onClick={() => handleClick(item)}
            onTouchEnd={() => handleClick(item)}
          >
            <div className="relative overflow-hidden rounded-xl bg-gray-800">
              {item.posterUrl ? (
                <img 
                  src={item.posterUrl}
                  alt={item.name}
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-40 bg-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center mb-2 mx-auto">
                      {item.type === 'Series' || item.type === 'Episode' ? (
                        <Tv className="w-6 h-6 text-gray-400" />
                      ) : (
                        <Play className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">No Image</p>
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <Play className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-8 h-8" />
              </div>
              
              {item.playedPercentage && item.playedPercentage > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75">
                  <div 
                    className="h-1 bg-blue-600" 
                    style={{ width: `${Math.min(item.playedPercentage, 100)}%` }}
                  />
                </div>
              )}
              
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
              <div className="flex items-center justify-between mt-1">
                <p className="text-gray-400 text-xs">
                  {formatDuration(item.runtime)}
                </p>
                {item.playedPercentage && item.playedPercentage > 0 && (
                  <p className="text-blue-400 text-xs">
                    {Math.round(item.playedPercentage)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}