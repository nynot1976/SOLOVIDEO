import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solovideo.club',
  appName: 'SoloVideoClub',
  webDir: 'dist/public',
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    loggingBehavior: 'debug',
    backgroundColor: '#1a1a2e',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#1a1a2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#667eea',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a2e',
      overlaysWebView: false
    },
    App: {
      defaultTitle: 'SoloVideoClub - Streaming Universal',
      // Prevenir que la app se suspenda durante video
      preventAutoSuspend: true
    },
    // Plugin para pantalla completa en videos
    CapacitorVideoPlayer: {
      mode: 'fullscreen'
    }
  }
};

export default config;
