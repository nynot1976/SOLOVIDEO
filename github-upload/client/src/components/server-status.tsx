import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Server, Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { embyClient } from "@/lib/emby-client";

export function ServerStatus() {
  const { data: connectionStatus, isLoading, refetch } = useQuery({
    queryKey: ["/api/connection/status"],
    queryFn: () => embyClient.getConnectionStatus(),
    refetchInterval: 10000, // Check every 10 seconds
  });

  return (
    <Card className="p-4 bg-gray-800 border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-medium text-white">Estado del Servidor</h3>
            <p className="text-xs text-gray-400">
              {connectionStatus?.serverUrl || 'Desconocido'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <Badge variant="secondary" className="gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Verificando...
            </Badge>
          ) : connectionStatus?.connected ? (
            <Badge className="bg-green-600 gap-1">
              <Wifi className="w-3 h-3" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="w-3 h-3" />
              Desconectado
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {connectionStatus?.connected && (
        <div className="mt-3 text-xs text-green-300">
          ✅ Servidor: {connectionStatus.serverName}
        </div>
      )}

      {!connectionStatus?.connected && !isLoading && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-800 rounded text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Sin conexión al servidor. Las credenciales reales de Emby no funcionarán.
            Usa las cuentas de demostración disponibles.
          </span>
        </div>
      )}
    </Card>
  );
}