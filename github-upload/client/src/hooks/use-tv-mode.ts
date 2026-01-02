import { useState, useEffect, useCallback } from 'react';

interface TVModeState {
  isTVMode: boolean;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
}

interface AndroidModeState {
  isAndroid: boolean;
  isAndroidTV: boolean;
  isAndroidMobile: boolean;
  isAndroidTablet: boolean;
}

function detectSmartTV(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || '';
  
  const isTVDevice = /Android TV|webOS|Tizen|SMART-TV|SmartTV|HbbTV|NetCast|Viera|BRAVIA|GoogleTV|AFTT|AFTM|AFT|FireTV|Roku|AppleTV|tvOS|CrKey|Chromecast|Opera TV|Silk/i.test(userAgent);

  const hasLargeScreen = window.screen.width >= 1280 && window.screen.height >= 720;
  const hasNoTouch = !('ontouchstart' in window) && !navigator.maxTouchPoints;
  const isLikelyTV = hasLargeScreen && hasNoTouch && 
    (/android|linux/i.test(userAgent));

  const forceTV = localStorage.getItem('solovideo-tv-mode') === 'true';

  return isTVDevice || forceTV || isLikelyTV;
}

function initializeTVNavigation() {
  const getFocusable = () =>
    Array.from(document.querySelectorAll('.focusable, [data-focusable="true"], [data-tv-focusable], [data-tv-index], button, a, [role="button"], input, select'))
      .filter(el => {
        const htmlEl = el as HTMLElement;
        return !htmlEl.hasAttribute('disabled') && 
               htmlEl.offsetParent !== null &&
               !htmlEl.closest('[aria-hidden="true"]');
      })
      .map(el => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl.hasAttribute('tabindex')) htmlEl.setAttribute('tabindex', '0');
        htmlEl.classList.add('focusable');
        return htmlEl;
      });

  const focusFirst = () => {
    const items = getFocusable();
    const mediaCards = items.filter(el => el.classList.contains('media-card') || el.hasAttribute('data-tv-index'));
    if (mediaCards.length) {
      mediaCards[0].focus();
    } else if (items.length) {
      items[0].focus();
    }
  };

  setTimeout(focusFirst, 300);

  const moveFocus = (dir: 'up' | 'down' | 'left' | 'right') => {
    const items = getFocusable();
    if (!items.length) return;

    const active = document.activeElement as HTMLElement;
    let idx = items.indexOf(active);
    if (idx === -1) idx = 0;

    const delta = (dir === 'left' || dir === 'up') ? -1 : 1;
    const next = items[(idx + delta + items.length) % items.length];
    next.focus();
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveFocus('right');
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveFocus('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus('down');
        break;
      case 'Enter':
      case 'OK':
        e.preventDefault();
        if (document.activeElement) {
          (document.activeElement as HTMLElement).click();
        }
        break;
      case 'Escape':
      case 'Backspace':
        if (document.activeElement && document.activeElement.tagName !== 'INPUT') {
          e.preventDefault();
          window.history.back();
        }
        break;
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}

export function useTVMode(): TVModeState {
  const [isTVMode, setIsTVMode] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const detected = detectSmartTV();
    setIsTVMode(detected);

    if (detected) {
      document.documentElement.classList.add('tv-mode');
      document.body.classList.add('tv-mode');
      console.log('📺 TV Mode activated - cursor hidden, remote navigation enabled');
      
      const cleanup = initializeTVNavigation();
      return () => {
        cleanup();
        document.documentElement.classList.remove('tv-mode');
        document.body.classList.remove('tv-mode');
      };
    } else {
      document.documentElement.classList.remove('tv-mode');
      document.body.classList.remove('tv-mode');
    }
  }, []);

  return { isTVMode, focusedIndex, setFocusedIndex };
}

export function useTVNavigation(
  itemsCount: number,
  columns: number = 7,
  onSelect?: (index: number) => void,
  onBack?: () => void
) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { isTVMode } = useTVMode();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isTVMode) return;

    const key = event.key;
    let newIndex = focusedIndex;

    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(0, focusedIndex - columns);
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(itemsCount - 1, focusedIndex + columns);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = Math.max(0, focusedIndex - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = Math.min(itemsCount - 1, focusedIndex + 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(focusedIndex);
        break;
      case 'Escape':
      case 'Backspace':
        event.preventDefault();
        onBack?.();
        break;
      default:
        break;
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      const element = document.querySelector(`[data-tv-index="${newIndex}"]`);
      if (element) {
        (element as HTMLElement).focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }, [focusedIndex, itemsCount, columns, onSelect, onBack, isTVMode]);

  useEffect(() => {
    if (isTVMode) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isTVMode]);

  return { focusedIndex, setFocusedIndex, isTVMode };
}

export function toggleTVMode(force?: boolean) {
  const current = localStorage.getItem('solovideo-tv-mode') === 'true';
  const newValue = force !== undefined ? force : !current;
  localStorage.setItem('solovideo-tv-mode', String(newValue));
  window.location.reload();
}

function detectAndroid(): AndroidModeState {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isAndroid: false, isAndroidTV: false, isAndroidMobile: false, isAndroidTablet: false };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = userAgent.includes('android');
  
  const isAndroidTV = isAndroid && (
    userAgent.includes('android tv') ||
    userAgent.includes('googletv') ||
    userAgent.includes('aftt') ||
    userAgent.includes('aftm') ||
    userAgent.includes('aft') ||
    userAgent.includes('fire tv') ||
    userAgent.includes('firetv') ||
    userAgent.includes('bravia') ||
    userAgent.includes('mi box') ||
    userAgent.includes('shield')
  );

  const screenWidth = window.screen.width;
  const isAndroidTablet = isAndroid && !isAndroidTV && screenWidth >= 600;
  const isAndroidMobile = isAndroid && !isAndroidTV && screenWidth < 600;

  return { isAndroid, isAndroidTV, isAndroidMobile, isAndroidTablet };
}

export function useAndroidMode(): AndroidModeState {
  const [state, setState] = useState<AndroidModeState>({
    isAndroid: false,
    isAndroidTV: false,
    isAndroidMobile: false,
    isAndroidTablet: false
  });

  useEffect(() => {
    const detected = detectAndroid();
    setState(detected);

    if (detected.isAndroid) {
      document.body.classList.add('android-mode');
      console.log('🤖 Android Mode activated');
      
      if (detected.isAndroidTV) {
        document.body.classList.add('android-tv');
        document.body.classList.add('tv-mode');
        console.log('📺 Android TV detected');
      } else if (detected.isAndroidTablet) {
        document.body.classList.add('android-tablet');
        console.log('📱 Android Tablet detected');
      } else if (detected.isAndroidMobile) {
        document.body.classList.add('android-mobile');
        console.log('📱 Android Mobile detected');
      }
    }

    return () => {
      document.body.classList.remove('android-mode', 'android-tv', 'android-tablet', 'android-mobile');
    };
  }, []);

  return state;
}

export function toggleAndroidMode(force?: boolean) {
  const current = localStorage.getItem('solovideo-android-mode') === 'true';
  const newValue = force !== undefined ? force : !current;
  localStorage.setItem('solovideo-android-mode', String(newValue));
  window.location.reload();
}
