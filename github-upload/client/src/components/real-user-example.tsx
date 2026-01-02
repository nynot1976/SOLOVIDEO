import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Server } from "lucide-react";

interface RealUserExampleProps {
  onCredentialSelect: (username: string, password: string) => void;
}

export function RealUserExample({ onCredentialSelect }: RealUserExampleProps) {
  const handleUseRealUser = () => {
    onCredentialSelect("Priscila123@gmx.e", "121235@");
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-700">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">Usuario Real del Servidor</h3>
          <Badge className="bg-green-600">Activo</Badge>
        </div>
        
        <p className="text-sm text-green-200 mb-4">
          Usa un usuario real registrado en el servidor Emby Resthree:
        </p>

        <Card className="p-4 bg-green-900/30 border-green-600">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs border-green-500 text-green-300">
                Usuario Registrado
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3 h-3 text-green-400" />
                <code className="text-green-200 font-mono text-xs bg-green-900/50 px-2 py-1 rounded">
                  Priscila123@gmx.e
                </code>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Lock className="w-3 h-3 text-green-400" />
                <code className="text-green-200 font-mono text-xs bg-green-900/50 px-2 py-1 rounded">
                  121235@
                </code>
              </div>
            </div>

            <p className="text-xs text-green-300">Usuario activo con acceso completo al servidor</p>

            <Button
              variant="outline"
              size="sm"
              onClick={handleUseRealUser}
              className="w-full border-green-500 text-green-300 hover:bg-green-500/20 hover:border-green-400"
            >
              Usar Usuario Real
            </Button>
          </div>
        </Card>

        <div className="p-3 bg-yellow-800/20 border border-yellow-700 rounded-lg">
          <p className="text-xs text-yellow-200">
            <strong>Nota:</strong> Si este usuario no funciona, es posible que las credenciales hayan cambiado en el servidor. 
            Prueba con las cuentas de demostración mientras se verifica el acceso real.
          </p>
        </div>
      </div>
    </Card>
  );
}