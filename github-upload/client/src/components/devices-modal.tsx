import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  Laptop, 
  Tablet, 
  Monitor, 
  RefreshCw, 
  MapPin, 
  Clock, 
  Wifi,
  Globe,
  Computer
} from "lucide-react";


interface ActiveSession {
  id: string;
  username: string;
  serverName: string;
  serverUrl: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivity: string;
  isCurrentSession: boolean;
}

interface SessionData {
  totalSessions: number;
  sessions: ActiveSession[];
}

interface DevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} días`;
}

function getOperatingSystem(deviceInfo: string): string {
  const device = deviceInfo.toLowerCase();
  if (device.includes('windows')) return 'Windows';
  if (device.includes('mac os x') || device.includes('macos')) return 'macOS';
  if (device.includes('android')) return 'Android';
  if (device.includes('iphone') || device.includes('ios')) return 'iOS';
  if (device.includes('ipad')) return 'iPadOS';
  if (device.includes('linux')) return 'Linux';
  if (device.includes('ubuntu')) return 'Ubuntu';
  return 'Desconocido';
}

function getBrowser(deviceInfo: string): string {
  const device = deviceInfo.toLowerCase();
  if (device.includes('chrome') && !device.includes('edge')) return 'Chrome';
  if (device.includes('firefox')) return 'Firefox';
  if (device.includes('safari') && !device.includes('chrome')) return 'Safari';
  if (device.includes('edge')) return 'Edge';
  if (device.includes('opera')) return 'Opera';
  return 'Otro navegador';
}

function getDeviceType(deviceInfo: string): string {
  const device = deviceInfo.toLowerCase();
  if (device.includes('mobile') || device.includes('android') || device.includes('iphone')) {
    return 'Móvil';
  }
  if (device.includes('tablet') || device.includes('ipad')) {
    return 'Tablet';
  }
  return 'Escritorio';
}

function getDeviceIcon(deviceInfo: string) {
  const device = deviceInfo.toLowerCase();
  if (device.includes('mobile') || device.includes('android') || device.includes('iphone')) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (device.includes('tablet') || device.includes('ipad')) {
    return <Tablet className="h-5 w-5" />;
  }
  return <Laptop className="h-5 w-5" />;
}

function getOSIcon(deviceInfo: string) {
  const device = deviceInfo.toLowerCase();
  if (device.includes('windows')) return <Computer className="h-4 w-4 text-blue-400" />;
  if (device.includes('mac os x') || device.includes('macos')) return <Laptop className="h-4 w-4 text-gray-300" />;
  if (device.includes('android')) return <Smartphone className="h-4 w-4 text-green-400" />;
  if (device.includes('iphone') || device.includes('ios') || device.includes('ipad')) return <Smartphone className="h-4 w-4 text-gray-300" />;
  return <Monitor className="h-4 w-4 text-gray-400" />;
}

function getBrowserIcon(deviceInfo: string) {
  const device = deviceInfo.toLowerCase();
  if (device.includes('chrome') && !device.includes('edge')) return <Globe className="h-4 w-4 text-yellow-400" />;
  if (device.includes('firefox')) return <Globe className="h-4 w-4 text-orange-400" />;
  if (device.includes('safari') && !device.includes('chrome')) return <Globe className="h-4 w-4 text-blue-400" />;
  if (device.includes('edge')) return <Globe className="h-4 w-4 text-blue-400" />;
  return <Globe className="h-4 w-4 text-gray-400" />;
}

export function DevicesModal({ isOpen, onClose }: DevicesModalProps) {
  const { data: sessionData, isLoading, refetch } = useQuery<SessionData>({
    queryKey: ["/api/sessions/active"],
    refetchInterval: 30000,
    retry: false,
    enabled: isOpen
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Monitor className="h-6 w-6 text-blue-400" />
            Dispositivos Conectados
            {sessionData && (
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {sessionData.totalSessions} {sessionData.totalSessions === 1 ? 'dispositivo' : 'dispositivos'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Lista de todos los dispositivos conectados con tu cuenta
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
              <span className="ml-2 text-gray-400">Cargando dispositivos...</span>
            </div>
          ) : !sessionData || sessionData.sessions.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No hay dispositivos conectados</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {sessionData.sessions.map((session, index) => (
                  <div key={session.id}>
                    <div className={`p-4 rounded-lg border-2 ${
                      session.isCurrentSession 
                        ? 'border-green-500/50 bg-gradient-to-r from-green-900/30 to-emerald-900/30'
                        : 'border-orange-500/50 bg-gradient-to-r from-orange-900/20 to-red-900/20'
                    }`}>
                      <div className="flex items-start gap-4">
                        {/* Device Icon */}
                        <div className={`p-3 rounded-full ${
                          session.isCurrentSession ? 'bg-green-500/20' : 'bg-orange-500/20'
                        }`}>
                          {getDeviceIcon(session.deviceInfo)}
                        </div>

                        {/* Device Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{session.username}</span>
                            <Badge 
                              variant={session.isCurrentSession ? "default" : "outline"}
                              className={session.isCurrentSession ? "bg-green-500 text-white" : "border-orange-500 text-orange-300"}
                            >
                              {session.isCurrentSession ? 'Este Dispositivo' : 'Otro Dispositivo'}
                            </Badge>
                          </div>

                          {/* Device Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              {getOSIcon(session.deviceInfo)}
                              <span className="text-gray-300">
                                <strong>SO:</strong> {getOperatingSystem(session.deviceInfo)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {getBrowserIcon(session.deviceInfo)}
                              <span className="text-gray-300">
                                <strong>Navegador:</strong> {getBrowser(session.deviceInfo)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {getDeviceIcon(session.deviceInfo)}
                              <span className="text-gray-300">
                                <strong>Tipo:</strong> {getDeviceType(session.deviceInfo)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-300">
                                <strong>IP:</strong> {session.ipAddress}
                              </span>
                            </div>
                          </div>

                          {/* Status and Activity */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                session.isCurrentSession ? 'bg-green-500 animate-pulse' : 'bg-orange-500'
                              }`}></div>
                              <span className={`text-xs ${
                                session.isCurrentSession ? 'text-green-300' : 'text-orange-300'
                              }`}>
                                {session.isCurrentSession ? 'Activo ahora' : 'Conectado'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {getTimeAgo(session.lastActivity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {index < sessionData.sessions.length - 1 && <Separator className="bg-gray-700" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Server Info */}
          {sessionData && sessionData.sessions.length > 0 && (
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Wifi className="h-3 w-3" />
                <span>Servidor: {sessionData.sessions[0].serverName}</span>
                <span>•</span>
                <span>{sessionData.sessions[0].serverUrl}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}