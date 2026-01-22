import { useEffect, RefObject } from "preact/hooks";

export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: (event: MouseEvent) => void,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener as any);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener as any);
    };
  }, [ref, handler, enabled]);
}
