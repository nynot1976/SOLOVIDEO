import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Lock, PlayCircle, Server, QrCode, Tv } from "lucide-react";
import { embyClient, type LoginCredentials } from "@/lib/emby-client";
import { QRAccessModal } from "./qr-access-modal";
import soloVideoClubLogo from "@assets/Leonardo_Phoenix_10_Create_a_stunning_3D_image_for_the_SoloVid_0_1750527137773.jpg";

const loginSchema = z.object({
  serverType: z.string().min(1, "El tipo de servidor es requerido"),
  serverUrl: z.string().min(1, "La dirección del servidor es requerida"),
  port: z.number().min(1, "Puerto inválido").max(65535, "Puerto inválido"),
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      serverType: "jellyfin",
      serverUrl: "",
      port: 8096,
      username: "",
      password: "",
    },
  });

  const watchedServerType = watch("serverType");

  // Query para obtener tipos de servidor soportados
  const { data: serverTypes = [] } = useQuery({
    queryKey: ["/api/servers/types"],
  });

  // Actualizar puerto cuando cambie el tipo de servidor
  const handleServerTypeChange = (serverType: string) => {
    setValue("serverType", serverType);
    const serverTypeInfo = (serverTypes as any[]).find((type: any) => type.value === serverType);
    if (serverTypeInfo) {
      setValue("port", serverTypeInfo.defaultPort);
    }
  };

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => embyClient.login(credentials),
    onSuccess: (result) => {
      if (result.success && result.user) {
        setError(null);
        onLoginSuccess(result.user);
      } else {
        setError(result.error || "Error de autenticación");
      }
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : "Error de conexión");
    },
  });

  const onSubmit = (data: LoginFormData) => {
    setError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src={soloVideoClubLogo} 
              alt="SoloVideoClub" 
              className="h-20 w-20 rounded-xl object-cover shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SoloVideoClub</h1>
          <p className="text-gray-400">Accede a tu biblioteca multimedia</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center text-gray-400">
              Configura tu servidor de medios y credenciales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Tipo de Servidor - Usando select nativo para mejor compatibilidad Android */}
              <div className="space-y-2">
                <Label htmlFor="serverType" className="text-white flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Tipo de Servidor
                </Label>
                <select
                  value={watchedServerType}
                  onChange={(e) => handleServerTypeChange(e.target.value)}
                  className="w-full h-10 px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="" disabled>Selecciona el tipo de servidor</option>
                  {(serverTypes as any[]).map((type: any) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.serverType && (
                  <p className="text-sm text-red-400">{errors.serverType.message}</p>
                )}
              </div>

              {/* Servidor */}
              <div className="space-y-2">
                <Label htmlFor="serverUrl" className="text-white flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Dirección del Servidor
                </Label>
                <Input
                  {...register("serverUrl")}
                  id="serverUrl"
                  placeholder="http://tu-servidor.com o https://tu-servidor.com"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={loginMutation.isPending}
                />
                {errors.serverUrl && (
                  <p className="text-sm text-red-400">{errors.serverUrl.message}</p>
                )}
              </div>

              {/* Puerto */}
              <div className="space-y-2">
                <Label htmlFor="port" className="text-white">
                  Puerto
                </Label>
                <Input
                  {...register("port", { valueAsNumber: true })}
                  id="port"
                  type="number"
                  placeholder="8096"
                  min="1"
                  max="65535"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={loginMutation.isPending}
                />
                {errors.port && (
                  <p className="text-sm text-red-400">{errors.port.message}</p>
                )}
              </div>

              {/* Usuario */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">
                  Usuario
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    {...register("username")}
                    id="username"
                    placeholder="Tu nombre de usuario"
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    disabled={loginMutation.isPending}
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-red-400">{errors.username.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    {...register("password")}
                    id="password"
                    type="password"
                    placeholder="Tu contraseña"
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    disabled={loginMutation.isPending}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <Alert className="bg-red-900/20 border-red-700">
                  <AlertDescription className="text-red-300">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-800 px-2 text-gray-400">o accede desde</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowQRModal(true)}
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Tv className="mr-2 h-4 w-4" />
                Smart TV / Móvil (QR)
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-gray-400 text-sm">
          <p>SoloVideoClub</p>
          <p className="text-xs text-gray-500 mt-1">
            Sistema de streaming multimedia
          </p>
        </div>
      </div>

      {/* Modal QR */}
      <QRAccessModal open={showQRModal} onOpenChange={setShowQRModal} />
    </div>
  );
}