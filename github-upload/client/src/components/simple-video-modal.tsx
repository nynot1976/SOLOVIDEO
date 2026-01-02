import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { usePlayerSettings } from "@/pages/settings";

interface SimpleVideoModalProps {
  streamUrl: string;
  title: string;
  onClose: () => void;
}

export function SimpleVideoModal({ streamUrl, title, onClose }: SimpleVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const settings = usePlayerSettings();

  useEffect(() => {
    console.log('SimpleVideoModal mounted with URL:', streamUrl);
    console.log('Using settings:', settings);
    
    if (streamUrl && videoRef.current) {
      const video = videoRef.current;
      
      // Configure video element for progressive streaming (preview while downloading)
      video.preload = 'auto'; // Start downloading immediately
      video.volume = settings.volume / 100;
      video.playbackRate = settings.playbackRate;
      video.crossOrigin = settings.crossOriginMode;
      video.playsInline = true;
      video.controls = true; // Enable built-in controls for better streaming
      
      // Progressive streaming attributes
      video.setAttribute('muted', 'false');
      video.setAttribute('autoBuffer', 'true');
      video.setAttribute('buffered', 'true');
      
      // Set source and start progressive loading
      video.src = streamUrl;
      video.load();
      
      video.addEventListener('loadstart', () => {
        console.log('Video started loading');
      });
      
      video.addEventListener('canplay', () => {
        console.log('Video can start playing - progressive streaming ready');
        if (settings.autoplay) {
          video.play().catch(err => {
            console.log('Autoplay blocked:', err);
          });
        }
        
        if (settings.fullscreenOnPlay && document.fullscreenEnabled) {
          video.requestFullscreen().catch(err => {
            console.log('Fullscreen blocked:', err);
          });
        }
      });

      // Handle video end - clear cached data
      video.addEventListener('ended', () => {
        console.log('Video ended - clearing streaming cache');
        // Clear video src to remove cached download
        video.src = '';
        video.removeAttribute('src');
        video.load();
      });

      // Handle progress for streaming feedback
      video.addEventListener('progress', () => {
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          const duration = video.duration;
          if (duration > 0) {
            const bufferedPercent = (bufferedEnd / duration) * 100;
            console.log(`Streaming progress: ${bufferedPercent.toFixed(1)}% buffered`);
          }
        }
      });
      
      video.addEventListener('error', (e) => {
        console.error('Video error:', e);
        // Try to reload if there's an error
        setTimeout(() => {
          if (video.src) {
            video.load();
          }
        }, 1000);
      });
      
      // Handle download prevention
      video.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    }
  }, [streamUrl, settings]);

  // Use body portal to ensure maximum visibility
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Clear video cache before closing
          if (videoRef.current) {
            const video = videoRef.current;
            video.pause();
            video.src = '';
            video.removeAttribute('src');
            video.load();
          }
          onClose();
        }
      }}
    >
      <div 
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: '#111827',
          borderBottom: '1px solid #374151'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {title}
          </h2>
          <button 
            onClick={() => {
              // Clear video cache before closing
              if (videoRef.current) {
                const video = videoRef.current;
                video.pause();
                video.src = '';
                video.removeAttribute('src');
                video.load();
              }
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'white';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Video */}
        <div style={{ position: 'relative', flex: 1 }}>
          <video
            ref={videoRef}
            controls={settings.showPlayerControls}
            autoPlay={settings.autoplay}
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '70vh',
              backgroundColor: 'black',
              objectFit: 'contain'
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            Tu navegador no soporta la reproducción de video.
          </video>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#111827',
          borderTop: '1px solid #374151',
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={() => {
              if (settings.defaultPlayer === 'external') {
                window.open(streamUrl, '_blank');
              } else {
                // Handle different player modes
                switch (settings.defaultPlayer) {
                  case 'download':
                    window.open(streamUrl + '&download=true', '_blank');
                    break;
                  case 'iframe':
                    // Could open in iframe mode
                    window.open(streamUrl, '_blank');
                    break;
                  default:
                    window.open(streamUrl, '_blank');
                }
              }
            }}
            style={{
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#15803d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#16a34a';
            }}
          >
            {settings.defaultPlayer === 'download' ? 'Descargar' : 'Abrir en reproductor externo'}
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}