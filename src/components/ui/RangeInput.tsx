import { JSX } from "preact";

interface RangeInputProps extends Omit<
  JSX.HTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "onInput"
> {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onInput?: (value: number) => void;
  displayValue?: boolean;
  unit?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

export function RangeInput({
  label,
  value,
  onChange,
  onInput,
  displayValue = true,
  unit = "",
  ...props
}: RangeInputProps) {
  return (
    <div className="control-group">
      <label>
        {label}
        {displayValue && `: ${value}${unit}`}
      </label>
      <input
        type="range"
        value={value}
        onInput={(e) => {
          const val = parseFloat(e.currentTarget.value);
          if (onInput) onInput(val);
          else onChange(val);
        }}
        onChange={(e) => {
          const val = parseFloat(e.currentTarget.value);
          onChange(val);
        }}
        {...props}
      />
    </div>
  );
}
