import { useState, useRef, useEffect } from "preact/hooks";
import { useClickOutside } from "../../hooks/useClickOutside";
import type { JSX } from "preact";

interface Option {
  value: string;
  label: string;
  preview?: JSX.Element;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

function LineStylePreview({ style, color = "#000" }: { style: string; color?: string }) {
  const getPattern = () => {
    switch (style) {
      case "dashed":
        return `repeating-linear-gradient(to right, ${color} 0px, ${color} 6px, transparent 6px, transparent 12px)`;
      case "dotted":
        return `repeating-linear-gradient(to right, ${color} 0px, ${color} 2px, transparent 2px, transparent 4px)`;
      case "dashdot":
        return `repeating-linear-gradient(to right, ${color} 0px, ${color} 8px, transparent 8px, transparent 12px, ${color} 12px, ${color} 14px, transparent 14px, transparent 18px)`;
      case "longdash":
        return `repeating-linear-gradient(to right, ${color} 0px, ${color} 10px, transparent 10px, transparent 20px)`;
      default: // solid
        return color;
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: "40px",
          height: "3px",
          background: getPattern(),
          borderRadius: "1px",
        }}
      />
    </div>
  );
}

function PointStylePreview({ type, color = "#000" }: { type: string; color?: string }) {
  const size = 14;
  const borderColor = "var(--point-border-color)";
  const border = `1px solid ${borderColor}`;

  switch (type) {
    case "circle":
      return <div style={{ width: size, height: size, background: color, borderRadius: "50%", border }} />;
    case "rect":
      return <div style={{ width: size, height: size, background: color, border }} />;
    case "rectRounded":
      return <div style={{ width: size, height: size, background: color, borderRadius: "20%", border }} />;
    case "rectRot":
      return <div style={{ width: size, height: size, background: color, transform: "rotate(45deg)", border }} />;
    case "triangle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d="M12 2L22 22H2z" fill={color} stroke={borderColor} strokeWidth="1" />
        </svg>
      );
    case "cross":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d="M4 12H20M12 4V20" stroke={color} strokeWidth="3" />
        </svg>
      );
    case "crossRot":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d="M5 5L19 19M19 5L5 19" stroke={color} strokeWidth="3" />
        </svg>
      );
    case "line":
      // Chart.js 'line' is a horizontal line - we'll show it as long dash for clarity
      return (
        <div
          style={{
            width: size,
            height: "2px",
            background: `repeating-linear-gradient(to right, ${color} 0px, ${color} 10px, transparent 10px, transparent 20px)`,
            marginTop: "6px",
          }}
        />
      );
    case "dash":
      // Chart.js 'dash' is a short dash
      return (
        <div
          style={{
            width: size,
            height: "2px",
            background: `repeating-linear-gradient(to right, ${color} 0px, ${color} 4px, transparent 4px, transparent 8px)`,
            marginTop: "6px",
          }}
        />
      );
    default:
      return <div style={{ width: size, height: size, background: color, borderRadius: "50%", border }} />;
  }
}

export function CustomSelect({ value, options, onChange, className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const [highlighted, setHighlighted] = useState<number>(-1);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const optionsId = `custom-select-options-${Math.random().toString(36).slice(2, 9)}`;

  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlighted(idx >= 0 ? idx : 0);
    } else {
      setHighlighted(-1);
    }
  }, [isOpen, value, options]);

  useEffect(() => {
    if (isOpen && highlighted >= 0) {
      optionRefs.current[highlighted]?.focus();
    }
  }, [highlighted, isOpen]);

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    const key = (e as any).key;
    if (key === "Enter" || key === " ") {
      e.preventDefault();
      setIsOpen((s) => !s);
      return;
    }
    if (key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlighted((h) => Math.min(h + 1, options.length - 1));
      return;
    }
    if (key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlighted((h) => Math.max(h - 1, 0));
      return;
    }
    if (key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`custom-select-container ${className}`} ref={containerRef}>
      <div
        id={`${optionsId}-trigger`}
        role="button"
        aria-haspopup="listbox"
        aria-controls={optionsId}
        aria-expanded={isOpen}
        tabIndex={0}
        className={`custom-select-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={onTriggerKeyDown as any}
      >
        <span>{selectedOption?.label}</span>
        {selectedOption?.preview && (
          <span style={{ marginLeft: "8px", display: "flex", alignItems: "center" }}>
            {selectedOption.preview}
          </span>
        )}
        <span className="arrow" style={{ fontSize: "0.8em", marginLeft: "8px" }}>
          ▼
        </span>
      </div>
      {isOpen && (
        <div id={optionsId} className="custom-select-options" role="listbox" aria-labelledby={`${optionsId}-trigger`}>
          {options.map((option, idx) => (
            <div
              id={`${optionsId}-option-${option.value}`}
              key={option.value}
              role="option"
              tabIndex={-1}
              aria-selected={option.value === value}
              ref={(el) => {
                optionRefs.current[idx] = el;
              }}
              className={`custom-select-option ${option.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onKeyDown={(e: KeyboardEvent) => {
                const key = (e as any).key;
                if (key === "Enter" || key === " ") {
                  onChange(option.value);
                  setIsOpen(false);
                } else if (key === "ArrowDown") {
                  e.preventDefault();
                  setHighlighted((h) => Math.min(h + 1, options.length - 1));
                } else if (key === "ArrowUp") {
                  e.preventDefault();
                  setHighlighted((h) => Math.max(h - 1, 0));
                } else if (key === "Escape") {
                  setIsOpen(false);
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {option.preview}
                <span>{option.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const getPointStyleOptions = (color: string): Option[] => [
  { value: "circle", label: "Circle", preview: <PointStylePreview type="circle" color={color} /> },
  { value: "rect", label: "Square", preview: <PointStylePreview type="rect" color={color} /> },
  { value: "rectRounded", label: "Rounded Square", preview: <PointStylePreview type="rectRounded" color={color} /> },
  { value: "rectRot", label: "Diamond", preview: <PointStylePreview type="rectRot" color={color} /> },
  { value: "triangle", label: "Triangle", preview: <PointStylePreview type="triangle" color={color} /> },
  { value: "cross", label: "Cross", preview: <PointStylePreview type="cross" color={color} /> },
  { value: "crossRot", label: "X (Rotated)", preview: <PointStylePreview type="crossRot" color={color} /> },
  { value: "line", label: "Long Dash", preview: <PointStylePreview type="line" color={color} /> },
  { value: "dash", label: "Dash", preview: <PointStylePreview type="dash" color={color} /> },
];

export const getLineStyleOptions = (color: string): Option[] => [
  { value: "solid", label: "Solid", preview: <LineStylePreview style="solid" color={color} /> },
  { value: "dashed", label: "Dashed", preview: <LineStylePreview style="dashed" color={color} /> },
  { value: "dotted", label: "Dotted", preview: <LineStylePreview style="dotted" color={color} /> },
  { value: "dashdot", label: "Dash-Dot", preview: <LineStylePreview style="dashdot" color={color} /> },
  { value: "longdash", label: "Long Dash", preview: <LineStylePreview style="longdash" color={color} /> },
];
