import { useEffect, useRef } from "preact/hooks";
import { debounce } from "../utils";
import { RefObject } from "preact";

export function useResizeObserver(
  ref: RefObject<HTMLElement>,
  callback: (entry: ResizeObserverEntry) => void,
  delay: number = 0,
) {
  const callbackRef = useRef(callback);

  // Keep callback fresh without triggering re-effect
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!ref.current) return;

    const runCallback = (entries: ResizeObserverEntry[]) => {
      if (entries[0]) {
        callbackRef.current(entries[0]);
      }
    };

    const observerCallback = delay > 0 ? debounce(runCallback, delay) : runCallback;

    const observer = new ResizeObserver(observerCallback);

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, delay]);
}
