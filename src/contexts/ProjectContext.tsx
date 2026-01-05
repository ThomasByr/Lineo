import { useContext, useState, useCallback, useRef } from "preact/hooks";
import { createContext, ComponentChildren } from "preact";
import { Series, PlotSettings, DataPoint, ViewMode } from "../types";
import { createSeries } from "../utils";
import { save, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useNotification } from "./NotificationContext";
import { isTauri } from "../platform";

interface HistoryAction {
    description: string;
    undo: () => void;
    redo: () => void;
    timestamp: number;
}

interface ProjectContextType {
    series: Series[];
    plotSettings: PlotSettings;
    viewMode: ViewMode;
    
    addSeries: (name: string, data: DataPoint[]) => void;
    updateSeries: (id: string, updates: Partial<Series>, skipHistory?: boolean) => void;
    removeSeries: (id: string) => void;
    setSeries: (series: Series[], description?: string) => void;
    
    updatePlotSettings: (updates: Partial<PlotSettings> | ((prev: PlotSettings) => PlotSettings), skipHistory?: boolean) => void;
    setViewMode: (mode: ViewMode) => void;
    
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    history: HistoryAction[];
    future: HistoryAction[];
    recordAction: (description: string, undo: () => void, redo: () => void) => void;
    
    saveProject: () => Promise<void>;
    loadProject: () => Promise<void>;
    
    startTransaction: () => void;
    commitTransaction: (description: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const DEFAULT_PLOT_SETTINGS: PlotSettings = {
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
};

export function ProjectProvider({ children }: { children: ComponentChildren }) {
    const { addNotification } = useNotification();
    const [series, setSeriesState] = useState<Series[]>([]);
    const [plotSettings, setPlotSettingsState] = useState<PlotSettings>(DEFAULT_PLOT_SETTINGS);
    const [viewMode, setViewModeState] = useState<ViewMode>('auto');
    
    const [history, setHistory] = useState<HistoryAction[]>([]);
    const [future, setFuture] = useState<HistoryAction[]>([]);

    // Refs to access current state in closures without dependency cycles
    const seriesRef = useRef(series);
    const plotSettingsRef = useRef(plotSettings);
    const viewModeRef = useRef(viewMode);
    const transactionStartRef = useRef<{ series: Series[], plotSettings: PlotSettings } | null>(null);
    
    // Update refs when state changes
    seriesRef.current = series;
    plotSettingsRef.current = plotSettings;
    viewModeRef.current = viewMode;

    const _setSeries = useCallback((newSeries: Series[]) => {
        setSeriesState(newSeries);
        seriesRef.current = newSeries;
    }, []);

    const _setPlotSettings = useCallback((newSettings: PlotSettings) => {
        setPlotSettingsState(newSettings);
        plotSettingsRef.current = newSettings;
    }, []);

    const _setViewMode = useCallback((newMode: ViewMode) => {
        setViewModeState(newMode);
        viewModeRef.current = newMode;
    }, []);

    const recordAction = useCallback((description: string, undo: () => void, redo: () => void) => {
        const action: HistoryAction = {
            description,
            undo,
            redo,
            timestamp: Date.now()
        };
        setHistory(prev => [...prev, action]);
        setFuture([]); // Clear future on new action
    }, []);

    const startTransaction = useCallback(() => {
        transactionStartRef.current = {
            series: seriesRef.current,
            plotSettings: plotSettingsRef.current
        };
    }, []);

    const commitTransaction = useCallback((description: string) => {
        if (!transactionStartRef.current) return;
        
        const startState = transactionStartRef.current;
        const endState = {
            series: seriesRef.current,
            plotSettings: plotSettingsRef.current
        };
        
        // Only record if changed
        if (JSON.stringify(startState) === JSON.stringify(endState)) {
            transactionStartRef.current = null;
            return;
        }

        recordAction(
            description,
            () => {
                _setSeries(startState.series);
                _setPlotSettings(startState.plotSettings);
            },
            () => {
                _setSeries(endState.series);
                _setPlotSettings(endState.plotSettings);
            }
        );
        
        transactionStartRef.current = null;
    }, [recordAction, _setSeries, _setPlotSettings]);

    const undo = useCallback(() => {
        setHistory(prev => {
            if (prev.length === 0) return prev;
            const newHistory = [...prev];
            const action = newHistory.pop()!;
            
            // Execute undo
            action.undo();
            
            setFuture(f => [action, ...f]);
            return newHistory;
        });
    }, []);

    const redo = useCallback(() => {
        setFuture(prev => {
            if (prev.length === 0) return prev;
            const newFuture = [...prev];
            const action = newFuture.shift()!;
            
            // Execute redo
            action.redo();
            
            setHistory(h => [...h, action]);
            return newFuture;
        });
    }, []);

    const addSeries = useCallback((name: string, data: DataPoint[]) => {
        const newSeries = createSeries(name, data, seriesRef.current.length);
        const prevSeries = seriesRef.current;
        const nextSeries = [...prevSeries, newSeries];
        
        _setSeries(nextSeries);
        
        recordAction(
            `Add series "${name}"`,
            () => _setSeries(prevSeries),
            () => _setSeries(nextSeries)
        );
    }, [_setSeries, recordAction]);

    const updateSeries = useCallback((id: string, updates: Partial<Series>, skipHistory = false) => {
        const prevSeries = seriesRef.current;
        const targetSeries = prevSeries.find(s => s.id === id);
        if (!targetSeries) return;

        const updatedSeriesItem = { ...targetSeries, ...updates };
        const nextSeries = prevSeries.map(s => s.id === id ? updatedSeriesItem : s);
        
        _setSeries(nextSeries);

        if (!skipHistory) {
            recordAction(
                `Update series "${targetSeries.name}"`,
                () => _setSeries(prevSeries),
                () => _setSeries(nextSeries)
            );
        }
    }, [_setSeries, recordAction]);

    const removeSeries = useCallback((id: string) => {
        const prevSeries = seriesRef.current;
        const targetSeries = prevSeries.find(s => s.id === id);
        if (!targetSeries) return;

        const nextSeries = prevSeries.filter(s => s.id !== id);
        
        _setSeries(nextSeries);
        
        recordAction(
            `Remove series "${targetSeries.name}"`,
            () => _setSeries(prevSeries),
            () => _setSeries(nextSeries)
        );
    }, [_setSeries, recordAction]);

    const setSeries = useCallback((newSeries: Series[], description: string = "Update series list") => {
        const prevSeries = seriesRef.current;
        _setSeries(newSeries);
        
        recordAction(
            description,
            () => _setSeries(prevSeries),
            () => _setSeries(newSeries)
        );
    }, [_setSeries, recordAction]);

    const setViewMode = useCallback((newMode: ViewMode) => {
        const prevMode = viewModeRef.current;
        if (prevMode === newMode) return;

        _setViewMode(newMode);
        
        recordAction(
            `Change view mode to ${newMode}`,
            () => _setViewMode(prevMode),
            () => _setViewMode(newMode)
        );
    }, [_setViewMode, recordAction]);

    const updatePlotSettings = useCallback((updates: Partial<PlotSettings> | ((prev: PlotSettings) => PlotSettings), skipHistory = false) => {
        const prevSettings = plotSettingsRef.current;
        let newSettings: PlotSettings;
        
        if (typeof updates === 'function') {
            newSettings = updates(prevSettings);
        } else {
            newSettings = { ...prevSettings, ...updates };
        }
        
        // Check if actually changed to avoid spam
        if (JSON.stringify(prevSettings) === JSON.stringify(newSettings)) return;

        _setPlotSettings(newSettings);

        if (!skipHistory) {
            recordAction(
                "Update plot settings",
                () => _setPlotSettings(prevSettings),
                () => _setPlotSettings(newSettings)
            );
        }
    }, [_setPlotSettings, recordAction]);

    const saveProject = useCallback(async () => {
        try {
            const projectData = {
                version: 1,
                series: seriesRef.current,
                plotSettings: plotSettingsRef.current,
                viewMode: viewModeRef.current
            };
            const content = JSON.stringify(projectData, null, 2);

            if (isTauri()) {
                const path = await save({
                    defaultPath: 'project.lineo',
                    filters: [{
                        name: 'Linéo Project',
                        extensions: ['lineo', 'json']
                    }]
                });
                
                if (!path) return;

                await invoke('save_text_file', { path, content });
            } else {
                const blob = new Blob([content], { type: 'application/json' });
                
                // Check for File System Access API support
                if ('showSaveFilePicker' in window) {
                    try {
                        const handle = await (window as any).showSaveFilePicker({
                            suggestedName: 'project.lineo',
                            types: [{
                                description: 'Linéo Project',
                                accept: {
                                    'application/json': ['.lineo', '.json']
                                }
                            }]
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        addNotification('success', 'Project saved successfully');
                        return;
                    } catch (err: any) {
                        if (err.name === 'AbortError') return;
                        console.error("File picker failed, falling back to download", err);
                    }
                }

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'project.lineo';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            addNotification('success', 'Project saved successfully');
        } catch (error) {
            console.error('Failed to save project:', error);
            addNotification('error', 'Failed to save project');
        }
    }, [addNotification]);

    const loadProject = useCallback(async () => {
        try {
            let content = "";

            if (isTauri()) {
                const path = await open({
                    filters: [{
                        name: 'Linéo Project',
                        extensions: ['lineo', 'json']
                    }]
                });

                if (!path) return;
                content = await invoke('read_text_file_custom', { path }) as string;
            } else {
                content = await new Promise<string>((resolve, reject) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.lineo,.json';
                    input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) {
                            resolve("");
                            return;
                        }
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.onerror = (e) => reject(e);
                        reader.readAsText(file);
                    };
                    input.click();
                });
                if (!content) return;
            }

            const projectData = JSON.parse(content);

            if (projectData.version === 1) {
                const prevSeries = seriesRef.current;
                const prevSettings = plotSettingsRef.current;
                const prevViewMode = viewModeRef.current;
                
                _setSeries(projectData.series);
                _setPlotSettings(projectData.plotSettings);
                if (projectData.viewMode) {
                    _setViewMode(projectData.viewMode);
                }
                
                // Clear history on load? Or make load an action?
                // Usually load clears history or is a major action.
                // Let's make it an action so we can undo the load.
                recordAction(
                    "Load project",
                    () => {
                        _setSeries(prevSeries);
                        _setPlotSettings(prevSettings);
                        _setViewMode(prevViewMode);
                    },
                    () => {
                        _setSeries(projectData.series);
                        _setPlotSettings(projectData.plotSettings);
                        if (projectData.viewMode) {
                            _setViewMode(projectData.viewMode);
                        }
                    }
                );
                addNotification('success', 'Project loaded successfully');
            }
        } catch (error) {
            console.error('Failed to load project:', error);
            addNotification('error', 'Failed to load project');
        }
    }, [_setSeries, _setPlotSettings, recordAction, addNotification]);

    return (
        <ProjectContext.Provider value={{
            series,
            plotSettings,
            viewMode,
            addSeries,
            updateSeries,
            removeSeries,
            setSeries,
            updatePlotSettings,
            setViewMode,
            undo,
            redo,
            canUndo: history.length > 0,
            canRedo: future.length > 0,
            history,
            future,
            recordAction,
            saveProject,
            loadProject,
            startTransaction,
            commitTransaction
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
}
