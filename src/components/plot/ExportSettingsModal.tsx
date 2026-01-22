import { ResolutionControl } from "./ResolutionControl";
import { useRef, useEffect } from "preact/hooks";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  onReset: () => void;
}

export function ExportSettingsModal({
  isOpen,
  onClose,
  scale,
  onScaleChange,
  onReset,
}: ExportSettingsModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const prevActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    prevActive.current = document.activeElement as HTMLElement | null;
    setTimeout(() => {
      const first = modalRef.current?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
      );
      first?.focus();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevActive.current?.focus();
    };
  }, [isOpen, onClose]);

  // Keep Tab navigation inside modal while open
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="modal-content"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-settings-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--bg-color, #fff)",
          color: "var(--text-color, #000)",
          padding: "20px",
          borderRadius: "8px",
          minWidth: "300px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h3 id="export-settings-dialog" style={{ marginTop: 0 }}>Export Settings</h3>
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Resolution Scale
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "5px",
            }}
          >
            <ResolutionControl scale={scale} onScaleChange={onScaleChange} style={{ flex: 1 }} />
          </div>
          <p style={{ fontSize: "0.85em", color: "var(--text-secondary)" }}>
            Higher values increase image quality but file size as well. Default is 2x.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "20px",
          }}
        >
          <button
            onClick={onReset}
            className="secondary-button"
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "1px solid var(--text-secondary, #ccc)",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-color, #000)",
            }}
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="primary-button"
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              background: "#4caf50",
              color: "white",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
