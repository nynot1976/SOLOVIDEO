import { useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGestures } from '@/hooks/use-gestures';
import { useToast } from '@/hooks/use-toast';

interface GestureNavigationProps {
  children: React.ReactNode;
  enabledGestures?: {
    swipeNavigation?: boolean;
    pullToRefresh?: boolean;
    pinchToZoom?: boolean;
    longPressActions?: boolean;
  };
  onRefresh?: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onOpenMenu?: () => void;
  onOpenSearch?: () => void;
}

export function GestureNavigation({
  children,
  enabledGestures = {
    swipeNavigation: true,
    pullToRefresh: false,
    pinchToZoom: false,
    longPressActions: true
  },
  onRefresh,
  onGoBack,
  onGoForward,
  onOpenMenu,
  onOpenSearch
}: GestureNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Navigation history for gesture-based navigation
  const navigationHistory = useRef<string[]>(['/']);
  const currentIndex = useRef<number>(0);

  // Update navigation history when location changes
  useEffect(() => {
    if (location !== navigationHistory.current[currentIndex.current]) {
      // Remove forward history when navigating to a new page
      navigationHistory.current = navigationHistory.current.slice(0, currentIndex.current + 1);
      navigationHistory.current.push(location);
      currentIndex.current = navigationHistory.current.length - 1;
    }
  }, [location]);

  const handleSwipeLeft = () => {
    if (!enabledGestures.swipeNavigation) return;
    
    // Navigate forward in history or to next section
    if (currentIndex.current < navigationHistory.current.length - 1) {
      currentIndex.current++;
      setLocation(navigationHistory.current[currentIndex.current]);
      toast({
        title: "Navegando adelante",
        description: "Desliza hacia la derecha para retroceder",
        duration: 2000,
      });
    } else if (onGoForward) {
      onGoForward();
    } else {
      // Navigate to next logical section
      if (location === '/') {
        setLocation('/library');
      } else if (location === '/library') {
        setLocation('/');
      }
    }
  };

  const handleSwipeRight = () => {
    if (!enabledGestures.swipeNavigation) return;
    
    // Navigate back in history
    if (currentIndex.current > 0) {
      currentIndex.current--;
      setLocation(navigationHistory.current[currentIndex.current]);
      toast({
        title: "Navegando atrás",
        description: "Desliza hacia la izquierda para avanzar",
        duration: 2000,
      });
    } else if (onGoBack) {
      onGoBack();
    } else {
      // Provide haptic feedback that we can't go back further
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      toast({
        title: "Ya estás en el inicio",
        description: "No puedes retroceder más",
        duration: 2000,
        variant: "destructive"
      });
    }
  };

  const handleSwipeUp = () => {
    if (enabledGestures.pullToRefresh && onRefresh) {
      onRefresh();
      toast({
        title: "Actualizando",
        description: "Recargando contenido...",
        duration: 2000,
      });
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    } else if (onOpenSearch) {
      onOpenSearch();
    }
  };

  const handleSwipeDown = () => {
    if (enabledGestures.pullToRefresh && onRefresh) {
      onRefresh();
      toast({
        title: "Actualizando",
        description: "Recargando contenido...",
        duration: 2000,
      });
    } else if (onOpenMenu) {
      onOpenMenu();
    }
  };

  const handleLongPress = () => {
    if (!enabledGestures.longPressActions) return;
    
    // Context menu or action sheet
    toast({
      title: "Menú de acciones",
      description: "Mantén presionado para más opciones",
      duration: 2000,
    });
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  const handleDoubleTap = () => {
    // Quick action - toggle fullscreen or zoom
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      } else {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {
            // Silently fail if fullscreen is not supported
            console.log('Fullscreen not supported on this device');
          });
        }
      }
    } catch (error) {
      // Fullscreen API not supported, continue without error
      console.log('Fullscreen API not available');
    }
  };

  const handlePinchIn = () => {
    if (!enabledGestures.pinchToZoom) return;
    
    // Zoom out or go back
    if (location !== '/') {
      handleSwipeRight();
    }
  };

  const handlePinchOut = () => {
    if (!enabledGestures.pinchToZoom) return;
    
    // Zoom in or enter focus mode
    toast({
      title: "Modo enfoque",
      description: "Pellizca hacia adentro para salir",
      duration: 2000,
    });
  };

  useGestures(containerRef, {
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    onLongPress: handleLongPress,
    onDoubleTap: handleDoubleTap,
    onPinchIn: handlePinchIn,
    onPinchOut: handlePinchOut,
  }, {
    swipeThreshold: 60,
    velocityThreshold: 0.4,
    longPressDelay: 600,
    doubleTapDelay: 300,
    pinchThreshold: 15
  });

  return (
    <div 
      ref={containerRef}
      className="w-full h-full touch-pan-y touch-pan-x"
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'pan-x pan-y'
      }}
    >
      {children}
      
      {/* Visual feedback for gestures */}
      <div className="fixed bottom-4 left-4 right-4 pointer-events-none z-40 md:hidden">
        <div className="flex justify-between text-xs text-gray-500 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1">
          <span>← Atrás</span>
          <span>↑ Buscar</span>
          <span>Adelante →</span>
        </div>
      </div>
    </div>
  );
}