import { Link, useLocation } from "wouter";
import { Home, Library, User, Settings, Play, Tv, Radio } from "lucide-react";

export function MobileBottomNav() {
  const [location] = useLocation();

  const navItems = [
    {
      href: "/",
      icon: Library,
      label: "Biblioteca",
      isActive: location === "/" || location.startsWith("/library")
    },
    {
      href: "/home",
      icon: Home,
      label: "Inicio",
      isActive: location === "/home"
    },
    {
      href: "/livetv",
      icon: Tv,
      label: "TV en Vivo",
      isActive: location.startsWith("/livetv")
    },
    {
      href: "/tdt",
      icon: Radio,
      label: "TDT España",
      isActive: location.startsWith("/tdt")
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Config",
      isActive: location.startsWith("/settings")
    }
  ];

  return (
    <nav className="mobile-nav-bottom bg-gray-800/95 backdrop-blur-md border-t border-gray-700 safe-area-inset-bottom">
      <div className="grid grid-cols-5 h-20 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex flex-col items-center justify-center h-full px-2 transition-all duration-200 touch-manipulation active:scale-95 ${
                  item.isActive 
                    ? "text-blue-400 bg-blue-900/40" 
                    : "text-gray-300 hover:text-white active:bg-gray-700/50"
                }`}
              >
                <div className={`p-1 rounded-lg ${item.isActive ? "bg-blue-500/20" : ""}`}>
                  <Icon className={`w-6 h-6 ${item.isActive ? "text-blue-400" : "text-gray-300"}`} />
                </div>
                <span className={`text-xs font-medium mt-1 ${item.isActive ? "text-blue-400" : "text-gray-300"}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}