import { useState, useEffect, useCallback } from "preact/hooks";
import "./App.css";
import { DataTab } from "./components/DataTab";
import { SettingsTab } from "./components/SettingsTab";
import { GlobalSettingsTab } from "./components/GlobalSettingsTab";
import { AnalysisTab } from "./components/AnalysisTab";
import { PlotArea } from "./components/PlotArea";
import { Series, DataPoint, ViewMode, PlotSettings } from "./types";
import { createSeries } from "./utils";

import { NotificationBell } from "./components/NotificationBell";
import { NotificationPanel } from "./components/NotificationPanel";
import { ToastContainer } from "./components/ToastContainer";

function App() {
  const [series, setSeries] = useState<Series[]>([]);
  const [activeTab, setActiveTab] = useState<'data' | 'plot' | 'approx' | 'settings'>('data');
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('auto');
  
  const [plotSettings, setPlotSettings] = useState<PlotSettings>({
    title: '',
    titleStyle: { bold: true, italic: false },
    titleFontSize: 16,
    xLabel: '',
    xLabelStyle: { bold: true, italic: false },
    yLabel: '',
    yLabelStyle: { bold: true, italic: false },
    xAxisLabelFontSize: 12,
    yAxisLabelFontSize: 12,
    xTickLabelFontSize: 10,
    yTickLabelFontSize: 10,
    showLegend: true,
    hideSystemLegend: true,
    hideSystemLegendOnExport: true,
    legendFontSize: 12,
    showGridX: true,
    showGridY: true,
    gridLineWidthX: 1,
    gridLineWidthY: 1,
    axisLineWidthX: 1,
    axisLineWidthY: 1
  });


  // Persistent Settings
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  // Sidebar Resizing
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX - 20; // 20px padding
      if (newWidth > 250 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  useEffect(() => {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [theme]);

  const updateSeries = (id: string, updates: Partial<Series>) => {
      setSeries(series.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleAddSeries = (name: string, data: DataPoint[]) => {
      const newSeries = createSeries(name, data, series.length);
      setSeries(prev => [...prev, newSeries]);
  };

  const handleViewChange = (view: { x: { min: number, max: number }, y: { min: number, max: number } }) => {
      // Only update if we are in manual mode, to reflect current view in settings
      if (viewMode === 'manual' || viewMode === 'locked') {
          // We use a functional update to avoid dependency on plotSettings
          setPlotSettings(prev => {
              // Only update if values are significantly different to avoid loops/jitters
              if (
                  Math.abs((prev.xMin ?? 0) - view.x.min) < 1e-10 &&
                  Math.abs((prev.xMax ?? 0) - view.x.max) < 1e-10 &&
                  Math.abs((prev.yMin ?? 0) - view.y.min) < 1e-10 &&
                  Math.abs((prev.yMax ?? 0) - view.y.max) < 1e-10
              ) {
                  return prev;
              }
              return {
                  ...prev,
                  xMin: view.x.min,
                  xMax: view.x.max,
                  yMin: view.y.min,
                  yMax: view.y.max
              };
          });
      }
  };

  return (
    <main className="container">
      <ToastContainer />
      <div className="header-row">
        <h1>Linéo <span className="app-version">v{__APP_VERSION__}</span></h1>
        <div className="header-controls">
            <div className="view-control-group">
                <span className="control-label">Zoom & View</span>
                <div className="view-mode-toggle">
                    <div 
                        className="view-mode-slider" 
                        style={{
                            transform: `translateX(calc(${['auto', 'manual', 'locked'].indexOf(viewMode)} * (100% + 4px)))`
                        }}
                    />
                    <div 
                        className={`view-mode-option ${viewMode === 'auto' ? 'active' : ''}`}
                        onClick={() => setViewMode('auto')}
                        title="Auto-scale to fit data"
                    >
                        <span>🔍 Auto</span>
                    </div>
                    <div 
                        className={`view-mode-option ${viewMode === 'manual' ? 'active' : ''}`}
                        onClick={() => setViewMode('manual')}
                        title="Pan and Zoom freely"
                    >
                        <span>✋ Manual</span>
                    </div>
                    <div 
                        className={`view-mode-option ${viewMode === 'locked' ? 'active' : ''}`}
                        onClick={() => setViewMode('locked')}
                        title="Lock view to draw/edit"
                    >
                        <span>🔒 Locked</span>
                    </div>
                </div>
            </div>
            <div className="divider"></div>
            <div className="view-control-group">
                <span className="control-label">Theme</span>
                <button 
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                    className={`theme-switch ${theme}`}
                    title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                >
                    <span className="theme-switch-handle">
                        {theme === 'light' ? '☀️' : '🌙'}
                    </span>
                </button>
            </div>
            <div className="divider"></div>
            <div className="view-control-group">
                <span className="control-label">Notifications</span>
                <NotificationBell />
                <NotificationPanel />
            </div>
        </div>
      </div>
      
      <div className="app-layout">
        <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
            <div className="sidebar-tabs">
                <button 
                    className={activeTab === 'data' ? 'active' : ''} 
                    onClick={() => setActiveTab('data')}
                >Data</button>
                <button 
                    className={activeTab === 'plot' ? 'active' : ''} 
                    onClick={() => setActiveTab('plot')}
                >Plot</button>
                <button 
                    className={activeTab === 'approx' ? 'active' : ''} 
                    onClick={() => setActiveTab('approx')}
                >Approx</button>
                <button 
                    className={activeTab === 'settings' ? 'active' : ''} 
                    onClick={() => setActiveTab('settings')}
                >Settings</button>
            </div>
            
            <div className="sidebar-content">
                {activeTab === 'data' && (
                    <DataTab 
                        series={series} 
                        setSeries={setSeries} 
                        updateSeries={updateSeries} 
                        onAddSeries={handleAddSeries}
                    />
                )}
                {activeTab === 'plot' && (
                    <SettingsTab series={series} updateSeries={updateSeries} />
                )}
                {activeTab === 'approx' && (
                    <AnalysisTab 
                        series={series} 
                        updateSeries={updateSeries} 
                        editingSeriesId={editingSeriesId}
                        setEditingSeriesId={setEditingSeriesId}
                    />
                )}
                {activeTab === 'settings' && (
                    <GlobalSettingsTab 
                        plotSettings={plotSettings} 
                        setPlotSettings={setPlotSettings} 
                        viewMode={viewMode}
                    />
                )}
            </div>
        </div>

        <div 
            className={`resizer ${isResizing ? 'resizing' : ''}`}
            onMouseDown={startResizing as any}
        ></div>

        <div className="main-content">
            <PlotArea 
                series={series}
                onAddSeries={handleAddSeries}
                editingSeriesId={editingSeriesId}
                updateSeries={updateSeries}
                viewMode={viewMode}
                plotSettings={plotSettings}
                onViewChange={handleViewChange}
            />
        </div>
      </div>
    </main>
  );
}

export default App;
