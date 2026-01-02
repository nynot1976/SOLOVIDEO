import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Library from "@/pages/library";
import NotFound from "@/pages/not-found";
import { LoginForm } from "@/components/login-form";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { embyClient } from "@/lib/emby-client";

function AuthenticatedRouter() {
  return (
    <div className="min-h-screen">
      <div className="pb-20">
        <Switch>
          <Route path="/" component={Library} />
          <Route path="/home" component={Home} />
          <Route path="/library" component={Library} />
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
    setUser(userData);
    setIsAuthenticated(true);
    queryClient.invalidateQueries();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Cargando SoloVideoClub...</div>
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
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;