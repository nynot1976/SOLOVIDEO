import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, User, Lock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DemoCredentialsProps {
  onCredentialSelect: (username: string, password: string) => void;
}

export function DemoCredentials({ onCredentialSelect }: DemoCredentialsProps) {
  const { toast } = useToast();

  const demoAccounts = [
    { 
      username: 'demo', 
      password: 'demo', 
      description: 'Cuenta básica de demostración',
      type: 'Básico'
    },
    { 
      username: 'admin', 
      password: 'admin', 
      description: 'Cuenta de administrador',
      type: 'Admin'
    },
    { 
      username: 'user', 
      password: '123', 
      description: 'Usuario estándar',
      type: 'Usuario'
    },
    { 
      username: 'test', 
      password: 'test', 
      description: 'Cuenta de pruebas',
      type: 'Test'
    },
    { 
      username: 'guest', 
      password: 'guest123', 
      description: 'Invitado con acceso limitado',
      type: 'Invitado'
    },
    { 
      username: 'viewer', 
      password: 'viewer', 
      description: 'Solo visualización',
      type: 'Visor'
    }
  ];

  const handleCopyCredentials = (username: string, password: string) => {
    navigator.clipboard.writeText(`${username} / ${password}`);
    toast({
      title: "Credenciales copiadas",
      description: "Usuario y contraseña copiados al portapapeles",
      duration: 2000,
    });
  };

  const handleUseCredentials = (username: string, password: string) => {
    onCredentialSelect(username, password);
    toast({
      title: "Credenciales aplicadas",
      description: `Usando cuenta: ${username}`,
      duration: 2000,
    });
  };

  return (
    <Card className="p-6 bg-gray-800 border-gray-700">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Credenciales de Demostración</h3>
        </div>
        
        <p className="text-sm text-gray-400 mb-4">
          Usa cualquiera de estas cuentas para probar la aplicación:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {demoAccounts.map((account) => (
            <Card key={account.username} className="p-4 bg-gray-900 border-gray-600 hover:border-blue-500 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {account.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCredentials(account.username, account.password)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3 h-3 text-blue-400" />
                    <code className="text-blue-300 font-mono">{account.username}</code>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="w-3 h-3 text-green-400" />
                    <code className="text-green-300 font-mono">{account.password}</code>
                  </div>
                </div>

                <p className="text-xs text-gray-500">{account.description}</p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUseCredentials(account.username, account.password)}
                  className="w-full text-xs border-gray-600 hover:border-blue-500 hover:bg-blue-500/10"
                >
                  Usar Esta Cuenta
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
            <p className="text-xs text-green-300">
              ✅ <strong>Usuarios Reales:</strong> Puedes usar cualquier usuario registrado en el servidor Emby, 
              como "Priscila123@gmx.e" con contraseña "121235@".
            </p>
          </div>
          <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <p className="text-xs text-blue-300">
              💡 <strong>Demostración:</strong> Si no tienes usuario real, usa las cuentas de demostración arriba.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}