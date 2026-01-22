import { useState, useRef } from "preact/hooks";
import { useClickOutside } from "../../hooks/useClickOutside";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

export function CustomSelect({ value, options, onChange, className = "" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className={`custom-select-container ${className}`} ref={containerRef}>
      <div className={`custom-select-trigger ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedOption?.label}</span>
        <span className="arrow" style={{ fontSize: "0.8em", marginLeft: "8px" }}>
          ▼
        </span>
      </div>
      {isOpen && (
        <div className="custom-select-options">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${option.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
