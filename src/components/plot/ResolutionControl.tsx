import { NumberInput } from "../ui/NumberInput";
import { RangeInput } from "../ui/RangeInput";

interface ResolutionControlProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  style?: any;
}

export function ResolutionControl({ scale, onScaleChange, style }: ResolutionControlProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        ...style,
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
          cursor: "pointer",
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
  );
}
