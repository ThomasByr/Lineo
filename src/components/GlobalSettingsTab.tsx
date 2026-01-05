import { useState } from "preact/hooks";
import { PlotSettings, ViewMode, TextStyle } from "../types";
import { NumberInput } from "./NumberInput";
import { Toggle } from "./Toggle";

function TextStyleControls({ style, onChange }: { style: TextStyle, onChange: (s: TextStyle) => void }) {
    const btnStyle = (active: boolean) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        padding: 0,
        backgroundColor: active ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
        border: '1px solid',
        borderColor: active ? '#4caf50' : '#ccc',
        color: active ? '#4caf50' : '#888',
        cursor: 'pointer',
        borderRadius: '4px',
        fontWeight: 'bold',
        transition: 'all 0.2s ease'
    });

    return (
        <div style={{ display: 'flex', gap: '5px' }}>
            <button 
                style={btnStyle(style.bold)} 
                onClick={() => onChange({ ...style, bold: !style.bold })}
                title="Bold"
            >
                B
            </button>
            <button 
                style={{ ...btnStyle(style.italic), fontStyle: 'italic' }} 
                onClick={() => onChange({ ...style, italic: !style.italic })}
                title="Italic"
            >
                I
            </button>
        </div>
    );
}

interface GlobalSettingsTabProps {
    plotSettings: PlotSettings;
    setPlotSettings: (settings: PlotSettings) => void;
    viewMode: ViewMode;
    startTransaction?: () => void;
    commitTransaction?: (description: string) => void;
}

export function GlobalSettingsTab({ plotSettings, setPlotSettings, viewMode, startTransaction, commitTransaction }: GlobalSettingsTabProps) {
    const [settingsSubTab, setSettingsSubTab] = useState<'main' | 'x' | 'y'>('main');

    return (
        <div className="sidebar-settings-container">
            <h3 className="plot-settings-title">Plot Formatting</h3>
            
            <div className="tabs" style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <button disabled={settingsSubTab === 'main'} onClick={() => setSettingsSubTab('main')} style={{flex: 1}}>Main</button>
                <button disabled={settingsSubTab === 'x'} onClick={() => setSettingsSubTab('x')} style={{flex: 1}}>X Axis</button>
                <button disabled={settingsSubTab === 'y'} onClick={() => setSettingsSubTab('y')} style={{flex: 1}}>Y Axis</button>
            </div>

            {settingsSubTab === 'main' && (
                <>
                    {/* Title Section */}
                    <div className="settings-section">
                        <label className="inline-label">Title</label>
                        <div className="control-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                                type="text" 
                                value={plotSettings.title} 
                                onFocus={() => startTransaction?.()}
                                onBlur={() => commitTransaction?.("Update title")}
                                onInput={(e) => setPlotSettings({...plotSettings, title: e.currentTarget.value})} 
                                placeholder="Chart Title"
                                className="flex-input"
                                style={{ flex: 1 }}
                            />
                            <TextStyleControls 
                                style={plotSettings.titleStyle} 
                                onChange={(s) => setPlotSettings({...plotSettings, titleStyle: s})} 
                            />
                        </div>
                        <div className="control-group">
                            <NumberInput 
                                label="Font Size:" 
                                value={plotSettings.titleFontSize} 
                                onFocus={() => startTransaction?.()}
                                onBlur={() => commitTransaction?.("Update title font size")}
                                onChange={(val) => setPlotSettings({...plotSettings, titleFontSize: val || 16})} 
                                labelClassName="size-label"
                            />
                        </div>
                    </div>

                    <hr className="sidebar-divider" />

                    {/* Legend Section */}
                    <div className="settings-section">
                        <div className="control-group">
                            <Toggle 
                                label="Hide System Legend" 
                                checked={plotSettings.hideSystemLegend} 
                                onChange={(checked) => setPlotSettings({...plotSettings, hideSystemLegend: checked})}
                                onLabel="Yes"
                                offLabel="No"
                            />
                        </div>

                        {!plotSettings.hideSystemLegend && (
                            <div className="control-group">
                                <Toggle 
                                    label="Hide system legend on export" 
                                    checked={plotSettings.hideSystemLegendOnExport} 
                                    onChange={(checked) => setPlotSettings({...plotSettings, hideSystemLegendOnExport: checked})}
                                    onLabel="Yes"
                                    offLabel="No"
                                />
                            </div>
                        )}

                        <div className="control-group">
                            <Toggle 
                                label="Custom Legend" 
                                checked={plotSettings.showLegend} 
                                onChange={(checked) => setPlotSettings({...plotSettings, showLegend: checked})}
                                onLabel="Show"
                                offLabel="Hide"
                            />
                        </div>
                        
                        <div className="control-group">
                            <NumberInput 
                                label="Legend Size:" 
                                value={plotSettings.legendFontSize} 
                                onChange={(val) => setPlotSettings({...plotSettings, legendFontSize: val || 12})} 
                                labelClassName="size-label"
                                disabled={!plotSettings.showLegend}
                            />
                        </div>
                    </div>
                </>
            )}

            {settingsSubTab === 'x' && (
                <div className="settings-section">
                    <label className="inline-label">X Axis</label>
                    <div className="control-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            value={plotSettings.xLabel} 
                            onInput={(e) => setPlotSettings({...plotSettings, xLabel: e.currentTarget.value})} 
                            placeholder="Label"
                            className="flex-input"
                            style={{ flex: 1 }}
                        />
                        <TextStyleControls 
                            style={plotSettings.xLabelStyle} 
                            onChange={(s) => setPlotSettings({...plotSettings, xLabelStyle: s})} 
                        />
                    </div>
                    <div className="control-group" style={{display: 'flex', gap: '10px'}}>
                        <NumberInput 
                            label="Label Size:" 
                            value={plotSettings.xAxisLabelFontSize} 
                            onChange={(val) => setPlotSettings({...plotSettings, xAxisLabelFontSize: val || 12})} 
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                        />
                        <NumberInput 
                            label="Tick Size:" 
                            value={plotSettings.xTickLabelFontSize} 
                            onChange={(val) => setPlotSettings({...plotSettings, xTickLabelFontSize: val || 10})} 
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                        />
                    </div>
                    <div className="control-group">
                        <Toggle 
                            label="Grid Lines" 
                            checked={plotSettings.showGridX} 
                            onChange={(checked) => setPlotSettings({...plotSettings, showGridX: checked})}
                            onLabel="Visible"
                            offLabel="Hidden"
                        />
                    </div>
                    <div className="control-group" style={{display: 'flex', gap: '10px'}}>
                        {plotSettings.showGridX && (
                            <NumberInput 
                                label="Grid Width:" 
                                value={plotSettings.gridLineWidthX} 
                                onChange={(val) => setPlotSettings({...plotSettings, gridLineWidthX: val || 1})} 
                                min="0.1" step="0.1"
                                float={true}
                                labelClassName="size-label"
                                containerStyle={{flex: 1}}
                                style={{width: '100%'}}
                            />
                        )}
                        <NumberInput 
                            label="Axis Width:" 
                            value={plotSettings.axisLineWidthX} 
                            onChange={(val) => setPlotSettings({...plotSettings, axisLineWidthX: val || 1})} 
                            min="0.1" step="0.1"
                            float={true}
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                        />
                    </div>
                    <div className="control-group" style={{display: 'flex', gap: '10px'}}>
                        <NumberInput 
                            label="Min:" 
                            value={plotSettings.xMin} 
                            onChange={(val) => setPlotSettings({...plotSettings, xMin: val})} 
                            float={true}
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                            disabled={viewMode === 'auto'}
                            placeholder={viewMode === 'auto' ? 'Auto' : ''}
                        />
                        <NumberInput 
                            label="Max:" 
                            value={plotSettings.xMax} 
                            onChange={(val) => setPlotSettings({...plotSettings, xMax: val})} 
                            float={true}
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                            disabled={viewMode === 'auto'}
                            placeholder={viewMode === 'auto' ? 'Auto' : ''}
                        />
                    </div>
                </div>
            )}

            {settingsSubTab === 'y' && (
                <div className="settings-section">
                    <label className="inline-label">Y Axis</label>
                    <div className="control-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            value={plotSettings.yLabel} 
                            onInput={(e) => setPlotSettings({...plotSettings, yLabel: e.currentTarget.value})} 
                            placeholder="Label"
                            className="flex-input"
                            style={{ flex: 1 }}
                        />
                        <TextStyleControls 
                            style={plotSettings.yLabelStyle} 
                            onChange={(s) => setPlotSettings({...plotSettings, yLabelStyle: s})} 
                        />
                    </div>
                    <div className="control-group" style={{display: 'flex', gap: '10px'}}>
                        <NumberInput 
                            label="Label Size:" 
                            value={plotSettings.yAxisLabelFontSize} 
                            onChange={(val) => setPlotSettings({...plotSettings, yAxisLabelFontSize: val || 12})} 
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                        />
                        <NumberInput 
                            label="Tick Size:" 
                            value={plotSettings.yTickLabelFontSize} 
                            onChange={(val) => setPlotSettings({...plotSettings, yTickLabelFontSize: val || 10})} 
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                        />
                    </div>
                    <div className="control-group">
                        <Toggle 
                            label="Grid Lines" 
                            checked={plotSettings.showGridY} 
                            onChange={(checked) => setPlotSettings({...plotSettings, showGridY: checked})}
                            onLabel="Visible"
                            offLabel="Hidden"
                        />
                    </div>
                    <div className="control-group" style={{display: 'flex', gap: '10px'}}>
                        {plotSettings.showGridY && (
                            <NumberInput 
                                label="Grid Width:" 
                                value={plotSettings.gridLineWidthY} 
                                onChange={(val) => setPlotSettings({...plotSettings, gridLineWidthY: val || 1})} 
                                min="0.1" step="0.1"
                                float={true}
                                labelClassName="size-label"
                                containerStyle={{flex: 1}}
                                style={{width: '100%'}}
                            />
                        )}
                        <NumberInput 
                            label="Axis Width:" 
                            value={plotSettings.axisLineWidthY} 
                            onChange={(val) => setPlotSettings({...plotSettings, axisLineWidthY: val || 1})} 
                            min="0.1" step="0.1"
                            float={true}
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                        />
                    </div>
                    <div className="control-group" style={{display: 'flex', gap: '10px'}}>
                        <NumberInput 
                            label="Min:" 
                            value={plotSettings.yMin} 
                            onChange={(val) => setPlotSettings({...plotSettings, yMin: val})} 
                            float={true}
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                            disabled={viewMode === 'auto'}
                            placeholder={viewMode === 'auto' ? 'Auto' : ''}
                        />
                        <NumberInput 
                            label="Max:" 
                            value={plotSettings.yMax} 
                            onChange={(val) => setPlotSettings({...plotSettings, yMax: val})} 
                            float={true}
                            labelClassName="size-label"
                            containerStyle={{flex: 1}}
                            style={{width: '100%'}}
                            disabled={viewMode === 'auto'}
                            placeholder={viewMode === 'auto' ? 'Auto' : ''}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
