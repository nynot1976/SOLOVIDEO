import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Tv, Smartphone, Copy, Check, X } from "lucide-react";
import QRCode from "qrcode";

interface QRAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRAccessModal({ open, onOpenChange }: QRAccessModalProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  // Obtener la URL de despliegue o actual
  const getDeploymentUrl = () => {
    const currentUrl = window.location.origin;
    
    // Si ya estamos en una URL de despliegue (.replit.app), usarla
    if (currentUrl.includes('.replit.app')) {
      return currentUrl;
    }
    
    // Si estamos en desarrollo (.repl.co), convertir a URL de despliegue
    if (currentUrl.includes('.repl.co')) {
      return currentUrl.replace('.repl.co', '.replit.app');
    }
    
    // Fallback a URL actual
    return currentUrl;
  };
  
  const appUrl = getDeploymentUrl();

  useEffect(() => {
    if (open) {
      generateQRCode();
    }
  }, [open]);

  const generateQRCode = async () => {
    try {
      const qrDataURL = await QRCode.toDataURL(appUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#1f2937',
          light: '#ffffff',
        },
        width: 256,
      });
      setQrCodeDataURL(qrDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-sm">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Acceso TV/Móvil</h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <p className="text-sm text-gray-400 mb-6">
            Escanea el QR para acceder desde cualquier dispositivo
          </p>

          {/* QR Code */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-4 flex justify-center">
            {qrCodeDataURL ? (
              <img 
                src={qrCodeDataURL} 
                alt="QR Code para acceso a SoloVideoClub"
                className="w-32 h-32 border-2 border-white rounded"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-600 rounded flex items-center justify-center">
                <QrCode className="h-8 w-8 text-gray-400 animate-pulse" />
              </div>
            )}
          </div>

          {/* URL */}
          <div className="bg-gray-700/50 rounded p-3 mb-4">
            <p className="text-xs text-gray-300 mb-2">URL:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-800 px-2 py-1 rounded text-blue-300 truncate">
                {appUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="border-gray-600 hover:bg-gray-600 p-1"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="space-y-3 mb-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 rounded-full p-1.5">
                <Tv className="h-3 w-3 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-white text-sm">Smart TV:</h4>
                <p className="text-xs text-gray-400">
                  Abre navegador web y navega a la URL
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-green-600 rounded-full p-1.5">
                <Smartphone className="h-3 w-3 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-white text-sm">Móvil:</h4>
                <p className="text-xs text-gray-400">
                  Escanea el código QR con la cámara
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Cerrar
            </Button>
            <Button
              onClick={generateQRCode}
              variant="outline"
              className="border-gray-600 hover:bg-gray-600 text-sm"
            >
              Regenerar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}