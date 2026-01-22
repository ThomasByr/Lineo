import { useState, useRef, useEffect } from "preact/hooks";
import { useClickOutside } from "../../hooks/useClickOutside";

interface Option {
  value: string;
  label: string;
}

/* Accessibility improvements:
 - Trigger is keyboard focusable and supports Enter/Space/Arrow/Escape keys
 - Options are focusable and can be navigated by arrow keys
 - Proper ARIA roles and attributes added
*/

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

  const [highlighted, setHighlighted] = useState<number>(-1);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const optionsId = `custom-select-options-${Math.random().toString(36).slice(2, 9)}`;

  useEffect(() => {
    if (isOpen) {
      // Highlight selected or first
      const idx = options.findIndex((o) => o.value === value);
      setHighlighted(idx >= 0 ? idx : 0);
    } else {
      setHighlighted(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    // Focus highlighted option when it changes
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
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
