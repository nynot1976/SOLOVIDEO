import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Server,
  Wifi,
  WifiOff
} from "lucide-react";

const serverSchema = z.object({
  name: z.string().min(1, "El nombre del servidor es requerido"),
  url: z.string().url("Por favor ingresa una URL válida"),
  port: z.number().min(1).max(65535, "El puerto debe estar entre 1 y 65535"),
  apiKey: z.string().min(1, "La clave API es requerida"),
});

type ServerFormData = z.infer<typeof serverSchema>;

interface Server {
  id: number;
  name: string;
  url: string;
  port: number;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
}

interface ServerManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServerManagement({ open, onOpenChange }: ServerManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: "",
      url: "https://",
      port: 8096,
      apiKey: "",
    },
  });

  // Fetch all servers
  const { data: servers = [], isLoading: isLoadingServers } = useQuery({
    queryKey: ["/api/servers"],
    queryFn: async () => {
      const response = await fetch("/api/servers");
      return response.json();
    },
    enabled: open,
  });

  // Add server mutation
  const addServerMutation = useMutation({
    mutationFn: async (data: ServerFormData) => {
      const response = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      setShowAddForm(false);
      form.reset();
      toast({
        title: "Servidor agregado",
        description: "El servidor se agregó correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el servidor",
        variant: "destructive",
      });
    },
  });

  // Update server mutation
  const updateServerMutation = useMutation({
    mutationFn: async (data: ServerFormData & { id: number }) => {
      const response = await fetch(`/api/servers/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      setEditingServer(null);
      form.reset();
      toast({
        title: "Servidor actualizado",
        description: "Los cambios se guardaron correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el servidor",
        variant: "destructive",
      });
    },
  });

  // Delete server mutation
  const deleteServerMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: "DELETE",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      toast({
        title: "Servidor eliminado",
        description: "El servidor se eliminó correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el servidor",
        variant: "destructive",
      });
    },
  });

  // Set active server mutation
  const setActiveServerMutation = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await fetch(`/api/servers/${serverId}/activate`, {
        method: "POST",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/connection/status"] });
      toast({
        title: "Servidor activado",
        description: "Se cambió al servidor seleccionado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo activar el servidor",
        variant: "destructive",
      });
    },
  });

  const handleAddServer = () => {
    setEditingServer(null);
    form.reset({
      name: "",
      url: "https://",
      port: 8096,
      apiKey: "",
    });
    setShowAddForm(true);
  };

  const handleEditServer = (server: Server) => {
    setEditingServer(server);
    form.reset({
      name: server.name,
      url: server.url,
      port: server.port,
      apiKey: server.apiKey,
    });
    setShowAddForm(true);
  };

  const onSubmit = (data: ServerFormData) => {
    if (editingServer) {
      updateServerMutation.mutate({ ...data, id: editingServer.id });
    } else {
      addServerMutation.mutate(data);
    }
  };

  const handleDeleteServer = (serverId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este servidor?")) {
      deleteServerMutation.mutate(serverId);
    }
  };

  const handleActivateServer = (serverId: number) => {
    setActiveServerMutation.mutate(serverId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="server-management-modal w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-gray-700 z-[9999]" style={{ zIndex: 99999 }}>
        <div className="max-w-full mx-auto p-4 md:p-6">
          <DialogHeader className="pb-4 text-center">
            <DialogTitle className="flex items-center justify-center space-x-2 text-white text-lg md:text-xl">
              <Server className="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">Gestión de Servidores Emby</span>
              <span className="sm:hidden">Servidores</span>
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-sm">
              Administra múltiples servidores Emby y cambia entre ellos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add Server Button */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-center sm:text-left">
              <h3 className="text-lg font-semibold text-white">Servidores Configurados</h3>
              <Button onClick={handleAddServer} className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-4 touch-manipulation mx-auto sm:mx-0">
                <Plus className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Agregar Servidor</span>
                <span className="sm:hidden">Agregar</span>
              </Button>
            </div>

          {/* Servers List */}
          {isLoadingServers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando servidores...</p>
            </div>
          ) : servers.length > 0 ? (
            <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto">
              {servers.map((server: Server) => (
                <Card key={server.id} className={`bg-gray-800 border-gray-700 ${server.isActive ? 'ring-2 ring-blue-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center space-x-2 text-white">
                        <span>{server.name}</span>
                        {server.isActive && (
                          <Badge variant="secondary" className="bg-green-900/30 text-green-300 border-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activo
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleEditServer(server)}
                          className="text-gray-400 hover:text-white h-10 w-10 p-0 touch-manipulation"
                        >
                          <Edit3 className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteServer(server.id)}
                          className="text-red-400 hover:text-red-300 h-10 w-10 p-0 touch-manipulation"
                          disabled={server.isActive}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Wifi className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{server.url}:{server.port}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">API: •••••••••</span>
                      </div>
                    </div>
                    {!server.isActive && (
                      <Button
                        onClick={() => handleActivateServer(server.id)}
                        className="w-full mt-4 h-12 bg-blue-600 hover:bg-blue-700 touch-manipulation"
                        disabled={setActiveServerMutation.isPending}
                      >
                        Activar Servidor
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <WifiOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay servidores configurados</h3>
              <p className="text-gray-400 mb-4">Agrega tu primer servidor Emby para comenzar</p>
              <Button onClick={handleAddServer} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Servidor
              </Button>
            </div>
          )}
          </div>
        </div>

        {/* Add/Edit Server Form */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-md mx-auto">
            <DialogHeader className="text-center">
              <DialogTitle className="text-white">
                {editingServer ? 'Editar Servidor' : 'Agregar Nuevo Servidor'}
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                {editingServer 
                  ? 'Modifica la configuración del servidor Emby'
                  : 'Configura la conexión a un servidor Emby'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-full mx-auto">
              <div>
                <Label htmlFor="name" className="text-white">Nombre del Servidor</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Mi Servidor Emby"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
                {form.formState.errors.name && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="url" className="text-white">URL del Servidor</Label>
                <Input
                  id="url"
                  {...form.register("url")}
                  placeholder="https://mi-servidor.com"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
                {form.formState.errors.url && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.url.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="port" className="text-white">Puerto</Label>
                <Input
                  id="port"
                  type="number"
                  {...form.register("port", { valueAsNumber: true })}
                  placeholder="8096"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
                {form.formState.errors.port && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.port.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="apiKey" className="text-white">Clave API</Label>
                <Input
                  id="apiKey"
                  type="password"
                  {...form.register("apiKey")}
                  placeholder="Tu clave API de Emby"
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
                {form.formState.errors.apiKey && (
                  <p className="text-red-400 text-sm mt-1">{form.formState.errors.apiKey.message}</p>
                )}
              </div>

              <DialogFooter className="flex justify-center gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="border-gray-600 text-white hover:bg-gray-700 flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={addServerMutation.isPending || updateServerMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                >
                  {addServerMutation.isPending || updateServerMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingServer ? 'Actualizando...' : 'Agregando...'}
                    </>
                  ) : (
                    editingServer ? 'Actualizar Servidor' : 'Agregar Servidor'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}