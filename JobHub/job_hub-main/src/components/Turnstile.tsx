import { useEffect, useRef, useCallback } from "react";

/**
 * Cloudflare Turnstile CAPTCHA widget.
 *
 * Renders an invisible/managed Turnstile challenge and calls `onToken`
 * when the user passes verification. The token is then passed to
 * Supabase's `signInWithPassword` / `signUp` as `options.captchaToken`.
 *
 * IMPORTANT: Set VITE_TURNSTILE_SITE_KEY in your .env (or replace the
 * fallback below with your actual site key from Cloudflare dashboard).
 */

// Site key — set VITE_TURNSTILE_SITE_KEY in your .env
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileProps {
  onToken: (token: string) => void;
  /** Call this ref function to reset the widget (e.g. after a failed attempt) */
  resetRef?: React.MutableRefObject<(() => void) | null>;
}

export default function Turnstile({ onToken, resetRef }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // Clean up any existing widget
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // widget might already be gone
      }
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => {
        onToken(token);
      },
      "expired-callback": () => {
        onToken(""); // force re-solve
      },
      theme: "dark",
      appearance: "interaction-only", // only shows if suspicious
    });
  }, [onToken]);

  // Expose reset to parent
  useEffect(() => {
    if (resetRef) {
      resetRef.current = () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          onToken(""); // clear stale token
        }
      };
    }
  }, [resetRef, onToken]);

  useEffect(() => {
    // Turnstile script may still be loading — poll until it's ready
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval);
        renderWidget();
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // cleanup
        }
      }
    };
  }, [renderWidget]);

  return <div ref={containerRef} className="flex justify-center my-2" />;
}
