import { useEffect } from "preact/hooks";

// Minimal focus trap: keeps Tab navigation cycling within the provided ref when enabled.
export function useFocusTrap(ref: { current: HTMLElement | null } | null, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !ref || !ref.current) return;
    const el = ref.current;
    const selector =
      'a[href], area[href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(el.querySelectorAll<HTMLElement>(selector)).filter(Boolean);

    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [ref, enabled]);
}
