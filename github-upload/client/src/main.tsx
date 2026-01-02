import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Optimizaciones para Android/Capacitor
if (typeof window !== 'undefined') {
  // Prevenir zoom en inputs en iOS/Android
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  }

  // Optimizar para pantallas Android
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    document.body.classList.add('standalone-app');
  }

  // Configuración para Capacitor
  document.addEventListener('deviceready', () => {
    console.log('SoloVideoClub: Dispositivo Android listo');
  });

  // Prevenir zoom doble-tap en Android
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

createRoot(document.getElementById("root")!).render(<App />);
