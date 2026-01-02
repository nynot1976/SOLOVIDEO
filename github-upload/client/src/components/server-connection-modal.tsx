import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plug, Check } from "lucide-react";
import { embyClient } from "@/lib/emby-client";

const serverSchema = z.object({
  name: z.string().min(1, "El nombre del servidor es requerido"),
  url: z.string().url("Por favor ingresa una URL válida"),
  port: z.number().min(1).max(65535, "El puerto debe estar entre 1 y 65535"),
  apiKey: z.string().min(1, "La clave API es requerida"),
});

type ServerFormData = z.infer<typeof serverSchema>;

interface ServerConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServerConnectionModal({ open, onOpenChange }: ServerConnectionModalProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: "Servidor Principal",
      url: "http://192.168.1.100",
      port: 8096,
      apiKey: "",
    },
  });

  const connectMutation = useMutation({
    mutationFn: (data: ServerFormData) => embyClient.connectToServer(data),
    onSuccess: () => {
      toast({
        title: "Conexión Exitosa",
        description: "Conectado exitosamente al servidor Emby",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/connection/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/media/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/media/continue"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Falló la Conexión",
        description: error.error || "No se pudo conectar al servidor",
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = async () => {
    const formData = form.getValues();
    const validation = serverSchema.safeParse(formData);
    
    if (!validation.success) {
      toast({
        title: "Formulario Inválido",
        description: "Por favor completa todos los campos requeridos correctamente",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await embyClient.testConnection(validation.data);
      
      if (result.connected) {
        toast({
          title: "Conexión Exitosa",
          description: `Conectado exitosamente a ${result.serverName}`,
        });
      } else {
        toast({
          title: "Falló la Conexión",
          description: result.error || "No se pudo conectar al servidor",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Falló la Prueba de Conexión",
        description: "Ocurrió un error al probar la conexión",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = (data: ServerFormData) => {
    connectMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Conectar al Servidor Emby</DialogTitle>
          <DialogDescription className="text-gray-400">
            Ingresa los detalles de tu servidor Emby para conectarte y comenzar a reproducir tu contenido.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-300">Nombre del Servidor</Label>
            <Input
              id="name"
              {...form.register("name")}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              placeholder="Mi Servidor Emby"
            />
            {form.formState.errors.name && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="url" className="text-gray-300">URL del Servidor</Label>
            <Input
              id="url"
              {...form.register("url")}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              placeholder="http://192.168.1.100"
            />
            {form.formState.errors.url && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.url.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="port" className="text-gray-300">Puerto</Label>
            <Input
              id="port"
              type="number"
              {...form.register("port", { valueAsNumber: true })}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              placeholder="8096"
            />
            {form.formState.errors.port && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.port.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="apiKey" className="text-gray-300">Clave API</Label>
            <Input
              id="apiKey"
              type="password"
              {...form.register("apiKey")}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              placeholder="Ingresa tu clave API"
            />
            {form.formState.errors.apiKey && (
              <p className="text-red-400 text-sm mt-1">{form.formState.errors.apiKey.message}</p>
            )}
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button"
              variant="secondary"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
            >
              {isTestingConnection ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plug className="w-4 h-4 mr-2" />
              )}
              Probar Conexión
            </Button>
            <Button 
              type="submit"
              disabled={connectMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {connectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Conectar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
