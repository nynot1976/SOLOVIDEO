import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlayCircle, Home, Library, User, LogOut, Server, Activity, Tv, Monitor, Radio } from "lucide-react";
import { embyClient } from "@/lib/emby-client";
import { ServerManagement } from "./server-management";
import { ServerStatusDashboard } from "./server-status-dashboard";
import { SessionCounter } from "./active-sessions";
import { DevicesModal } from "./devices-modal";
import { queryClient } from "@/lib/queryClient";

const ADMIN_USERNAME = "Nynot@1976";

export function Header() {
  const [showServerManagement, setShowServerManagement] = useState(false);
  const [showStatusDashboard, setShowStatusDashboard] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [location] = useLocation();

  const { data: connectionStatus } = useQuery({
    queryKey: ["/api/connection/status"],
    queryFn: () => embyClient.getConnectionStatus(),
    refetchInterval: 30000, // Check every 30 seconds
  });

  const { data: authStatus } = useQuery({
    queryKey: ["/api/auth/status"],
    queryFn: () => embyClient.getAuthStatus(),
    refetchInterval: 30000,
  });

  const logoutMutation = useMutation({
    mutationFn: () => embyClient.logout(),
    onSuccess: () => {
      queryClient.clear();
      localStorage.removeItem('solovideo-auth');
      localStorage.removeItem('solovideo-session');
      window.location.href = '/';
    },
  });

  const isAdmin = authStatus?.user?.name === ADMIN_USERNAME;

  return (
    <>
      <header className="bg-gray-800 border-b border-gray-700 px-3 py-4 md:px-6 md:py-4 safe-area-inset-top">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 md:space-x-6">
            <Link href="/" className="flex items-center space-x-2 md:space-x-3 hover:opacity-80 transition-opacity touch-manipulation p-2 -m-2 rounded-lg">
              <PlayCircle className="h-7 w-7 md:h-8 md:w-8 text-blue-500" />
              <h1 className="text-lg md:text-xl font-semibold text-white hidden xs:block">SoloVideoClub</h1>
              <h1 className="text-base font-semibold text-white xs:hidden">Solo</h1>
            </Link>
            
            {/* Desktop Navigation - Visible only on desktop */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link href="/">
                <Button 
                  variant={location === "/" || location.startsWith("/library") ? "secondary" : "ghost"}
                  size="sm"
                  className="text-white hover:bg-gray-700"
                >
                  <Library className="w-4 h-4 mr-2" />
                  Biblioteca
                </Button>
              </Link>
              
              <Link href="/home">
                <Button 
                  variant={location === "/home" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-white hover:bg-gray-700"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Inicio
                </Button>
              </Link>
              
              <Link href="/livetv">
                <Button 
                  variant={location.startsWith("/livetv") ? "secondary" : "ghost"}
                  size="sm"
                  className="text-white hover:bg-gray-700"
                >
                  <Tv className="w-4 h-4 mr-2" />
                  TV en Vivo
                </Button>
              </Link>
              
              <Link href="/tdt">
                <Button 
                  variant={location.startsWith("/tdt") ? "secondary" : "ghost"}
                  size="sm"
                  className="text-white hover:bg-gray-700"
                >
                  <Radio className="w-4 h-4 mr-2" />
                  TDT España
                </Button>
              </Link>
            </nav>

          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Connection Status - Hidden on Mobile */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus?.connected 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-300">
                  {connectionStatus?.connected 
                    ? `Conectado a ${connectionStatus.serverName || 'Servidor'}`
                    : 'No conectado'
                  }
                </span>
              </div>
              {/* Session Counter */}
              {connectionStatus?.connected && <SessionCounter />}
            </div>
            
            {/* Mobile Connection Indicator */}
            <div className="md:hidden flex items-center">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus?.connected 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-red-500'
              }`} />
            </div>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary"
                  className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600 h-12 px-3 md:px-4 touch-manipulation"
                >
                  <User className="w-5 h-5 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">{authStatus?.user?.name || 'Usuario'}</span>
                  <span className="sm:hidden">Menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-gray-800 border-gray-700 w-56 md:w-64 p-2"
                sideOffset={8}
              >
                {isAdmin && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => setShowStatusDashboard(true)}
                      className="text-white hover:bg-gray-700 cursor-pointer px-3 py-3 md:py-2 text-sm rounded-md touch-manipulation"
                      data-testid="menu-server-status"
                    >
                      <Activity className="w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2" />
                      Estado del Servidor
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowServerManagement(true)}
                      className="text-white hover:bg-gray-700 cursor-pointer px-3 py-3 md:py-2 text-sm rounded-md touch-manipulation"
                      data-testid="menu-server-management"
                    >
                      <Server className="w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2" />
                      Gestionar Servidores
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setShowDevicesModal(true)}
                      className="text-white hover:bg-gray-700 cursor-pointer px-3 py-3 md:py-2 text-sm rounded-md touch-manipulation"
                      data-testid="menu-connected-devices"
                    >
                      <Monitor className="w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2" />
                      Dispositivos Conectados
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  className="text-white hover:bg-gray-700 cursor-pointer px-3 py-3 md:py-2 text-sm rounded-md touch-manipulation"
                  disabled={logoutMutation.isPending}
                  data-testid="menu-logout"
                >
                  <LogOut className="w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <ServerManagement 
        open={showServerManagement}
        onOpenChange={setShowServerManagement}
      />
      
      <ServerStatusDashboard
        open={showStatusDashboard}
        onOpenChange={setShowStatusDashboard}
      />
      
      <DevicesModal
        isOpen={showDevicesModal}
        onClose={() => setShowDevicesModal(false)}
      />
    </>
  );
}
