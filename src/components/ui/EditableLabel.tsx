import { useState, useRef, useEffect } from "preact/hooks";

interface EditableLabelProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  style?: any;
}

export function EditableLabel({ value, onSave, className, style }: EditableLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setCurrentValue(value);
    }
  }, [isEditing, value]);

  const handleSave = () => {
    if (currentValue.trim() !== "") {
      onSave(currentValue);
    } else {
        // Revert if empty
        setCurrentValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setCurrentValue(value);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onInput={(e) => setCurrentValue(e.currentTarget.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={className}
        style={{ ...style, width: "100%", padding: "2px 4px", fontSize: "inherit" }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className={className}
      style={{ ...style, cursor: "text" }}
      onDblClick={() => setIsEditing(true)}
      title="Double click to rename"
    >
      {value}
    </span>
  );
}
