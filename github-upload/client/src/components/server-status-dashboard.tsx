import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Server, 
  Activity, 
  Wifi, 
  WifiOff, 
  Clock, 
  Users, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ServerStatus {
  id: number;
  name: string;
  url: string;
  port: number;
  isActive: boolean;
  isOnline: boolean;
  responseTime: number;
  lastChecked: string;
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeUsers: number;
    totalLibraries: number;
    totalItems: number;
  };
  error?: string;
}

interface DashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServerStatusDashboard({ open, onOpenChange }: DashboardProps) {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const queryClient = useQueryClient();

  const { data: servers = [], isLoading, error } = useQuery({
    queryKey: ["/api/servers/status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/servers/status");
      return await response.json();
    },
    refetchInterval: refreshInterval,
    enabled: open,
  });

  const activateServerMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await apiRequest("POST", `/api/servers/${serverId}/activate`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers/status"] });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await apiRequest("POST", `/api/servers/${serverId}/test`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers/status"] });
    },
  });

  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/servers/refresh-all");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers/status"] });
    },
  });

  const getStatusColor = (server: ServerStatus) => {
    if (!server.isOnline) return "text-red-500";
    if (server.responseTime > 2000) return "text-yellow-500";
    return "text-green-500";
  };

  const getStatusIcon = (server: ServerStatus) => {
    if (!server.isOnline) return <XCircle className="h-4 w-4 text-red-500" />;
    if (server.responseTime > 2000) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  const formatLastChecked = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Ahora mismo";
    if (minutes < 60) return `Hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 md:p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-6xl max-h-[95vh] md:max-h-[90vh] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 md:p-6 border-b border-gray-700 gap-3">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-white">
              <span className="hidden sm:inline">Panel de Estado del Servidor</span>
              <span className="sm:hidden">Estado del Servidor</span>
            </h2>
            <p className="text-gray-400 text-sm">Monitoreo en tiempo real de servidores Emby</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refreshAllMutation.mutate()}
              disabled={refreshAllMutation.isPending}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 h-10 px-3 touch-manipulation"
            >
              <RefreshCw className={`h-5 h-5 mr-2 ${refreshAllMutation.isPending ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar Todo</span>
              <span className="sm:hidden">Actualizar</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white h-10 w-10 p-0 touch-manipulation"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <Alert className="mb-6 bg-red-900/20 border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300">
                Error al cargar el estado de los servidores: {error.message}
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando estado de servidores...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {servers.map((server: ServerStatus) => (
                <Card key={server.id} className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-gray-400" />
                        <CardTitle className="text-lg text-white">{server.name}</CardTitle>
                        {server.isActive && (
                          <Badge variant="secondary" className="bg-blue-600 text-white">
                            Activo
                          </Badge>
                        )}
                      </div>
                      {getStatusIcon(server)}
                    </div>
                    <CardDescription className="text-gray-400">
                      {server.url}:{server.port}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Connection Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {server.isOnline ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${getStatusColor(server)}`}>
                          {server.isOnline ? "En línea" : "Desconectado"}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {server.isOnline ? formatResponseTime(server.responseTime) : "N/A"}
                      </span>
                    </div>

                    {/* Last Checked */}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>Última verificación: {formatLastChecked(server.lastChecked)}</span>
                    </div>

                    {/* Error Message */}
                    {server.error && (
                      <Alert className="bg-red-900/20 border-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-300 text-sm">
                          {server.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Server Metrics */}
                    {server.metrics && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-300">Métricas del Servidor</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400 flex items-center gap-1">
                                <Cpu className="h-3 w-3" />
                                CPU
                              </span>
                              <span className="text-white">{server.metrics.cpuUsage}%</span>
                            </div>
                            <Progress value={server.metrics.cpuUsage} className="h-1" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400 flex items-center gap-1">
                                <MemoryStick className="h-3 w-3" />
                                RAM
                              </span>
                              <span className="text-white">{server.metrics.memoryUsage}%</span>
                            </div>
                            <Progress value={server.metrics.memoryUsage} className="h-1" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400 flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                Disco
                              </span>
                              <span className="text-white">{server.metrics.diskUsage}%</span>
                            </div>
                            <Progress value={server.metrics.diskUsage} className="h-1" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Usuarios
                              </span>
                              <span className="text-white">{server.metrics.activeUsers}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-white">{server.metrics.totalLibraries}</div>
                            <div className="text-xs text-gray-400">Bibliotecas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-white">{server.metrics.totalItems.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Elementos</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnectionMutation.mutate(server.id)}
                        disabled={testConnectionMutation.isPending}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Activity className="h-3 w-3 mr-1" />
                        Probar
                      </Button>
                      
                      {!server.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => activateServerMutation.mutate(server.id)}
                          disabled={activateServerMutation.isPending}
                          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Activar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {servers.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <Server className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No hay servidores configurados</h3>
              <p className="text-gray-400">
                Configura tu primer servidor Emby para comenzar a monitorear su estado.
              </p>
            </div>
          )}
        </div>

        {/* Refresh Settings */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Actualización automática</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            >
              <option value={10000}>10 segundos</option>
              <option value={30000}>30 segundos</option>
              <option value={60000}>1 minuto</option>
              <option value={300000}>5 minutos</option>
              <option value={0}>Desactivado</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}