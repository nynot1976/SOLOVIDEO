import { useState, useEffect, useRef, useCallback } from 'react';

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
}

interface GestureOptions {
  swipeThreshold?: number;
  velocityThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
}

export function useGestures(
  ref: React.RefObject<HTMLElement>,
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
) {
  const {
    swipeThreshold = 50,
    velocityThreshold = 0.3,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pinchThreshold = 10
  } = options;

  const touchStart = useRef<TouchPoint | null>(null);
  const touchEnd = useRef<TouchPoint | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTap = useRef<number>(0);
  const initialDistance = useRef<number>(0);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: now
    };

    // Handle multi-touch for pinch gestures
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      clearLongPressTimer();
      return;
    }

    // Start long press timer
    if (callbacks.onLongPress) {
      longPressTimer.current = setTimeout(() => {
        callbacks.onLongPress?.();
        clearLongPressTimer();
      }, longPressDelay);
    }
  }, [callbacks.onLongPress, longPressDelay, clearLongPressTimer, getDistance]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    // Cancel long press on movement
    clearLongPressTimer();

    // Handle pinch gestures
    if (e.touches.length === 2) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const distanceDiff = currentDistance - initialDistance.current;
      
      if (Math.abs(distanceDiff) > pinchThreshold) {
        if (distanceDiff > 0) {
          callbacks.onPinchOut?.();
        } else {
          callbacks.onPinchIn?.();
        }
        initialDistance.current = currentDistance;
      }
      return;
    }

    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, [touchStart, clearLongPressTimer, getDistance, pinchThreshold, callbacks.onPinchIn, callbacks.onPinchOut]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    clearLongPressTimer();

    if (!touchStart.current || !touchEnd.current) {
      // Handle tap
      const now = Date.now();
      if (now - lastTap.current < doubleTapDelay) {
        callbacks.onDoubleTap?.();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        setTimeout(() => {
          if (lastTap.current === now) {
            callbacks.onTap?.();
          }
        }, doubleTapDelay);
      }
      return;
    }

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;
    
    const distanceX = Math.abs(deltaX);
    const distanceY = Math.abs(deltaY);
    const velocity = Math.sqrt(distanceX * distanceX + distanceY * distanceY) / deltaTime;

    // Check if it's a swipe gesture
    if (velocity > velocityThreshold && (distanceX > swipeThreshold || distanceY > swipeThreshold)) {
      if (distanceX > distanceY) {
        // Horizontal swipe
        if (deltaX > 0) {
          callbacks.onSwipeRight?.();
        } else {
          callbacks.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          callbacks.onSwipeDown?.();
        } else {
          callbacks.onSwipeUp?.();
        }
      }
    }

    // Reset touch points
    touchStart.current = null;
    touchEnd.current = null;
  }, [
    touchStart,
    touchEnd,
    clearLongPressTimer,
    swipeThreshold,
    velocityThreshold,
    doubleTapDelay,
    callbacks
  ]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Prevent default behaviors that might interfere
    const preventDefaultHandler = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent pinch-to-zoom
      }
    };

    element.addEventListener('touchstart', preventDefaultHandler, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchstart', preventDefaultHandler);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    clearLongPressTimer
  };
}