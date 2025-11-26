'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (qrCodeId: string) => void;
  onScanError?: (error: string) => void;
  isActive: boolean;
}

export default function QRScanner({ onScanSuccess, onScanError, isActive }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      // Stop scanner when not active
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
        setIsScanning(false);
      }
      return;
    }

    const startScanner = async () => {
      if (!containerRef.current || isScanning) return;

      try {
        setError(null);
        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Vibrate on successful scan (if supported)
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
            onScanSuccess(decodedText);
          },
          () => {
            // QR code not detected - ignore
          }
        );
        setIsScanning(true);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
        setError(errorMessage);
        onScanError?.(errorMessage);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isActive, isScanning, onScanSuccess, onScanError]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden">
        <div id="qr-reader" ref={containerRef} className="w-full h-full" />

        {/* Scanning overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-[3px] border-white/30 rounded-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-yellow-400 rounded-lg">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-center">
          <p className="font-semibold">Camera Error</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-xs mt-2 text-red-300">Make sure camera permissions are granted</p>
        </div>
      )}

      <p className="mt-4 text-gray-400 text-center text-sm">
        Point camera at QR code on equipment
      </p>
    </div>
  );
}
