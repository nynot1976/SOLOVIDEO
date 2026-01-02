import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Library from "@/pages/library";
import LiveTVCollapsible from "@/pages/LiveTVCollapsible";
import TDTPage from "@/pages/tdt";
import { Settings } from "@/pages/settings";
import M3UPlayer from "@/pages/M3UPlayer";
import NotFound from "@/pages/not-found";
import { LoginForm } from "@/components/login-form";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { embyClient } from "@/lib/emby-client";
import { useTVMode, useAndroidMode } from "@/hooks/use-tv-mode";

function AuthenticatedRouter() {
  return (
    <div className="min-h-screen">
      <div className="pb-20">
        <Switch>
          <Route path="/" component={Library} />
          <Route path="/home" component={Home} />
          <Route path="/library" component={Library} />
          <Route path="/livetv" component={LiveTVCollapsible} />
          <Route path="/tdt" component={TDTPage} />
          <Route path="/m3u" component={M3UPlayer} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <MobileBottomNav />
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isTVMode } = useTVMode();
  const { isAndroid, isAndroidTV, isAndroidMobile, isAndroidTablet } = useAndroidMode();

  // Check authentication status on app load
  const { data: authStatus, isLoading } = useQuery({
    queryKey: ["/api/auth/status"],
    queryFn: () => embyClient.getAuthStatus(),
    retry: false,
  });

  useEffect(() => {
    if (authStatus?.authenticated && authStatus.user) {
      setUser(authStatus.user);
      setIsAuthenticated(true);
    } else if (authStatus?.authenticated === false) {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [authStatus]);

  const handleLoginSuccess = (userData: any) => {
    console.log('🎉 Login success, user data:', userData);
    setUser(userData);
    setIsAuthenticated(true);
    // Invalidate auth status query to refetch with authentication
    queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    // Force a refetch of auth status
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ["/api/auth/status"] });
    }, 500);
  };

  const handleLogout = async () => {
    await embyClient.logout();
    setUser(null);
    setIsAuthenticated(false);
    // Clear all cached data
    queryClient.clear();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
