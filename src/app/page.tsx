'use client';

import { useState, useCallback } from 'react';
import QRScanner from '@/components/QRScanner';
import AssetStatus from '@/components/AssetStatus';
import ActionForm from '@/components/ActionForm';
import SuccessScreen from '@/components/SuccessScreen';

// Temporary: Using Tom Worker's ID for testing
// In production, this would come from auth
const TEMP_USER_ID = 'bda51c0b-2d51-4212-ad32-9dc5d43cec7a';

type AppState = 'scanning' | 'loading' | 'review' | 'success' | 'error';

interface Asset {
  asset_id: string;
  asset_name: string;
  qr_code_id: string;
  description?: string;
  purchase_cost?: string;
  current_status: 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE' | 'RETIRED';
  last_checked_out_by_id?: string;
  last_checkout_time?: string;
  current_location?: string;
  checked_out_by_name?: string;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('scanning');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [lastAction, setLastAction] = useState<'checkout' | 'checkin' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanSuccess = useCallback(async (qrCodeId: string) => {
    setAppState('loading');
    setError(null);

    try {
      const response = await fetch(`/api/asset/${encodeURIComponent(qrCodeId)}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Asset not found');
        setAppState('error');
        return;
      }

      setAsset(data.data);
      setAppState('review');
    } catch {
      setError('Network error. Please check your connection.');
      setAppState('error');
    }
  }, []);

  const handleActionSuccess = useCallback((action: 'checkout' | 'checkin', updatedAsset: Asset) => {
    setAsset(updatedAsset);
    setLastAction(action);
    setAppState('success');
  }, []);

  const handleActionError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setAppState('error');
  }, []);

  const resetToScanning = useCallback(() => {
    setAppState('scanning');
    setAsset(null);
    setLastAction(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-yellow-400">Site</span>Tally
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {/* Scanning State */}
        {appState === 'scanning' && (
          <div className="flex flex-col items-center">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Scan Equipment</h2>
              <p className="text-gray-400">Point your camera at the QR code</p>
            </div>
            <QRScanner
              onScanSuccess={handleScanSuccess}
              isActive={appState === 'scanning'}
            />

            {/* Manual Entry Option */}
            <div className="mt-8 w-full">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-500">or enter code manually</span>
                </div>
              </div>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem('qrCode') as HTMLInputElement;
                  if (input.value.trim()) {
                    handleScanSuccess(input.value.trim());
                  }
                }}
              >
                <input
                  name="qrCode"
                  type="text"
                  placeholder="Enter QR code ID"
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors"
                >
                  Go
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Loading State */}
        {appState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Looking up asset...</p>
          </div>
        )}

        {/* Review State */}
        {appState === 'review' && asset && (
          <>
            <AssetStatus asset={asset} onBack={resetToScanning} />
            <ActionForm
              asset={asset}
              userId={TEMP_USER_ID}
              onSuccess={handleActionSuccess}
              onError={handleActionError}
            />
          </>
        )}

        {/* Success State */}
        {appState === 'success' && asset && lastAction && (
          <SuccessScreen
            action={lastAction}
            asset={asset}
            onScanAnother={resetToScanning}
          />
        )}

        {/* Error State */}
        {appState === 'error' && (
          <div className="flex flex-col items-center py-10">
            <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-gray-400 text-center mb-6">{error}</p>
            <button
              onClick={resetToScanning}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 py-3 px-4">
        <div className="max-w-md mx-auto flex items-center justify-between text-xs text-gray-500">
          <span>SiteTally v1.0</span>
          <span>Field Worker Mode</span>
        </div>
      </footer>
    </div>
  );
}
