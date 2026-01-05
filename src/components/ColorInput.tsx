import { JSX } from "preact";

interface ColorInputProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'onInput'> {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export function ColorInput({ label, value, onChange, ...props }: ColorInputProps) {
    return (
        <div className="control-group">
            <label>{label}</label>
            <input 
                type="color" 
                value={value} 
                onInput={(e) => onChange(e.currentTarget.value)} 
                {...props}
            />
        </div>
    );
}
