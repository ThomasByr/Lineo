import { useState, useEffect, useRef } from "preact/hooks";
import { Toggle } from "../ui/Toggle";
import { RangeInput } from "../ui/RangeInput";
import { ResolutionControl } from "./ResolutionControl";

interface ExportOptions {
  format: "png" | "jpg";
  scale: number;
  transparent: boolean;
  quality: number;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  globalScale: number;
}

export function ExportModal({ isOpen, onClose, onExport, globalScale }: ExportModalProps) {
  const [format, setFormat] = useState<"png" | "jpg">(() => {
    return (localStorage.getItem("exportFormat") as "png" | "jpg") || "png";
  });

  const modalRef = useRef<HTMLDivElement | null>(null);
  const prevActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    prevActive.current = document.activeElement as HTMLElement | null;

    // Focus first focusable element inside the modal
    setTimeout(() => {
      const first = modalRef.current?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
      );
      first?.focus();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevActive.current?.focus();
    };
  }, [isOpen, onClose]);

  const [useGlobalScale, setUseGlobalScale] = useState(() => {
    const saved = localStorage.getItem("exportUseGlobalScale");
    return saved ? saved === "true" : true;
  });

  const [customScale, setCustomScale] = useState(2); // Don't persist value, just preference to use it or not

  const [transparent, setTransparent] = useState(() => {
    const saved = localStorage.getItem("exportTransparent");
    return saved ? saved === "true" : false;
  });

  const [quality, setQuality] = useState(() => {
    const saved = localStorage.getItem("exportQuality");
    return saved ? parseFloat(saved) : 0.9;
  });

  // Save settings when they change
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem("exportFormat", format);
      localStorage.setItem("exportUseGlobalScale", String(useGlobalScale));
      localStorage.setItem("exportTransparent", String(transparent));
      localStorage.setItem("exportQuality", String(quality));
    }
  }, [format, useGlobalScale, transparent, quality, isOpen]);

  // Sync custom scale with global when checkbox is checked, initially
  useEffect(() => {
    if (isOpen) {
      if (useGlobalScale) {
        setCustomScale(globalScale);
      }
    }
  }, [isOpen, globalScale, useGlobalScale]);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport({
      format,
      scale: useGlobalScale ? globalScale : customScale,
      transparent: format === "png" ? transparent : false,
      quality: format === "jpg" ? quality : 1.0,
    });
    onClose();
  };

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
        zIndex: 2000,
      }}
    >
      <div
        className="modal-content"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--bg-color, #fff)",
          color: "var(--text-color, #000)",
          padding: "24px",
          borderRadius: "8px",
          minWidth: "350px",
          maxWidth: "450px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h3 id="export-dialog-title" style={{ margin: "0 0 8px 0" }}>Export Chart</h3>

        <div className="control-group" style={{ display: "flex", gap: "20px" }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input
              type="radio"
              name="format"
              checked={format === "png"}
              onChange={() => setFormat("png")}
              style={{ marginRight: "8px" }}
            />
            PNG
          </label>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input
              type="radio"
              name="format"
              checked={format === "jpg"}
              onChange={() => setFormat("jpg")}
              style={{ marginRight: "8px" }}
            />
            JPG
          </label>
        </div>

        <div
          className="settings-section"
          style={{ borderTop: "1px solid var(--text-secondary, #eee)", paddingTop: "16px" }}
        >
          {/* Scale Setting */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontWeight: "600" }}>Scale (Resolution)</label>
              <label style={{ fontSize: "0.9em", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={useGlobalScale}
                  onChange={(e) => setUseGlobalScale(e.currentTarget.checked)}
                  style={{ marginRight: "6px" }}
                />
                Use Global Setting ({globalScale}x)
              </label>
            </div>

            {!useGlobalScale && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ResolutionControl scale={customScale} onScaleChange={setCustomScale} style={{ flex: 1 }} />
              </div>
            )}
            {!useGlobalScale && (
              <p style={{ fontSize: "0.8em", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                Higher scale improves quality but increases file size.
              </p>
            )}
          </div>

          {/* PNG Specific Options */}
          {format === "png" && (
            <div>
              <Toggle label="Transparent Background" checked={transparent} onChange={setTransparent} />
            </div>
          )}

          {/* JPG Specific Options */}
          {format === "jpg" && (
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Quality ({Math.round(quality * 100)}%)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <RangeInput
                  label=""
                  value={quality}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  onChange={setQuality}
                  displayValue={false}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid var(--text-secondary, #ccc)",
              borderRadius: "4px",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: "8px 16px",
              background: "#4caf50",
              border: "none",
              borderRadius: "4px",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
