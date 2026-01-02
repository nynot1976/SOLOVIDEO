import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { X } from "lucide-react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamUrl: string;
  title: string;
}

export function VideoPlayerModal({ isOpen, onClose, streamUrl, title }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) {
      console.log("VideoPlayerModal: Skipping video load - streamUrl:", !!streamUrl, "video:", !!videoRef.current);
      return;
    }

    const video = videoRef.current;
    const isHls = streamUrl.endsWith(".m3u8");

    console.log("Loading video:", streamUrl, "isHls:", isHls);

    // Prevent browser from trying to download the file
    video.addEventListener('error', (e) => {
      console.error('Video error:', e);
    });

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      console.log("Using HLS.js for:", streamUrl);

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS.js error:", data);
        // Fallback to native video
        video.src = streamUrl;
        video.load();
      });

      return () => {
        console.log("Destroying HLS instance");
        hls.destroy();
      };
    } else {
      console.log("Using native video player for:", streamUrl);
      video.src = streamUrl;
      video.load();
      
      // Try to play immediately
      video.play().catch(err => {
        console.log("Autoplay blocked, user will need to click play:", err);
      });
    }
  }, [streamUrl]);



  console.log('=== VideoPlayerModal RENDER CHECK ===');
  console.log('isOpen:', isOpen);
  console.log('streamUrl exists:', !!streamUrl);
  console.log('streamUrl preview:', streamUrl?.substring(0, 80) + '...');
  console.log('title:', title);
  
  // Siempre renderizar cuando el componente se monta (ya que se renderiza condicionalmente)
  console.log('=== VideoPlayerModal IS RENDERING ===');
  console.log('Modal will be visible with z-index 9999');

  // Create portal element to ensure proper rendering
  return (
    <div 
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 99999,
        display: 'flex',
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-gray-900 rounded-xl overflow-hidden w-full max-w-5xl shadow-2xl"
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
          <h2 className="text-white font-bold text-xl truncate">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-white hover:text-red-400 transition-colors flex-shrink-0 ml-4"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="relative flex-1">
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="w-full bg-black"
            crossOrigin="anonymous"
            style={{ 
              objectFit: 'contain',
              height: '60vh',
              minHeight: '400px'
            }}
            onError={(e) => {
              console.error('Video error:', e);
            }}
            onLoadStart={() => {
              console.log('Video started loading');
            }}
            onCanPlay={() => {
              console.log('Video can start playing');
            }}
          >
            Tu navegador no soporta la reproducción de video.
          </video>
        </div>
        <div className="p-4 flex gap-3 bg-gray-800 border-t border-gray-700">
          <button
            onClick={() => {
              const playUrl = streamUrl.replace('/stream?', '/play?');
              window.open(playUrl, '_blank');
            }}
            className="text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
            type="button"
          >
            Abrir en reproductor externo
          </button>
          <button
            onClick={onClose}
            className="text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}