import { useState, useEffect, useCallback } from "preact/hooks";
import "./App.css";
import { DataTab } from "./components/DataTab";
import { SettingsTab } from "./components/SettingsTab";
import { GlobalSettingsTab } from "./components/GlobalSettingsTab";
import { AnalysisTab } from "./components/AnalysisTab";
import { PlotArea } from "./components/PlotArea";
import { PlotSettings } from "./types";

import { NotificationBell } from "./components/NotificationBell";
import { NotificationPanel } from "./components/NotificationPanel";
import { ToastContainer } from "./components/ToastContainer";
import { useProject } from "./contexts/ProjectContext";
import { HistoryButton } from "./components/HistoryButton";

function App() {
  const { 
    series, 
    plotSettings, 
    viewMode,
    addSeries, 
    updateSeries, 
    setSeries, 
    updatePlotSettings, 
    setViewMode,
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    history, 
    future, 
    saveProject, 
    saveProjectAs,
    loadProject,
    startTransaction,
    commitTransaction,
    autoSaveEnabled,
    toggleAutoSave,
    hasSavedPath
  } = useProject();

  const [activeTab, setActiveTab] = useState<'data' | 'plot' | 'approx' | 'settings'>('data');
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
  
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

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Support Ctrl or Command (Meta)
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (canUndo) undo();
            break;
          case 'y':
            e.preventDefault();
            if (canRedo) redo();
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+S -> Save As
              saveProjectAs();
            } else {
              // Ctrl+S -> Save
              saveProject();
            }
            break;
          case 'o':
            e.preventDefault();
            // Ctrl+O -> Load
            loadProject();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, saveProject, saveProjectAs, loadProject]);

  const handleViewChange = (view: { x: { min: number, max: number }, y: { min: number, max: number } }) => {
      // Only update if we are in manual mode, to reflect current view in settings
      if (viewMode === 'manual' || viewMode === 'locked') {
          updatePlotSettings((prev: PlotSettings) => {
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
          }, true); // Skip history for view changes (zoom/pan)
      }
  };

  return (
    <main className="container">
      <ToastContainer />
      <div className="header-row">
        <div className="toolbar-group">
            <div className="view-control-group">
                <span className="control-label">Project</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="icon-btn labeled" onClick={() => saveProject()} disabled={!hasSavedPath} title={hasSavedPath ? "Save Project" : "Save As to enable quick save"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        <span className="btn-label">Save</span>
                    </button>
                    <button className="icon-btn labeled" onClick={saveProjectAs} title="Save Project as a new file">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                        <span className="btn-label">Save As</span>
                    </button>
                    <button className="icon-btn labeled" onClick={loadProject} title="Load existing Project">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        <span className="btn-label">Load</span>
                    </button>
                    
                    <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px', opacity: 0.3 }}></div>
                    
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', opacity: hasSavedPath ? 1 : 0.5, pointerEvents: hasSavedPath ? 'auto' : 'none'}} title={hasSavedPath ? "Toggle Auto Save" : "Save project first to enable Auto Save"}>
                        <button 
                            className={`autosave-switch ${autoSaveEnabled ? 'active' : ''}`} 
                            onClick={toggleAutoSave}
                            disabled={!hasSavedPath}
                        >
                            <span className="autosave-switch-handle">
                                {autoSaveEnabled ? 'A' : 'M'}
                            </span>
                        </button>
                        <span className="control-label" style={{marginLeft: 0}}>Auto save</span>
                    </div>
                </div>
            </div>
            <div className="divider"></div>
            <div className="view-control-group">
                <span className="control-label">History</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <HistoryButton 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>} 
                        onClick={undo} 
                        disabled={!canUndo} 
                        items={history} 
                        onItemClick={(n) => { for(let i=0; i<n; i++) undo(); }}
                        title="Undo"
                    />
                    <HistoryButton 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path></svg>} 
                        onClick={redo} 
                        disabled={!canRedo} 
                        items={future} 
                        onItemClick={(n) => { for(let i=0; i<n; i++) redo(); }}
                        title="Redo"
                    />
                </div>
            </div>
        </div>
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
                        onAddSeries={addSeries}
                    />
                )}
                {activeTab === 'plot' && (
                    <SettingsTab 
                        series={series} 
                        updateSeries={updateSeries} 
                        startTransaction={startTransaction}
                        commitTransaction={commitTransaction}
                    />
                )}
                {activeTab === 'approx' && (
                    <AnalysisTab 
                        series={series} 
                        updateSeries={updateSeries} 
                        editingSeriesId={editingSeriesId}
                        setEditingSeriesId={setEditingSeriesId}
                        startTransaction={startTransaction}
                        commitTransaction={commitTransaction}
                    />
                )}
                {activeTab === 'settings' && (
                    <GlobalSettingsTab 
                        plotSettings={plotSettings} 
                        setPlotSettings={updatePlotSettings} 
                        viewMode={viewMode}
                        startTransaction={startTransaction}
                        commitTransaction={commitTransaction}
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
                onAddSeries={addSeries}
                editingSeriesId={editingSeriesId}
                updateSeries={updateSeries}
                updatePlotSettings={updatePlotSettings}
                viewMode={viewMode}
                plotSettings={plotSettings}
                onViewChange={handleViewChange}
                startTransaction={startTransaction}
                commitTransaction={commitTransaction}
            />
        </div>
      </div>
    </main>
  );
}

export default App;
