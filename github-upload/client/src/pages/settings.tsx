import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { Link } from "wouter";

interface PlayerSettings {
  defaultPlayer: 'integrated' | 'external' | 'iframe' | 'download';
  autoplay: boolean;
  volume: number;
  quality: 'auto' | 'high' | 'medium' | 'low';
  subtitles: boolean;
  fullscreenOnPlay: boolean;
  showPlayerControls: boolean;
  bufferTime: number;
  crossOriginMode: 'anonymous' | 'use-credentials' | 'none';
  playbackRate: number;
}

const defaultSettings: PlayerSettings = {
  defaultPlayer: 'integrated',
  autoplay: true,
  volume: 80,
  quality: 'auto',
  subtitles: false,
  fullscreenOnPlay: false,
  showPlayerControls: true,
  bufferTime: 10,
  crossOriginMode: 'anonymous',
  playbackRate: 1.0
};

export function Settings() {
  const [settings, setSettings] = useState<PlayerSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('solovideo-player-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('solovideo-player-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('solovideo-player-settings');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = (key: keyof PlayerSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 min-h-12 px-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-3">
            <SettingsIcon className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold">Configuración de Reproductores</h1>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Reproductor Principal */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Reproductor Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-player" className="text-white">Reproductor por defecto</Label>
                <Select 
                  value={settings.defaultPlayer} 
                  onValueChange={(value: any) => updateSetting('defaultPlayer', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="integrated">Reproductor Integrado (Recomendado)</SelectItem>
                    <SelectItem value="external">Reproductor Externo</SelectItem>
                    <SelectItem value="iframe">Reproductor iFrame</SelectItem>
                    <SelectItem value="download">Descargar Archivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quality" className="text-white">Calidad de video</Label>
                <Select 
                  value={settings.quality} 
                  onValueChange={(value: any) => updateSetting('quality', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática</SelectItem>
                    <SelectItem value="high">Alta (1080p+)</SelectItem>
                    <SelectItem value="medium">Media (720p)</SelectItem>
                    <SelectItem value="low">Baja (480p)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cross-origin" className="text-white">Modo CORS</Label>
                <Select 
                  value={settings.crossOriginMode} 
                  onValueChange={(value: any) => updateSetting('crossOriginMode', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anonymous">Anónimo (Recomendado)</SelectItem>
                    <SelectItem value="use-credentials">Con credenciales</SelectItem>
                    <SelectItem value="none">Sin CORS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Configuración de Reproducción */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Configuración de Reproducción</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoplay" className="text-white">Reproducción automática</Label>
                <Switch
                  id="autoplay"
                  checked={settings.autoplay}
                  onCheckedChange={(checked) => updateSetting('autoplay', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="fullscreen" className="text-white">Pantalla completa al reproducir</Label>
                <Switch
                  id="fullscreen"
                  checked={settings.fullscreenOnPlay}
                  onCheckedChange={(checked) => updateSetting('fullscreenOnPlay', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="controls" className="text-white">Mostrar controles del reproductor</Label>
                <Switch
                  id="controls"
                  checked={settings.showPlayerControls}
                  onCheckedChange={(checked) => updateSetting('showPlayerControls', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="subtitles" className="text-white">Subtítulos por defecto</Label>
                <Switch
                  id="subtitles"
                  checked={settings.subtitles}
                  onCheckedChange={(checked) => updateSetting('subtitles', checked)}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white">Volumen por defecto: {settings.volume}%</Label>
                <Slider
                  value={[settings.volume]}
                  onValueChange={(value) => updateSetting('volume', value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white">Velocidad de reproducción: {settings.playbackRate}x</Label>
                <Slider
                  value={[settings.playbackRate]}
                  onValueChange={(value) => updateSetting('playbackRate', value[0])}
                  max={2.0}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-white">Tiempo de buffer: {settings.bufferTime} segundos</Label>
                <Slider
                  value={[settings.bufferTime]}
                  onValueChange={(value) => updateSetting('bufferTime', value[0])}
                  max={30}
                  min={3}
                  step={1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Información de Reproductores */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Reproductores Disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-400 mb-2">Reproductor Integrado</h3>
                  <p className="text-sm text-gray-300">
                    Reproductor HTML5 nativo con controles personalizados. Mejor compatibilidad y rendimiento.
                  </p>
                  <div className="mt-2 text-xs text-gray-400">
                    Formatos: MP4, WebM, OGG, HLS, DASH
                  </div>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-400 mb-2">Reproductor Externo</h3>
                  <p className="text-sm text-gray-300">
                    Abre el contenido en una nueva pestaña usando el reproductor del navegador.
                  </p>
                  <div className="mt-2 text-xs text-gray-400">
                    Compatibilidad: Universal
                  </div>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-400 mb-2">Reproductor iFrame</h3>
                  <p className="text-sm text-gray-300">
                    Incrusta el contenido en un iframe dentro de la aplicación.
                  </p>
                  <div className="mt-2 text-xs text-gray-400">
                    Limitaciones: Depende de políticas CORS del servidor
                  </div>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-400 mb-2">Descargar Archivo</h3>
                  <p className="text-sm text-gray-300">
                    Descarga directa del archivo de media para reproducción offline.
                  </p>
                  <div className="mt-2 text-xs text-gray-400">
                    Uso: Cuando otros reproductores no funcionan
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button 
              onClick={saveSettings} 
              className="bg-green-600 hover:bg-green-700 flex-1 py-3 text-base font-medium"
            >
              {saved ? '✓ Configuración Guardada' : 'Guardar Configuración'}
            </Button>
            <Button 
              onClick={resetSettings} 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-gray-800 flex-1 py-3 text-base font-medium"
            >
              Restablecer por Defecto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para usar la configuración en otros componentes
export function usePlayerSettings(): PlayerSettings {
  const [settings, setSettings] = useState<PlayerSettings>(defaultSettings);

  useEffect(() => {
    const savedSettings = localStorage.getItem('solovideo-player-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  return settings;
}