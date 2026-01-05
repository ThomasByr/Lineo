import { Series } from "../types";
import { Toggle } from "./Toggle";
import { CustomSelect } from "./CustomSelect";
import { ColorInput } from "./ColorInput";
import { RangeInput } from "./RangeInput";

interface SettingsTabProps {
    series: Series[];
    updateSeries: (id: string, updates: Partial<Series>) => void;
}

export function SettingsTab({ series, updateSeries }: SettingsTabProps) {
    if (series.length === 0) return <p>No series loaded.</p>;

    return (
        <div className="settings-tab">
            {series.map(s => (
                <div key={s.id} className="series-settings">
                    <h4>{s.name}</h4>
                    
                    <ColorInput 
                        label="Color:" 
                        value={s.color} 
                        onChange={(val) => updateSeries(s.id, { color: val })} 
                    />

                    <RangeInput 
                        label="Point Size" 
                        value={s.pointSize} 
                        onChange={(val) => updateSeries(s.id, { pointSize: val })} 
                        min="1" max="20" 
                        unit="px"
                    />

                    <div className="control-group">
                        <label>Point Style:</label>
                        <CustomSelect 
                            value={s.pointStyle} 
                            onChange={(val) => updateSeries(s.id, { pointStyle: val as any })}
                            options={[
                                { value: "circle", label: "Circle" },
                                { value: "rect", label: "Rectangle" },
                                { value: "triangle", label: "Triangle" },
                                { value: "cross", label: "Cross" },
                                { value: "star", label: "Star" }
                            ]}
                        />
                    </div>

                    <div className="control-group">
                        <Toggle 
                            label="Connect Points" 
                            checked={s.showLine || false} 
                            onChange={(checked) => updateSeries(s.id, { showLine: checked })}
                            onLabel="Yes"
                            offLabel="No"
                        />
                    </div>

                    {s.showLine && (
                        <>
                            <RangeInput 
                                label="Line Width" 
                                value={s.width} 
                                onChange={(val) => updateSeries(s.id, { width: val })} 
                                min="1" max="10" 
                                unit="px"
                            />

                            <div className="control-group">
                                <label>Line Style:</label>
                                <CustomSelect 
                                    value={s.lineStyle || 'solid'} 
                                    onChange={(val) => updateSeries(s.id, { lineStyle: val as any })}
                                    options={[
                                        { value: "solid", label: "Solid" },
                                        { value: "dashed", label: "Dashed" },
                                        { value: "dotted", label: "Dotted" }
                                    ]}
                                />
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}
