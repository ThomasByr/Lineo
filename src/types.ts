export interface DataPoint {
  x: number;
  y: number;
}

export type RegressionType = 
  | 'none'
  | 'linear' 
  | 'polynomial' 
  | 'exponential' 
  | 'logarithmic' 
  | 'power'
  | 'sqrt'
  | 'sinusoidal'
  | 'negativeExponential'
  | 'spline'
  | 'manual';

export interface ManualParameter {
  value: number;
  min: number;
  max: number;
}

export interface RegressionSettings {
  type: RegressionType;
  order?: number; // For polynomial
  forceOrigin?: boolean; // For linear
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  
  mode: 'auto' | 'manual';
  parameters?: Record<string, ManualParameter>;
  manualPoints?: DataPoint[];
}

export interface Series {
  id: string;
  name: string;
  data: DataPoint[];
  visible: boolean;
  // Visual settings
  color: string;
  width: number;
  showLine: boolean;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  pointSize: number;
  pointStyle: 'circle' | 'rect' | 'triangle' | 'cross' | 'star';
  // Regression/Approximation
  regression: RegressionSettings;
  regressionPoints: DataPoint[]; // Calculated points
}

export interface PlotSettings {
  title: string;
  titleFontSize: number;
  xLabel: string;
  yLabel: string;
  xAxisLabelFontSize: number;
  yAxisLabelFontSize: number;
  xTickLabelFontSize: number;
  yTickLabelFontSize: number;
  showLegend: boolean;
  hideSystemLegendOnExport: boolean;
  legendFontSize: number;
  showGridX: boolean;
  showGridY: boolean;
  gridLineWidthX: number;
  gridLineWidthY: number;
  axisLineWidthX: number;
  axisLineWidthY: number;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
}

export type ViewMode = 'auto' | 'manual' | 'locked';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  read: boolean;
}
