import { NumberInput } from "../ui/NumberInput";
import { RangeInput } from "../ui/RangeInput";

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
        <h3 style={{ marginTop: 0 }}>Export Settings</h3>
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
            <RangeInput
              label=""
              value={scale}
              min={0.5}
              max={10}
              step={0.5}
              onChange={onScaleChange}
              displayValue={false}
              style={{ flex: 1 }}
            />
            <button 
                  onClick={() => onScaleChange(scale === 0.1 ? 0.5 : 0.1)}
                  style={{ 
                    fontSize: "0.8em", 
                    padding: "2px 6px", 
                    background: scale === 0.1 ? "var(--accent-color, #4caf50)" : "transparent",
                    color: scale === 0.1 ? "white" : "inherit",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                  title="Low resolution preview (0.1x)"
                >
                  0.1x
            </button>
            <div style={{ width: "60px" }}>
              <NumberInput
                value={scale}
                onChange={(val: number | undefined) => {
                  if (val !== undefined) {
                    // Allow special case 0.1, otherwise snap to 0.5 grid starting at 0.5
                    let newVal = val;
                    if (Math.abs(newVal - 0.1) < 0.01) {
                      newVal = 0.1;
                    } else {
                      newVal = Math.round(newVal * 2) / 2;
                      if (newVal < 0.5) newVal = 0.5;
                    }
                    onScaleChange(Math.max(0.1, Math.min(10, newVal)));
                  }
                }}
                step={scale === 0.1 ? 0.4 : 0.5}
                min={scale === 0.1 ? 0.1 : 0.5}
                max={10}
                float={true}
              />
            </div>
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
