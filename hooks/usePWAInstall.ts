
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
        // Check standalone status
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(standalone);

        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        if (standalone) return;

        // Handler to update state
        const handleDeferredPromptReady = () => {
            console.log("usePWAInstall: deferred-prompt-ready detected.");
            setDeferredPrompt((window as any).deferredPrompt);
        };

        const handleAppInstalled = () => {
            console.log("usePWAInstall: appinstalled detected.");
            setDeferredPrompt(null);
        };

        // 1. Check if event already happened before this component mounted
        if ((window as any).deferredPrompt) {
            handleDeferredPromptReady();
        }

        // 2. Listen for future events
        window.addEventListener('deferred-prompt-ready', handleDeferredPromptReady);
        window.addEventListener('appinstalled', handleAppInstalled);

        // Debug log for secure context issues
        if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            console.warn("PWA install requires a secure context (HTTPS). Current context is insecure.");
        }

        return () => {
            window.removeEventListener('deferred-prompt-ready', handleDeferredPromptReady);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        // If on iOS, or if the prompt isn't ready (which might happen if browser hasn't fired it yet),
        // show the manual instructions.
        if (isIOS || !deferredPrompt) {
            setIsInstallModalOpen(true);
            return;
        }
        
        try {
            // Show the browser's install prompt.
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } catch (e) {
            console.error("Install prompt failed:", e);
            // Fallback to manual instructions if prompt() throws (e.g., user interaction required)
            setIsInstallModalOpen(true);
        }
    };

    // Only show install button if not standalone AND (we have the prompt event OR we are on iOS).
    // If the app is installed, browsers usually won't fire the prompt event, so deferredPrompt stays null.
    const isInstallable = !isStandalone && (isIOS || !!deferredPrompt);

    return {
        isInstallable,
        isInstallModalOpen,
        isIOS,
        handleInstallClick,
        closeInstallModal: () => setIsInstallModalOpen(false),
    };
};
