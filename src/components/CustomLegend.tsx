import { JSX } from "preact";
import { Series, PlotSettings } from "../types";
import { PointSymbol } from "./PointSymbol";

interface CustomLegendProps {
    series: Series[];
    position: { x: number; y: number };
    isDragging: boolean;
    onMouseDown: (e: JSX.TargetedMouseEvent<HTMLDivElement>) => void;
    settings?: PlotSettings;
}

export function CustomLegend({ series, position, isDragging, onMouseDown, settings }: CustomLegendProps) {
    return (
        <div 
            className="custom-legend"
            style={{
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : 'grab',
                fontSize: `${settings?.legendFontSize || 12}px`,
            }}
            onMouseDown={onMouseDown}
        >
            {series.filter(s => s.visible).map(s => {
                const fontSize = settings?.legendFontSize || 12;
                const showSeriesLine = s.showLine;
                const showRegressionLine = s.regression.type !== 'none';
                const symbolWidth = (showSeriesLine || showRegressionLine) ? fontSize * 2.5 : fontSize * 0.8;
                
                return (
                <div key={s.id} style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                    <div style={{
                        width: `${symbolWidth}px`, 
                        height: `${fontSize}px`, 
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {showSeriesLine && (
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: '50%',
                                height: 0,
                                borderTopWidth: `${Math.max(1, s.width)}px`,
                                borderTopStyle: s.lineStyle === 'solid' ? 'solid' : s.lineStyle === 'dashed' ? 'dashed' : 'dotted',
                                borderTopColor: s.color,
                                marginTop: `-${Math.max(1, s.width)/2}px`,
                                zIndex: 0
                            }}></div>
                        )}
                        {showRegressionLine && (
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: '50%',
                                height: 0,
                                borderTopWidth: `${Math.max(1, s.regression.width)}px`,
                                borderTopStyle: s.regression.style === 'solid' ? 'solid' : s.regression.style === 'dashed' ? 'dashed' : 'dotted',
                                borderTopColor: s.regression.color,
                                marginTop: `-${Math.max(1, s.regression.width)/2}px`,
                                zIndex: 0
                            }}></div>
                        )}
                        <div style={{ zIndex: 1, position: 'relative' }}>
                            <PointSymbol type={s.pointStyle} color={s.color} size={fontSize * 0.8} />
                        </div>
                    </div>
                    <span>{s.name}</span>
                </div>
            )})}
        </div>
    );
}
