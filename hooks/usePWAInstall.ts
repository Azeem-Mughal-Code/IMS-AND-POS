import { useState, useEffect } from 'react';

/**
 * A custom hook to manage the PWA installation prompt.
 * It encapsulates the logic for listening to the `beforeinstallprompt` event,
 * handling user interaction, and providing state for the UI.
 */
export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

    useEffect(() => {
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(standalone);

        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        // If app is already installed (standalone), don't show the prompt.
        if (standalone) return;

        const handleDeferredPromptReady = () => {
            console.log("usePWAInstall: deferred-prompt-ready event received.");
            setDeferredPrompt((window as any).deferredPrompt);
        };

        const handleAppInstalled = () => {
            console.log("usePWAInstall: appinstalled event received.");
            setDeferredPrompt(null);
        };

        // Check if the prompt event is already available on mount
        if ((window as any).deferredPrompt) {
            handleDeferredPromptReady();
        }

        window.addEventListener('deferred-prompt-ready', handleDeferredPromptReady);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('deferred-prompt-ready', handleDeferredPromptReady);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        // For iOS, or if prompt isn't ready, show manual instructions modal.
        if (isIOS || !deferredPrompt) {
            setIsInstallModalOpen(true);
            return;
        }
        
        // Show the browser's install prompt.
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        
        // Hide the button if the user accepts. The 'appinstalled' event will also handle this.
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const isInstallable = !isStandalone && (!!deferredPrompt || isIOS);

    return {
        isInstallable,
        isInstallModalOpen,
        isIOS,
        handleInstallClick,
        closeInstallModal: () => setIsInstallModalOpen(false),
    };
};
