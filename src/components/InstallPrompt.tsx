'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallContextType {
  canInstall: boolean;
  isInstalled: boolean;
  triggerInstall: () => Promise<void>;
}

const InstallContext = createContext<InstallContextType>({
  canInstall: false,
  isInstalled: false,
  triggerInstall: async () => {},
});

export const useInstall = () => useContext(InstallContext);

// Global variable to store the deferred prompt
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function InstallProvider({ children }: { children: ReactNode }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      globalDeferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!globalDeferredPrompt) return;

    await globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    globalDeferredPrompt = null;
  };

  return (
    <InstallContext.Provider value={{ canInstall, isInstalled, triggerInstall }}>
      {children}
    </InstallContext.Provider>
  );
}

export default function InstallPrompt() {
  const { canInstall, isInstalled, triggerInstall } = useInstall();
  const [showPrompt, setShowPrompt] = useState(true);

  // Don't auto-show after first dismiss in session
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('installPromptDismissed')) {
      setShowPrompt(false);
    }
  }, []);

  const handleInstall = async () => {
    await triggerInstall();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  // Don't show if already installed, can't install, or dismissed
  if (isInstalled || !canInstall || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 animate-slide-up">
      <div className="bg-gray-800 border border-yellow-500/50 rounded-2xl p-4 shadow-lg shadow-yellow-500/10">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white">Install SiteTally</h3>
            <p className="text-sm text-gray-400 mt-1">
              Add to your home screen for quick access
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-300 p-1"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold rounded-lg transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
