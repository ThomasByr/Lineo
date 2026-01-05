import { useRef, useState, useEffect } from "preact/hooks";
import { JSX } from "preact";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  ScatterController,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import fitCurve from "fit-curve";
import { saveImage, copyImageToClipboard } from "../platform";
import { Series, DataPoint, ViewMode, PlotSettings } from "../types";
import { calculateRegression } from "../regressionHelper";
import zoomPlugin from 'chartjs-plugin-zoom';
import { useNotification } from '../contexts/NotificationContext';
import { captureCanvas } from "../utils";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Title, ScatterController, zoomPlugin);

interface PlotAreaProps {
  series: Series[];
  onAddSeries: (name: string, data: DataPoint[]) => void;
  editingSeriesId?: string | null;
  updateSeries?: (id: string, updates: Partial<Series>) => void;
  viewMode?: ViewMode;
  plotSettings?: PlotSettings;
  onViewChange?: (view: { x: { min: number, max: number }, y: { min: number, max: number } }) => void;
}

export function PlotArea({ series, onAddSeries, editingSeriesId, updateSeries, viewMode = 'auto', plotSettings, onViewChange }: PlotAreaProps) {
  const { addNotification } = useNotification();
  const chartRef = useRef<ChartJS>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<DataPoint[]>([]);
  const [bezierPoints, setBezierPoints] = useState<DataPoint[]>([]);
  const [drawMode, setDrawMode] = useState(false);
  
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const [_, forceUpdate] = useState(0);

  // Custom Legend State
  const [legendPos, setLegendPos] = useState({ x: 60, y: 20 });
  const [isDraggingLegend, setIsDraggingLegend] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [autoCrop, setAutoCrop] = useState(true);

  // Reset drawn points when data changes or mode toggles
  useEffect(() => {
    if (!drawMode) {
      setDrawnPoints([]);
      setBezierPoints([]);
    }
  }, [drawMode]);

  const handleExport = async (format: 'png' | 'jpg') => {
      if (!containerRef.current) {
        console.error("Container reference not found");
        addNotification('error', "Chart not ready yet");
        return;
      }

      const chart = chartRef.current;
      const shouldHideLegend = !plotSettings?.hideSystemLegend && plotSettings?.hideSystemLegendOnExport;
      let restoreRequired = false;
      let originalGenerateLabels: any = null;

      if (shouldHideLegend && chart) {
          // @ts-ignore
          originalGenerateLabels = chart.options.plugins?.legend?.labels?.generateLabels;
          
          // @ts-ignore
          chart.options.plugins.legend.labels.generateLabels = function(chart) {
             const defaultGenerator = ChartJS.defaults.plugins.legend.labels.generateLabels;
             const generator = originalGenerateLabels || defaultGenerator;
             const items = generator.call(this, chart);
             return items.map((item: any) => ({
                 ...item,
                 fontColor: 'rgba(0,0,0,0)',
                 color: 'rgba(0,0,0,0)',
                 fillStyle: 'rgba(0,0,0,0)',
                 strokeStyle: 'rgba(0,0,0,0)',
                 boxBorderWidth: 0
             }));
          };
          chart.update();
          restoreRequired = true;
      }

      try {
        const bytes = await captureCanvas(containerRef.current, format, autoCrop);
        // Cast to any to avoid "SharedArrayBuffer" type mismatch error
        const blob = new Blob([bytes as any], { type: format === 'jpg' ? 'image/jpeg' : 'image/png' });
        await saveImage(blob, `chart.${format}`);
        addNotification('success', `Chart exported successfully!`);
      } catch (err) {
          console.error('Failed to export', err);
          addNotification('error', 'Failed to export chart.');
      } finally {
          if (restoreRequired && chart) {
              if (originalGenerateLabels) {
                  // @ts-ignore
                  chart.options.plugins.legend.labels.generateLabels = originalGenerateLabels;
              } else {
                  // @ts-ignore
                  delete chart.options.plugins.legend.labels.generateLabels;
              }
              chart.update();
          }
      }
  };

  const handleCopy = async () => {
      if (!containerRef.current) {
        console.error("Container reference not found");
        addNotification('error', "Chart not ready yet");
        return;
      }

      const chart = chartRef.current;
      const shouldHideLegend = !plotSettings?.hideSystemLegend && plotSettings?.hideSystemLegendOnExport;
      let restoreRequired = false;
      let originalGenerateLabels: any = null;

      if (shouldHideLegend && chart) {
          // @ts-ignore
          originalGenerateLabels = chart.options.plugins?.legend?.labels?.generateLabels;
          
          // @ts-ignore
          chart.options.plugins.legend.labels.generateLabels = function(chart) {
             const defaultGenerator = ChartJS.defaults.plugins.legend.labels.generateLabels;
             const generator = originalGenerateLabels || defaultGenerator;
             const items = generator.call(this, chart);
             return items.map((item: any) => ({
                 ...item,
                 fontColor: 'rgba(0,0,0,0)',
                 color: 'rgba(0,0,0,0)',
                 fillStyle: 'rgba(0,0,0,0)',
                 strokeStyle: 'rgba(0,0,0,0)',
                 boxBorderWidth: 0
             }));
          };
          chart.update();
          restoreRequired = true;
      }

      try {
          const bytes = await captureCanvas(containerRef.current, 'png', autoCrop);
          // Cast to any to avoid "SharedArrayBuffer" type mismatch error
          const blob = new Blob([bytes as any], { type: 'image/png' });
          await copyImageToClipboard(blob);
          addNotification('success', 'Chart copied to clipboard!');
      } catch (err) {
          console.error('Failed to copy', err);
          addNotification('error', `Failed to copy to clipboard: ${err}`);
      } finally {
          if (restoreRequired && chart) {
              if (originalGenerateLabels) {
                  // @ts-ignore
                  chart.options.plugins.legend.labels.generateLabels = originalGenerateLabels;
              } else {
                  // @ts-ignore
                  delete chart.options.plugins.legend.labels.generateLabels;
              }
              chart.update();
          }
      }
  };


  const handleLegendMouseDown = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      });
      setIsDraggingLegend(true);
  };

  const handleMouseDown = (event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (!chartRef.current) return;
    
    // Handle Manual Point Editing
    if (editingSeriesId && updateSeries) {
        const chart = chartRef.current;
        const rect = chart.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const s = series.find(ser => ser.id === editingSeriesId);
        if (s && s.regression.manualPoints) {
            // Check for hit
            const hitRadius = 10;
            const hitIndex = s.regression.manualPoints.findIndex(p => {
                const px = chart.scales.x.getPixelForValue(p.x);
                const py = chart.scales.y.getPixelForValue(p.y);
                return Math.sqrt((x - px) ** 2 + (y - py) ** 2) < hitRadius;
            });

            if (event.button === 2) { // Right click
                if (hitIndex !== -1) {
                    const newPoints = [...s.regression.manualPoints];
                    newPoints.splice(hitIndex, 1);
                    updateManualPoints(s, newPoints);
                }
                return;
            }

            if (hitIndex !== -1) {
                setDraggingPointIndex(hitIndex);
            } else {
                // Add new point
                const xValue = chart.scales.x.getValueForPixel(x);
                const yValue = chart.scales.y.getValueForPixel(y);
                if (xValue !== undefined && yValue !== undefined) {
                    const newPoints = [...s.regression.manualPoints, { x: xValue, y: yValue }];
                    // Sort by x to keep spline happy? Or allow arbitrary order?
                    // Spline usually expects order. Let's sort.
                    newPoints.sort((a, b) => a.x - b.x);
                    updateManualPoints(s, newPoints);
                    // Start dragging the new point (find its new index)
                    const newIndex = newPoints.findIndex(p => p.x === xValue && p.y === yValue);
                    setDraggingPointIndex(newIndex);
                }
            }
        } else if (s && !s.regression.manualPoints) {
             // Initialize manual points if empty
             const xValue = chart.scales.x.getValueForPixel(x);
             const yValue = chart.scales.y.getValueForPixel(y);
             if (xValue !== undefined && yValue !== undefined) {
                 updateManualPoints(s, [{ x: xValue, y: yValue }]);
                 setDraggingPointIndex(0);
             }
        }
        return;
    }

    if (!drawMode) return;
    setIsDrawing(true);
    setDrawnPoints([]);
    setBezierPoints([]);
  };

  const updateManualPoints = (s: Series, points: DataPoint[]) => {
      if (!updateSeries) return;
      const newRegressionPoints = calculateRegression(
        s.data, 
        'manual', 
        undefined, 
        undefined, 
        undefined, 
        points
      );
      updateSeries(s.id, {
          regression: { ...s.regression, manualPoints: points },
          regressionPoints: newRegressionPoints
      });
  };

  const handleMouseMove = (event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (isDraggingLegend) {
        const containerRect = event.currentTarget.getBoundingClientRect();
        setLegendPos({
            x: event.clientX - containerRect.left - dragOffset.x,
            y: event.clientY - containerRect.top - dragOffset.y
        });
        return;
    }

    if (!chartRef.current) return;
    
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (editingSeriesId && draggingPointIndex !== null && updateSeries) {
        const s = series.find(ser => ser.id === editingSeriesId);
        if (s && s.regression.manualPoints) {
            const xValue = chart.scales.x.getValueForPixel(x);
            const yValue = chart.scales.y.getValueForPixel(y);
            if (xValue !== undefined && yValue !== undefined) {
                const newPoints = [...s.regression.manualPoints];
                newPoints[draggingPointIndex] = { x: xValue, y: yValue };
                newPoints.sort((a, b) => a.x - b.x);
                // Update dragging index if sort changed it? 
                // Actually, sorting while dragging might be annoying as points swap.
                // Maybe only sort on mouse up?
                // For now, let's NOT sort while dragging, but sort on update.
                // But calculateSpline sorts internally.
                // So we can just update the point.
                
                // If we don't sort, the index remains valid.
                // But calculateSpline sorts, so the curve might jump if points cross.
                // That's acceptable.
                
                // We need to update state to see the point move.
                // But we shouldn't trigger full regression recalc on every move if it's expensive?
                // Spline is cheap.
                
                updateManualPoints(s, newPoints);
                
                // If we sorted in updateManualPoints, we lost the index.
                // So let's NOT sort in updateManualPoints if we are dragging?
                // Or just find the point again by value (risky with floats).
                // Let's just NOT sort in updateManualPoints for now, rely on calculateSpline sorting.
                // But wait, calculateSpline sorts a COPY.
                // So manualPoints order matters for UI (index) but not for curve.
                // So we can keep them unsorted in state.
            }
        }
        return;
    }

    if (!isDrawing || !drawMode) return;

    const xValue = chart.scales.x.getValueForPixel(x);
    const yValue = chart.scales.y.getValueForPixel(y);

    if (xValue !== undefined && yValue !== undefined) {
      setDrawnPoints((prev) => [...prev, { x: xValue, y: yValue }]);
    }
  };

  const handleMouseUp = () => {
    if (isDraggingLegend) {
        setIsDraggingLegend(false);
        return;
    }

    if (draggingPointIndex !== null) {
        setDraggingPointIndex(null);
        return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    processBezier();
  };


  const processBezier = () => {
    if (drawnPoints.length < 2) return;

    const points: [number, number][] = drawnPoints.map((p) => [p.x, p.y]);
    
    const xRange = Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0]));
    const error = xRange / 50; 

    try {
        const curves = fitCurve(points, error || 1); 
        
        const sampledPoints: DataPoint[] = [];
        curves.forEach((curve: any) => {
            const steps = 20;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                let x = 0, y = 0;
                
                if (curve.length === 4) {
                    // Cubic
                    const [p0, p1, p2, p3] = curve;
                    x = Math.pow(1-t, 3) * p0[0] + 3 * Math.pow(1-t, 2) * t * p1[0] + 3 * (1-t) * Math.pow(t, 2) * p2[0] + Math.pow(t, 3) * p3[0];
                    y = Math.pow(1-t, 3) * p0[1] + 3 * Math.pow(1-t, 2) * t * p1[1] + 3 * (1-t) * Math.pow(t, 2) * p2[1] + Math.pow(t, 3) * p3[1];
                } else if (curve.length === 3) {
                    // Quadratic
                    const [p0, p1, p2] = curve;
                    x = Math.pow(1-t, 2) * p0[0] + 2 * (1-t) * t * p1[0] + Math.pow(t, 2) * p2[0];
                    y = Math.pow(1-t, 2) * p0[1] + 2 * (1-t) * t * p1[1] + Math.pow(t, 2) * p2[1];
                } else if (curve.length === 2) {
                    // Linear
                    const [p0, p1] = curve;
                    x = (1-t) * p0[0] + t * p1[0];
                    y = (1-t) * p0[1] + t * p1[1];
                }
                sampledPoints.push({ x, y });
            }
        });
        setBezierPoints(sampledPoints);
    } catch (e) {
        console.error("Bezier fit failed", e);
    }
  };

  const saveDrawnCurve = () => {
      if (bezierPoints.length > 0) {
          onAddSeries("Drawn Curve", bezierPoints);
          setDrawnPoints([]);
          setBezierPoints([]);
          setDrawMode(false);
      }
  };

  const datasets = series.flatMap(s => {
      const ds = [];
      if (s.visible) {
          ds.push({
              label: s.name,
              data: s.data,
              backgroundColor: s.color,
              borderColor: s.color,
              borderWidth: s.width,
              borderDash: s.lineStyle === 'dashed' ? [5, 5] : s.lineStyle === 'dotted' ? [2, 2] : [],
              showLine: s.showLine,
              type: "scatter" as const,
              pointRadius: s.pointSize,
              pointStyle: s.pointStyle,
          });
          
          if (s.regression.type !== 'none' && s.regressionPoints.length > 0) {
              ds.push({
                  label: `${s.name} (${s.regression.type})`,
                  data: s.regressionPoints,
                  borderColor: s.regression.color,
                  borderWidth: s.regression.width,
                  borderDash: s.regression.style === 'dashed' ? [5, 5] : s.regression.style === 'dotted' ? [2, 2] : [],
                  showLine: true,
                  pointRadius: 0,
                  type: "scatter" as const,
                  isRegression: true
              } as any);
          }

          // Render manual points handles if editing
          if (editingSeriesId === s.id && s.regression.manualPoints) {
              ds.push({
                  label: `${s.name} Handles`,
                  data: s.regression.manualPoints,
                  backgroundColor: 'rgba(255, 0, 0, 0.7)',
                  borderColor: 'white',
                  borderWidth: 2,
                  pointRadius: 6,
                  pointHoverRadius: 8,
                  type: "scatter" as const,
                  isHandle: true
              } as any);
          }
      }
      return ds;
  });

  // Add drawing datasets
  if (drawMode) {
      datasets.push({
        label: "Hand Drawn",
        data: drawnPoints,
        backgroundColor: "rgba(150, 150, 150, 0.5)",
        type: "scatter" as const,
        pointRadius: 2,
        pointStyle: 'circle',
        borderColor: "rgba(150, 150, 150, 0.5)",
        showLine: true,
        borderWidth: 1
      } as any);
      datasets.push({
        label: "Bezier Fit",
        data: bezierPoints,
        backgroundColor: "rgba(54, 162, 235, 1)",
        type: "scatter" as const,
        pointRadius: 0,
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
        showLine: true
      } as any);
  }

  const data = { datasets };

  const viewScalesRef = useRef<{ x: { min: number, max: number }, y: { min: number, max: number } } | null>(null);

  // Handle view mode changes
  useEffect(() => {
    if (viewMode === 'auto') {
        if (chartRef.current) {
            chartRef.current.resetZoom();
        }
        viewScalesRef.current = null;
    } else {
        // Manual or Locked
        // If we don't have scales yet (coming from Auto), capture them
        if (!viewScalesRef.current && chartRef.current) {
            const { x, y } = chartRef.current.scales;
            viewScalesRef.current = {
                x: { min: x.min, max: x.max },
                y: { min: y.min, max: y.max }
            };
            // Force re-render to apply these scales immediately
            forceUpdate(n => n + 1);
        }
    }
  }, [viewMode]);

  // Sync plotSettings ranges to viewScalesRef
  useEffect(() => {
      if (viewMode === 'auto') return;
      
      let changed = false;
      // Use current scales or default if not yet initialized
      const current = viewScalesRef.current ? { 
          x: { ...viewScalesRef.current.x }, 
          y: { ...viewScalesRef.current.y } 
      } : (chartRef.current ? {
          x: { min: chartRef.current.scales.x.min, max: chartRef.current.scales.x.max },
          y: { min: chartRef.current.scales.y.min, max: chartRef.current.scales.y.max }
      } : { x: {min: 0, max: 1}, y: {min: 0, max: 1} });
      
      if (plotSettings?.xMin !== undefined && Math.abs(plotSettings.xMin - current.x.min) > 1e-10) {
          current.x.min = plotSettings.xMin;
          changed = true;
      }
      if (plotSettings?.xMax !== undefined && Math.abs(plotSettings.xMax - current.x.max) > 1e-10) {
          current.x.max = plotSettings.xMax;
          changed = true;
      }
      if (plotSettings?.yMin !== undefined && Math.abs(plotSettings.yMin - current.y.min) > 1e-10) {
          current.y.min = plotSettings.yMin;
          changed = true;
      }
      if (plotSettings?.yMax !== undefined && Math.abs(plotSettings.yMax - current.y.max) > 1e-10) {
          current.y.max = plotSettings.yMax;
          changed = true;
      }
      
      if (changed) {
          viewScalesRef.current = current;
          forceUpdate(n => n + 1);
      }
  }, [plotSettings?.xMin, plotSettings?.xMax, plotSettings?.yMin, plotSettings?.yMax, viewMode]);

  const updateViewScales = ({ chart }: { chart: ChartJS }) => {
      const { x, y } = chart.scales;
      const newView = {
          x: { min: x.min, max: x.max },
          y: { min: y.min, max: y.max }
      };
      viewScalesRef.current = newView;
      onViewChange?.(newView);
  };

  const options: any = {
    scales: {
      x: {
        type: "linear" as const,
        position: "bottom" as const,
        min: viewMode !== 'auto' && viewScalesRef.current ? viewScalesRef.current.x.min : undefined,
        max: viewMode !== 'auto' && viewScalesRef.current ? viewScalesRef.current.x.max : undefined,
        title: {
            display: !!plotSettings?.xLabel,
            text: plotSettings?.xLabel,
            font: {
                size: plotSettings?.xAxisLabelFontSize || 12,
                weight: plotSettings?.xLabelStyle?.bold ? 'bold' : 'normal',
                style: plotSettings?.xLabelStyle?.italic ? 'italic' : 'normal'
            }
        },
        ticks: {
            font: {
                size: plotSettings?.xTickLabelFontSize || 10
            }
        },
        grid: {
            display: plotSettings?.showGridX !== false,
            lineWidth: plotSettings?.gridLineWidthX || 1
        },
        border: {
            width: plotSettings?.axisLineWidthX || 1
        }
      },
      y: {
        min: viewMode !== 'auto' && viewScalesRef.current ? viewScalesRef.current.y.min : undefined,
        max: viewMode !== 'auto' && viewScalesRef.current ? viewScalesRef.current.y.max : undefined,
        title: {
            display: !!plotSettings?.yLabel,
            text: plotSettings?.yLabel,
            font: {
                size: plotSettings?.yAxisLabelFontSize || 12,
                weight: plotSettings?.yLabelStyle?.bold ? 'bold' : 'normal',
                style: plotSettings?.yLabelStyle?.italic ? 'italic' : 'normal'
            }
        },
        ticks: {
            font: {
                size: plotSettings?.yTickLabelFontSize || 10
            }
        },
        grid: {
            display: plotSettings?.showGridY !== false,
            lineWidth: plotSettings?.gridLineWidthY || 1
        },
        border: {
            width: plotSettings?.axisLineWidthY || 1
        }
      }
    },
    animation: {
        duration: 0 
    },
    plugins: {
        title: {
            display: !!plotSettings?.title,
            text: plotSettings?.title,
            font: {
                size: plotSettings?.titleFontSize || 16,
                weight: plotSettings?.titleStyle?.bold ? 'bold' : 'normal',
                style: plotSettings?.titleStyle?.italic ? 'italic' : 'normal'
            }
        },
        legend: {
            display: !plotSettings?.hideSystemLegend,
            position: 'bottom',
            labels: {
                usePointStyle: true
            }
        },
        tooltip: {
            enabled: !drawMode 
        },
        zoom: {
            pan: {
                enabled: viewMode === 'manual',
                mode: 'xy',
                onPan: updateViewScales,
            },
            zoom: {
                wheel: {
                    enabled: viewMode === 'manual',
                },
                pinch: {
                    enabled: viewMode === 'manual'
                },
                mode: 'xy',
                onZoom: updateViewScales,
            }
        }
    },
    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
  };

  return (
    <div className="plot-area" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="controls">
        <button onClick={() => setDrawMode(!drawMode)} style={{ backgroundColor: drawMode ? '#ffcccc' : '' }}>
          {drawMode ? "Exit Draw Mode" : "Enter Draw Mode"}
        </button>
        {drawMode && bezierPoints.length > 0 && (
            <button onClick={saveDrawnCurve}>Save as Series</button>
        )}
        <button onClick={() => handleExport('png')}>Export PNG</button>
        <button onClick={() => handleExport('jpg')}>Export JPG</button>
        <button onClick={handleCopy}>Copy to Clipboard</button>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc', margin: '0 5px', alignSelf: 'center' }}></div>
        
        <button 
            onClick={() => setAutoCrop(!autoCrop)} 
            title={autoCrop ? "Auto Crop Enabled" : "Auto Crop Disabled"}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                backgroundColor: autoCrop ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                border: '1px solid',
                borderColor: autoCrop ? '#4caf50' : '#ccc',
                color: autoCrop ? 'inherit' : '#888',
                transition: 'all 0.2s ease'
            }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path>
                <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path>
            </svg>
            <span style={{ lineHeight: 1 }}>Auto Crop</span>
            {autoCrop && <span style={{ fontSize: '1.2em', marginLeft: '4px', lineHeight: 1, color: '#4caf50', fontWeight: 'bold' }}>✓</span>}
        </button>
      </div>
      <div 
        ref={containerRef}
        className="chart-container" 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}
      >
        <Scatter ref={chartRef} data={data} options={options} />
        
        {plotSettings?.showLegend && (
            <div 
                className="custom-legend"
                style={{
                    left: legendPos.x,
                    top: legendPos.y,
                    cursor: isDraggingLegend ? 'grabbing' : 'grab',
                    fontSize: `${plotSettings?.legendFontSize || 12}px`,
                }}
                onMouseDown={handleLegendMouseDown}
            >
                {series.filter(s => s.visible).map(s => {
                    const fontSize = plotSettings?.legendFontSize || 12;
                    const hasRegression = s.regression.type !== 'none';
                    const symbolWidth = hasRegression ? fontSize * 2.5 : fontSize * 0.8;
                    
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
                            {hasRegression && (
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: '50%',
                                    height: 0,
                                    borderTopWidth: '2px',
                                    borderTopStyle: s.regression.style as any,
                                    borderTopColor: s.regression.color,
                                    marginTop: '-1px'
                                }}></div>
                            )}
                            <div style={{
                                width: `${fontSize * 0.8}px`, 
                                height: `${fontSize * 0.8}px`, 
                                backgroundColor: s.color,
                                borderRadius: s.pointStyle === 'circle' ? '50%' : '0',
                                border: '1px solid rgba(0,0,0,0.1)',
                                zIndex: 1,
                                position: 'relative'
                            }}></div>
                        </div>
                        <span>{s.name}</span>
                    </div>
                )})}
            </div>
        )}
      </div>
    </div>
  );
}
