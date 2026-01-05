interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    onLabel?: string;
    offLabel?: string;
}

export function Toggle({ label, checked, onChange, onLabel = "On", offLabel = "Off" }: ToggleProps) {
    return (
        <label className="toggle-container">
            <input 
                type="checkbox" 
                className="toggle-input" 
                checked={checked} 
                onChange={(e) => onChange(e.currentTarget.checked)} 
            />
            <div className="toggle-switch"></div>
            <span className="toggle-label-text">
                {label} ({checked ? onLabel : offLabel})
            </span>
        </label>
    );
}
