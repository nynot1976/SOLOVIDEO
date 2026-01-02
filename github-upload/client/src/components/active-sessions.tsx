import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Monitor, MapPin, Clock, RefreshCw, Smartphone, Laptop, Tablet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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

function getDeviceIcon(deviceInfo: string) {
  const device = deviceInfo.toLowerCase();
  if (device.includes('mobile') || device.includes('android') || device.includes('iphone')) {
    return <Smartphone className="h-4 w-4" />;
  }
  if (device.includes('tablet') || device.includes('ipad')) {
    return <Tablet className="h-4 w-4" />;
  }
  return <Laptop className="h-4 w-4" />;
}

function getDeviceType(deviceInfo: string): string {
  const device = deviceInfo.toLowerCase();
  if (device.includes('mobile') || device.includes('android') || device.includes('iphone')) {
    return 'Móvil';
  }
  if (device.includes('tablet') || device.includes('ipad')) {
    return 'Tablet';
  }
  if (device.includes('chrome')) {
    return 'Chrome';
  }
  if (device.includes('firefox')) {
    return 'Firefox';
  }
  if (device.includes('safari')) {
    return 'Safari';
  }
  if (device.includes('edge')) {
    return 'Edge';
  }
  return 'Escritorio';
}

export function ActiveSessions() {
  const [isExpanded, setIsExpanded] = useState(true); // Expanded by default

  const { data: sessionData, isLoading, refetch } = useQuery<SessionData>({
    queryKey: ["/api/sessions/active"],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false
  });

  const { data: countData } = useQuery<{ count: number; userId: string; username: string }>({
    queryKey: ["/api/sessions/count"],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Cargando sesiones...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!sessionData || !countData) {
    return null;
  }

  return (
    <Card className="w-full border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Users className="h-5 w-5 text-blue-400" />
            Dispositivos Conectados
            <Badge variant="secondary" className="ml-2 bg-blue-600 text-white">
              {countData.count} {countData.count === 1 ? 'dispositivo' : 'dispositivos'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            {sessionData.sessions.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Ocultar' : 'Ver Todo'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {sessionData.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay sesiones activas</p>
        ) : (
          <div className="space-y-3">
            {/* Current session always visible */}
            {sessionData.sessions.filter(session => session.isCurrentSession).map((session) => (
              <div key={session.id} className="p-4 rounded-lg border-2 border-green-500/50 bg-gradient-to-r from-green-900/30 to-emerald-900/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-green-500/20">
                      {getDeviceIcon(session.deviceInfo)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-white">{session.username}</span>
                        <Badge variant="default" className="text-xs bg-green-500 text-white">
                          Este Dispositivo
                        </Badge>
                      </div>
                      <p className="text-sm text-green-200 font-medium">
                        {getDeviceType(session.deviceInfo)}
                      </p>
                      <p className="text-xs text-green-300">
                        IP: {session.ipAddress}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs text-green-300">Activo</span>
                    </div>
                    <p className="text-xs text-green-400">
                      {formatDistanceToNow(new Date(session.lastActivity), { 
                        addSuffix: true, 
                        locale: es 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Other sessions */}
            {sessionData.sessions.filter(session => !session.isCurrentSession).length > 0 && (
              <>
                {(isExpanded || sessionData.sessions.filter(session => !session.isCurrentSession).length === 1) && (
                  <>
                    <Separator />
                    <ScrollArea className={isExpanded ? "h-64" : ""}>
                      <div className="space-y-3">
                        {sessionData.sessions
                          .filter(session => !session.isCurrentSession)
                          .slice(0, isExpanded ? undefined : 3)
                          .map((session) => (
                          <div key={session.id} className="p-4 rounded-lg border border-orange-500/50 bg-gradient-to-r from-orange-900/20 to-red-900/20">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-2 rounded-full bg-orange-500/20">
                                  {getDeviceIcon(session.deviceInfo)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm text-white">{session.username}</span>
                                    <Badge variant="outline" className="text-xs border-orange-500 text-orange-300">
                                      Otro Dispositivo
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-orange-200 font-medium">
                                    {getDeviceType(session.deviceInfo)}
                                  </p>
                                  <p className="text-xs text-orange-300">
                                    IP: {session.ipAddress}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                  <span className="text-xs text-orange-300">Conectado</span>
                                </div>
                                <p className="text-xs text-orange-400">
                                  {formatDistanceToNow(new Date(session.lastActivity), { 
                                    addSuffix: true, 
                                    locale: es 
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}

                {!isExpanded && sessionData.sessions.filter(session => !session.isCurrentSession).length > 3 && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(true)}
                      className="text-xs"
                    >
                      Ver {sessionData.sessions.filter(session => !session.isCurrentSession).length - 3} sesiones más...
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Server info */}
            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor className="h-3 w-3" />
              <span>{sessionData.sessions[0]?.serverName}</span>
              <span>•</span>
              <MapPin className="h-3 w-3" />
              <span>{sessionData.sessions[0]?.serverUrl}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SessionCounter() {
  const { data: countData, isLoading } = useQuery<{ count: number; userId: string; username: string }>({
    queryKey: ["/api/sessions/count"],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false
  });

  if (isLoading || !countData) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Users className="h-4 w-4 text-blue-500" />
      <span className="text-muted-foreground">Conectados:</span>
      <Badge variant="secondary" className="text-xs">
        {countData.count}
      </Badge>
    </div>
  );
}