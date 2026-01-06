import { JSX } from "preact";

interface NumberInputProps extends Omit<
  JSX.HTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "onInput"
> {
  label?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  labelClassName?: string;
  float?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  disabled?: boolean;
  placeholder?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  labelClassName,
  className,
  float = false,
  containerStyle,
  ...props
}: NumberInputProps & { containerStyle?: JSX.CSSProperties }) {
  return (
    <div className="control-group-item" style={{ width: "100%", ...containerStyle }}>
      {label && <label className={labelClassName}>{label}</label>}
      <input
        type="number"
        value={value ?? ""}
        onInput={(e) => {
          const valStr = e.currentTarget.value;
          if (valStr === "") {
            onChange(undefined);
            return;
          }
          const val = float ? parseFloat(valStr) : parseInt(valStr);
          onChange(isNaN(val) ? undefined : val);
        }}
        className={className || "size-input"}
        {...props}
      />
    </div>
  );
}
