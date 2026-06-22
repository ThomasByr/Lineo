import { useState, useRef, useEffect } from "preact/hooks";
import { useClickOutside } from "../../hooks/useClickOutside";
import type { JSX } from "preact";
import { LINE_STYLES, POINT_STYLES } from "../../styles";

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
  const def = LINE_STYLES[style];
  if (!def) {
    // Fallback for unknown styles
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div
          style={{
            width: "40px",
            height: "3px",
            backgroundColor: color,
            borderRadius: "1px",
          }}
        />
      </div>
    );
  }

  const pattern = def.cssPattern?.replace(/{color}/g, color) || color;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: "40px",
          height: "3px",
          background: pattern,
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

  const def = POINT_STYLES[type];

  // For line and dash, render as horizontal lines with patterns
  if (type === "line" || type === "dash") {
    const pattern =
      type === "line"
        ? `repeating-linear-gradient(to right, ${color} 0px, ${color} 10px, transparent 10px, transparent 20px)`
        : `repeating-linear-gradient(to right, ${color} 0px, ${color} 4px, transparent 4px, transparent 8px)`;
    return (
      <div
        style={{
          width: size,
          height: "2px",
          background: pattern,
          marginTop: "6px",
        }}
      />
    );
  }

  // For circle, use div with border-radius
  if (type === "circle") {
    return <div style={{ width: size, height: size, background: color, borderRadius: "50%", border }} />;
  }

  // For rect, use div without border-radius
  if (type === "rect") {
    return <div style={{ width: size, height: size, background: color, border }} />;
  }

  // For rectRounded, use div with small border-radius
  if (type === "rectRounded") {
    return <div style={{ width: size, height: size, background: color, borderRadius: "20%", border }} />;
  }

  // For rectRot, use div with rotation
  if (type === "rectRot") {
    return (
      <div style={{ width: size, height: size, background: color, transform: "rotate(45deg)", border }} />
    );
  }

  // For cross and crossRot, use SVG with stroke
  if (type === "cross" || type === "crossRot") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path d={def?.svgPath || ""} stroke={color} strokeWidth="3" />
      </svg>
    );
  }

  // For all other types (triangle, star), use SVG with fill and stroke
  if (def) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path d={def.svgPath} fill={color} stroke={borderColor} strokeWidth="1" />
      </svg>
    );
  }

  // Fallback
  return <div style={{ width: size, height: size, background: color, borderRadius: "50%", border }} />;
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
        <div
          id={optionsId}
          className="custom-select-options"
          role="listbox"
          aria-labelledby={`${optionsId}-trigger`}
        >
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

export const getPointStyleOptions = (color: string): Option[] =>
  Object.entries(POINT_STYLES).map(([value, def]) => ({
    value,
    label: def.label,
    preview: <PointStylePreview type={value} color={color} />,
  }));

export const getLineStyleOptions = (color: string): Option[] =>
  Object.entries(LINE_STYLES).map(([value, def]) => ({
    value,
    label: def.label,
    preview: <LineStylePreview style={value} color={color} />,
  }));
