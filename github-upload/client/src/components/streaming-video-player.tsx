import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface StreamingVideoPlayerProps {
  streamUrl: string;
  title: string;
  onClose: () => void;
}

export function StreamingVideoPlayer({ streamUrl, title, onClose }: StreamingVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('StreamingVideoPlayer mounted with URL:', streamUrl);
    setIsLoading(true);
    setError(null);
    
    // Reset loading after timeout
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [streamUrl]);

  // Crear HTML personalizado para el reproductor de video
  const createVideoHTML = () => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Video Player</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                background: #000; 
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            video { 
                width: 100vw; 
                height: 100vh; 
                object-fit: contain;
            }
            .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 18px;
            }
            .error {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: #ef4444;
                text-align: center;
                padding: 20px;
            }
        </style>
    </head>
    <body>
        <div class="loading" id="loading">Cargando video...</div>
        <div class="error" id="error" style="display: none;">
            <h3>Error al cargar el video</h3>
            <p>El video no se pudo reproducir correctamente.</p>
        </div>
        <div class="audio-button" id="audioButton" style="display: none;">
            <button onclick="activateAudio()" style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(45deg, #3b82f6, #1d4ed8);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                transition: all 0.3s ease;
                z-index: 1000;
            " onmouseover="this.style.transform='translate(-50%, -50%) scale(1.05)'" onmouseout="this.style.transform='translate(-50%, -50%) scale(1)'">
                🔊 Activar Audio en Español
            </button>
        </div>
        <div class="audio-controls" id="audioControls" style="
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: none;
        ">
            <div class="audio-track-selector" style="
                background: rgba(0, 0, 0, 0.8);
                padding: 10px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            ">
                <label for="audioTrackSelect" style="color: white; font-size: 12px; margin-right: 8px;">Audio:</label>
                <select id="audioTrackSelect" onchange="changeAudioTrack(this.value)" style="
                    background: rgba(59, 130, 246, 0.9);
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">
                    <option value="">Cargando...</option>
                </select>
            </div>
        </div>
        <video 
            id="videoPlayer"
            controls 
            autoplay
            preload="auto"
            playsInline
            crossOrigin="anonymous"
            style="display: none;"
        >
            <source src="${streamUrl}" type="video/mp4">
            <source src="${streamUrl}" type="video/webm">
            <source src="${streamUrl}" type="video/x-matroska">
            Tu navegador no soporta video HTML5.
        </video>
        
        <script>
            const video = document.getElementById('videoPlayer');
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            
            // Crear botón de reproducción con audio
            function createPlayButton() {
                const playButton = document.createElement('div');
                playButton.id = 'playButton';
                playButton.innerHTML = \`
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(0, 0, 0, 0.8);
                        color: white;
                        padding: 20px 30px;
                        border-radius: 10px;
                        cursor: pointer;
                        text-align: center;
                        font-size: 18px;
                        z-index: 1000;
                        border: 2px solid #3b82f6;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='rgba(59, 130, 246, 0.8)'" onmouseout="this.style.background='rgba(0, 0, 0, 0.8)'">
                        <div style="font-size: 24px; margin-bottom: 10px;">▶️</div>
                        <div>Reproducir con Audio</div>
                        <div style="font-size: 14px; opacity: 0.8; margin-top: 5px;">Haz clic para activar el sonido</div>
                    </div>
                \`;
                
                playButton.addEventListener('click', () => {
                    video.muted = false;
                    video.volume = 0.8;
                    video.play().then(() => {
                        console.log('Audio activado manualmente');
                        playButton.remove();
                    }).catch(e => {
                        console.error('Error al reproducir:', e);
                    });
                });
                
                document.body.appendChild(playButton);
            }
            
            function showPlayButton() {
                const audioButton = document.getElementById('audioButton');
                if (audioButton) {
                    audioButton.style.display = 'block';
                }
            }
            
            function activateAudio() {
                const audioButton = document.getElementById('audioButton');
                video.muted = false;
                video.volume = 0.8;
                
                video.play().then(() => {
                    console.log('Audio activado manualmente');
                    audioButton.style.display = 'none';
                    
                    // Configurar pistas de audio en español
                    setTimeout(() => {
                        configureSpanishAudio();
                        loadAudioTracks();
                    }, 1000);
                }).catch(e => {
                    console.error('Error al activar audio:', e);
                });
            }
            
            function configureSpanishAudio() {
                // Configurar pistas de audio en español
                const audioTracks = video.audioTracks;
                if (audioTracks && audioTracks.length > 0) {
                    for (let i = 0; i < audioTracks.length; i++) {
                        const track = audioTracks[i];
                        if (track.language === 'es' || track.language === 'spa' || 
                            track.language === 'es-ES' || track.language === 'spanish' ||
                            track.label && (track.label.toLowerCase().includes('español') || 
                                          track.label.toLowerCase().includes('spanish') ||
                                          track.label.toLowerCase().includes('castellano'))) {
                            track.enabled = true;
                            console.log('Pista de audio en español activada:', track.label || track.language);
                        } else {
                            track.enabled = false;
                        }
                    }
                }
            }
            
            // Función para obtener pistas de audio del servidor
            async function loadAudioTracks() {
                try {
                    const embyId = '${streamUrl.split('/').pop()?.split('?')[0] || ''}';
                    const response = await fetch('/api/media/' + embyId + '/audio-tracks');
                    const data = await response.json();
                    
                    console.log('🎵 Audio tracks loaded:', data);
                    
                    if (data.audioTracks && data.audioTracks.length > 0) {
                        const audioControls = document.getElementById('audioControls');
                        const audioSelect = document.getElementById('audioTrackSelect');
                        
                        // Limpiar opciones anteriores
                        audioSelect.innerHTML = '';
                        
                        // Agregar opciones de pistas de audio
                        data.audioTracks.forEach(track => {
                            const option = document.createElement('option');
                            option.value = track.index;
                            option.textContent = track.title + 
                                (track.isSpanish ? ' 🇪🇸' : '') + 
                                (track.isDefault ? ' (Por defecto)' : '');
                            
                            // Seleccionar automáticamente pista recomendada (español)
                            if (track.index === data.recommendedTrack) {
                                option.selected = true;
                            }
                            
                            audioSelect.appendChild(option);
                        });
                        
                        // Mostrar controles de audio solo si hay múltiples pistas
                        if (data.audioTracks.length > 1) {
                            audioControls.style.display = 'block';
                        }
                        
                        // Mostrar información de la pista actual
                        const currentTrack = data.audioTracks.find(track => track.index === data.recommendedTrack);
                        if (currentTrack && currentTrack.isSpanish) {
                            console.log('🎯 Spanish audio track activated:', currentTrack.title);
                            // Mostrar notificación temporal
                            showAudioNotification('Audio en español activado: ' + currentTrack.title);
                        }
                    }
                } catch (error) {
                    console.error('Error loading audio tracks:', error);
                }
            }
            
            // Función para mostrar notificación de audio
            function showAudioNotification(message, type = 'success') {
                const notification = document.createElement('div');
                notification.textContent = message;
                
                let bgColor = 'linear-gradient(45deg, #10b981, #059669)'; // Verde para éxito
                let shadowColor = 'rgba(16, 185, 129, 0.3)';
                
                if (type === 'error') {
                    bgColor = 'linear-gradient(45deg, #ef4444, #dc2626)'; // Rojo para error
                    shadowColor = 'rgba(239, 68, 68, 0.3)';
                } else if (type === 'info') {
                    bgColor = 'linear-gradient(45deg, #3b82f6, #1d4ed8)'; // Azul para info
                    shadowColor = 'rgba(59, 130, 246, 0.3)';
                }
                
                notification.style.cssText = \`
                    position: absolute;
                    top: 60px;
                    right: 20px;
                    background: \${bgColor};
                    color: white;
                    padding: 10px 15px;
                    border-radius: 8px;
                    z-index: 1001;
                    font-size: 14px;
                    box-shadow: 0 4px 12px \${shadowColor};
                    transition: all 0.3s ease;
                    opacity: 0;
                    transform: translateX(20px);
                    max-width: 300px;
                    word-wrap: break-word;
                \`;
                
                document.body.appendChild(notification);
                
                // Animación de entrada
                setTimeout(() => {
                    notification.style.opacity = '1';
                    notification.style.transform = 'translateX(0)';
                }, 100);
                
                // Remover después de 3 segundos (o más para errores)
                const duration = type === 'error' ? 5000 : 3000;
                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(20px)';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }, duration);
            }
            
            // Función para cambiar pista de audio
            function changeAudioTrack(trackIndex) {
                const embyId = '${streamUrl.split('/').pop()?.split('?')[0] || ''}';
                console.log('🎵 Changing to audio track:', trackIndex);
                
                // Mostrar notificación de cambio
                showAudioNotification('Cambiando pista de audio...');
                
                // Probar transcoding forzado primero
                const transcodedUrl = '/api/video-proxy/' + embyId + '?audioTrack=' + trackIndex + '&method=transcoded';
                
                // Cambiar la fuente del video
                const sources = video.querySelectorAll('source');
                sources.forEach(source => {
                    source.src = transcodedUrl;
                });
                
                // Recargar el video con la nueva pista
                video.load();
                
                // Esperar a que cargue y reproducir
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('✅ Audio track changed successfully to:', trackIndex);
                        showAudioNotification('Pista de audio cambiada exitosamente');
                    }).catch(error => {
                        console.error('Error playing with new audio track:', error);
                        showAudioNotification('Error al cambiar pista de audio', 'error');
                        
                        // Fallback a método por defecto
                        const fallbackUrl = '/api/video-proxy/' + embyId;
                        sources.forEach(source => {
                            source.src = fallbackUrl;
                        });
                        video.load();
                        video.play();
                    });
                }
            }
            
            video.addEventListener('loadstart', () => {
                console.log('Video loading started');
                loading.style.display = 'block';
            });
            
            video.addEventListener('canplay', () => {
                console.log('Video can play');
                loading.style.display = 'none';
                video.style.display = 'block';
                
                // Configurar idioma español por defecto
                const audioTracks = video.audioTracks;
                if (audioTracks && audioTracks.length > 0) {
                    for (let i = 0; i < audioTracks.length; i++) {
                        const track = audioTracks[i];
                        // Buscar pista en español
                        if (track.language === 'es' || track.language === 'spa' || 
                            track.language === 'es-ES' || track.language === 'spanish' ||
                            track.label && (track.label.toLowerCase().includes('español') || 
                                          track.label.toLowerCase().includes('spanish') ||
                                          track.label.toLowerCase().includes('castellano'))) {
                            track.enabled = true;
                            console.log('Audio en español activado:', track.label || track.language);
                        } else {
                            track.enabled = false;
                        }
                    }
                }
                
                // Configurar subtítulos en español por defecto
                const textTracks = video.textTracks;
                if (textTracks && textTracks.length > 0) {
                    for (let i = 0; i < textTracks.length; i++) {
                        const track = textTracks[i];
                        if (track.language === 'es' || track.language === 'spa' || 
                            track.language === 'es-ES' || track.language === 'spanish' ||
                            track.label && (track.label.toLowerCase().includes('español') || 
                                          track.label.toLowerCase().includes('spanish') ||
                                          track.label.toLowerCase().includes('castellano'))) {
                            track.mode = 'showing';
                            console.log('Subtítulos en español activados:', track.label || track.language);
                        } else {
                            track.mode = 'disabled';
                        }
                    }
                }
                
                // Activar sonido y configurar volumen
                video.muted = false;
                video.volume = 0.8;
                console.log('Audio activado, volumen:', video.volume);
                
                // Auto-play con sonido
                video.play().then(() => {
                    console.log('Autoplay exitoso con audio');
                    // Si el autoplay funciona, configurar español después
                    setTimeout(() => {
                        configureSpanishAudio();
                        loadAudioTracks();
                    }, 2000);
                }).catch(e => {
                    console.log('Autoplay prevented:', e);
                    // Si autoplay falla, mostrar botón para activar audio
                    showPlayButton();
                });
            });
            
            video.addEventListener('error', (e) => {
                console.error('Video error:', e);
                loading.style.display = 'none';
                error.style.display = 'block';
            });
            
            video.addEventListener('progress', () => {
                if (video.buffered.length > 0) {
                    const buffered = video.buffered.end(0);
                    const duration = video.duration;
                    if (duration > 0) {
                        const percent = (buffered / duration) * 100;
                        console.log('Buffered:', percent.toFixed(1) + '%');
                    }
                }
            });
            
            // Prevenir descargas
            video.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
            
            // Configurar video con español por defecto
            video.volume = 0.8;
            video.muted = false;
            video.defaultMuted = false;
            
            // Configurar preferencias de idioma
            video.setAttribute('lang', 'es');
            video.setAttribute('data-lang', 'spanish');
            
            // Evento para detectar si el usuario interactúa con el video
            video.addEventListener('click', () => {
                if (video.muted) {
                    video.muted = false;
                    video.volume = 0.8;
                    console.log('Audio activado por clic del usuario');
                }
            });
            
            video.load();
        </script>
    </body>
    </html>
    `;
  };

  const videoDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(createVideoHTML())}`;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 1000000
      }}>
        <h2 style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          margin: 0
        }}>
          {title}
        </h2>
        <button 
          onClick={onClose}
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
        >
          <X size={24} />
        </button>
      </div>

      {/* Video Player */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={videoDataUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'black'
          }}
          allow="autoplay; fullscreen"
          allowFullScreen
          title={`Video: ${title}`}
          onLoad={() => {
            console.log('Video iframe loaded');
            setIsLoading(false);
          }}
          onError={() => {
            console.error('Video iframe error');
            setError('Error al cargar el reproductor');
            setIsLoading(false);
          }}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px'
          }}>
            Iniciando reproductor de video...
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            textAlign: 'center',
            padding: '20px'
          }}>
            <h3 style={{ marginBottom: '10px' }}>Error de Reproducción</h3>
            <p style={{ marginBottom: '20px' }}>{error}</p>
            <button
              onClick={() => window.open(streamUrl, '_blank')}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Abrir en nueva pestaña
            </button>
          </div>
        )}
      </div>
    </div>
  );
}