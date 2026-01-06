import { useContext, useState, useCallback, useRef, useEffect } from "preact/hooks";
import { createContext, ComponentChildren } from "preact";
import { Series, PlotSettings, DataPoint, ViewMode } from "../types";
import { createSeries } from "../utils";
import { save, open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useNotification } from "./NotificationContext";
import { isTauri, showInFolder } from "../platform";

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

  updatePlotSettings: (
    updates: Partial<PlotSettings> | ((prev: PlotSettings) => PlotSettings),
    skipHistory?: boolean,
  ) => void;
  setViewMode: (mode: ViewMode) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  history: HistoryAction[];
  future: HistoryAction[];
  recordAction: (description: string, undo: () => void, redo: () => void) => void;

  saveProject: (silent?: boolean) => Promise<void>;
  saveProjectAs: () => Promise<void>;
  loadProject: () => Promise<void>;

  startTransaction: () => void;
  commitTransaction: (description: string) => void;

  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;
  hasSavedPath: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const DEFAULT_PLOT_SETTINGS: PlotSettings = {
  title: "",
  titleStyle: { bold: true, italic: false },
  titleFontSize: 16,
  xLabel: "",
  xLabelStyle: { bold: true, italic: false },
  yLabel: "",
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
  axisLineWidthY: 1,
  aspectRatio: 16 / 9,
  legendPosition: { x: 60, y: 20 },
};

export function ProjectProvider({ children }: { children: ComponentChildren }) {
  const { addNotification } = useNotification();
  const [series, setSeriesState] = useState<Series[]>([]);
  const [plotSettings, setPlotSettingsState] = useState<PlotSettings>(DEFAULT_PLOT_SETTINGS);
  const [viewMode, setViewModeState] = useState<ViewMode>("auto");

  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [future, setFuture] = useState<HistoryAction[]>([]);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [hasSavedPath, setHasSavedPath] = useState(false);

  // Store current file path for Save/Save As. This is not persisted on reload currently,
  // which effectively makes reload start "untitled" until saved.
  const currentPathRef = useRef<string | null>(null);

  // Refs to access current state in closures without dependency cycles
  const seriesRef = useRef(series);
  const plotSettingsRef = useRef(plotSettings);
  const viewModeRef = useRef(viewMode);
  const transactionStartRef = useRef<{ series: Series[]; plotSettings: PlotSettings } | null>(null);

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
      timestamp: Date.now(),
    };
    setHistory((prev) => [...prev, action]);
    setFuture([]); // Clear future on new action
  }, []);

  const startTransaction = useCallback(() => {
    transactionStartRef.current = {
      series: seriesRef.current,
      plotSettings: plotSettingsRef.current,
    };
  }, []);

  const commitTransaction = useCallback(
    (description: string) => {
      if (!transactionStartRef.current) return;

      const startState = transactionStartRef.current;
      const endState = {
        series: seriesRef.current,
        plotSettings: plotSettingsRef.current,
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
        },
      );

      transactionStartRef.current = null;
    },
    [recordAction, _setSeries, _setPlotSettings],
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const action = newHistory.pop()!;

      // Execute undo
      action.undo();

      setFuture((f) => [action, ...f]);
      return newHistory;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const newFuture = [...prev];
      const action = newFuture.shift()!;

      // Execute redo
      action.redo();

      setHistory((h) => [...h, action]);
      return newFuture;
    });
  }, []);

  const addSeries = useCallback(
    (name: string, data: DataPoint[]) => {
      const newSeries = createSeries(name, data, seriesRef.current.length);
      const prevSeries = seriesRef.current;
      const nextSeries = [...prevSeries, newSeries];

      _setSeries(nextSeries);

      recordAction(
        `Add series "${name}"`,
        () => _setSeries(prevSeries),
        () => _setSeries(nextSeries),
      );
    },
    [_setSeries, recordAction],
  );

  const updateSeries = useCallback(
    (id: string, updates: Partial<Series>, skipHistory = false) => {
      const prevSeries = seriesRef.current;
      const targetSeries = prevSeries.find((s) => s.id === id);
      if (!targetSeries) return;

      const updatedSeriesItem = { ...targetSeries, ...updates };
      const nextSeries = prevSeries.map((s) => (s.id === id ? updatedSeriesItem : s));

      _setSeries(nextSeries);

      if (!skipHistory) {
        let desc = `Update series "${targetSeries.name}"`;

        // Check strictly what changed
        if (targetSeries.name !== updatedSeriesItem.name)
          desc = `Rename "${targetSeries.name}" to "${updatedSeriesItem.name}"`;
        else if (targetSeries.color !== updatedSeriesItem.color)
          desc = `Change color of "${targetSeries.name}"`;
        else if (targetSeries.visible !== updatedSeriesItem.visible)
          desc = `${updatedSeriesItem.visible ? "Show" : "Hide"} "${targetSeries.name}"`;
        else if (targetSeries.width !== updatedSeriesItem.width)
          desc = `Change line width of "${targetSeries.name}"`;
        else if (targetSeries.showLine !== updatedSeriesItem.showLine)
          desc = `${updatedSeriesItem.showLine ? "Show" : "Hide"} line of "${targetSeries.name}"`;
        else if (targetSeries.lineStyle !== updatedSeriesItem.lineStyle)
          desc = `Change line style of "${targetSeries.name}"`;
        else if (targetSeries.pointSize !== updatedSeriesItem.pointSize)
          desc = `Change point size of "${targetSeries.name}"`;
        else if (targetSeries.pointStyle !== updatedSeriesItem.pointStyle)
          desc = `Change point shape of "${targetSeries.name}"`;
        else if (JSON.stringify(targetSeries.data) !== JSON.stringify(updatedSeriesItem.data))
          desc = `Update data for "${targetSeries.name}"`;
        else if (
          JSON.stringify(targetSeries.regression) !== JSON.stringify(updatedSeriesItem.regression)
        ) {
          const newReg = updatedSeriesItem.regression;
          const oldReg = targetSeries.regression;
          const regType = newReg.type;

          if (newReg.type !== oldReg.type) {
            desc = `Change regression to ${regType} for "${targetSeries.name}"`;
          } else if (newReg.color !== oldReg.color) {
            desc = `Change regression color for "${targetSeries.name}"`;
          } else if (newReg.width !== oldReg.width) {
            desc = `Change regression line width for "${targetSeries.name}"`;
          } else if (newReg.style !== oldReg.style) {
            desc = `Change regression line style for "${targetSeries.name}"`;
          } else if (newReg.order !== oldReg.order) {
            desc = `Change regression order to ${newReg.order} for "${targetSeries.name}"`;
          } else {
            desc = `Update regression settings for "${targetSeries.name}"`;
          }
        }

        recordAction(
          desc,
          () => _setSeries(prevSeries),
          () => _setSeries(nextSeries),
        );
      }
    },
    [_setSeries, recordAction],
  );

  const removeSeries = useCallback(
    (id: string) => {
      const prevSeries = seriesRef.current;
      const targetSeries = prevSeries.find((s) => s.id === id);
      if (!targetSeries) return;

      const nextSeries = prevSeries.filter((s) => s.id !== id);

      _setSeries(nextSeries);

      recordAction(
        `Remove series "${targetSeries.name}"`,
        () => _setSeries(prevSeries),
        () => _setSeries(nextSeries),
      );
    },
    [_setSeries, recordAction],
  );

  const setSeries = useCallback(
    (newSeries: Series[], description: string = "Update series list") => {
      const prevSeries = seriesRef.current;
      _setSeries(newSeries);

      recordAction(
        description,
        () => _setSeries(prevSeries),
        () => _setSeries(newSeries),
      );
    },
    [_setSeries, recordAction],
  );

  const setViewMode = useCallback(
    (newMode: ViewMode) => {
      const prevMode = viewModeRef.current;
      if (prevMode === newMode) return;

      _setViewMode(newMode);

      recordAction(
        `Change view mode to ${newMode}`,
        () => _setViewMode(prevMode),
        () => _setViewMode(newMode),
      );
    },
    [_setViewMode, recordAction],
  );

  const updatePlotSettings = useCallback(
    (updates: Partial<PlotSettings> | ((prev: PlotSettings) => PlotSettings), skipHistory = false) => {
      const prevSettings = plotSettingsRef.current;
      let newSettings: PlotSettings;

      if (typeof updates === "function") {
        newSettings = updates(prevSettings);
      } else {
        newSettings = { ...prevSettings, ...updates };
      }

      // Check if actually changed to avoid spam
      if (JSON.stringify(prevSettings) === JSON.stringify(newSettings)) return;

      _setPlotSettings(newSettings);

      if (!skipHistory) {
        let desc = "Update plot settings";

        if (prevSettings.title !== newSettings.title)
          desc = `Change plot title to "${newSettings.title}"`;
        else if (prevSettings.xLabel !== newSettings.xLabel) desc = `Change X axis label`;
        else if (prevSettings.yLabel !== newSettings.yLabel) desc = `Change Y axis label`;
        else if (prevSettings.showGridX !== newSettings.showGridX)
          desc = `${newSettings.showGridX ? "Show" : "Hide"} X grid`;
        else if (prevSettings.showGridY !== newSettings.showGridY)
          desc = `${newSettings.showGridY ? "Show" : "Hide"} Y grid`;
        else if (prevSettings.showLegend !== newSettings.showLegend)
          desc = `${newSettings.showLegend ? "Show" : "Hide"} legend`;
        else if (
          prevSettings.xMin !== newSettings.xMin ||
          prevSettings.xMax !== newSettings.xMax
        )
          desc = "Change X axis range";
        else if (
          prevSettings.yMin !== newSettings.yMin ||
          prevSettings.yMax !== newSettings.yMax
        )
          desc = "Change Y axis range";
        else if (prevSettings.aspectRatio !== newSettings.aspectRatio) desc = "Change aspect ratio";
        else if (
          JSON.stringify(prevSettings.titleStyle) !== JSON.stringify(newSettings.titleStyle)
        )
          desc = "Change title style";
        else if (
          JSON.stringify(prevSettings.xLabelStyle) !== JSON.stringify(newSettings.xLabelStyle)
        )
          desc = "Change X label style";
        else if (
          JSON.stringify(prevSettings.yLabelStyle) !== JSON.stringify(newSettings.yLabelStyle)
        )
          desc = "Change Y label style";
        else if (
          prevSettings.hideSystemLegend !== newSettings.hideSystemLegend
        )
          desc = `${newSettings.hideSystemLegend ? "Hide" : "Show"} system legend`;
        else if (
          prevSettings.hideSystemLegendOnExport !== newSettings.hideSystemLegendOnExport
        )
          desc = `Turn ${newSettings.hideSystemLegendOnExport ? "on" : "off"} hide legend on export`;
        else if (
          JSON.stringify(prevSettings.legendPosition) !==
          JSON.stringify(newSettings.legendPosition)
        )
          desc = "Move legend";
        else if (
          prevSettings.xAxisLabelFontSize !== newSettings.xAxisLabelFontSize ||
          prevSettings.yAxisLabelFontSize !== newSettings.yAxisLabelFontSize ||
          prevSettings.xTickLabelFontSize !== newSettings.xTickLabelFontSize ||
          prevSettings.yTickLabelFontSize !== newSettings.yTickLabelFontSize ||
          prevSettings.legendFontSize !== newSettings.legendFontSize ||
          prevSettings.titleFontSize !== newSettings.titleFontSize
        )
          desc = "Change font size";
        else if (
          prevSettings.gridLineWidthX !== newSettings.gridLineWidthX ||
          prevSettings.gridLineWidthY !== newSettings.gridLineWidthY ||
          prevSettings.axisLineWidthX !== newSettings.axisLineWidthX ||
          prevSettings.axisLineWidthY !== newSettings.axisLineWidthY
        )
          desc = "Change line width";

        recordAction(
          desc,
          () => _setPlotSettings(prevSettings),
          () => _setPlotSettings(newSettings),
        );
      }
    },
    [_setPlotSettings, recordAction],
  );

  const saveProjectAs = useCallback(async () => {
    try {
      const projectData = {
        version: 1,
        series: seriesRef.current,
        plotSettings: plotSettingsRef.current,
        viewMode: viewModeRef.current,
      };
      const content = JSON.stringify(projectData, null, 2);

      if (isTauri()) {
        const path = await save({
          defaultPath: "project.lineo",
          filters: [
            {
              name: "Linéo Project",
              extensions: ["lineo", "json"],
            },
          ],
        });

        if (!path) return;

        currentPathRef.current = path; // Update current path
        setHasSavedPath(true);
        await invoke("save_text_file", { path, content });
        
        let message = `Project saved as ${path.split(/[/\\]/).pop() || "project"}`;
        const parts = path.split(/[/\\]/);
        const fileName = parts.pop();
        const folderName = parts.pop();
        if (fileName && folderName) {
          message = `Project saved as ${fileName} in ${folderName}`;
        }

        addNotification("success", message, {
          label: "Open Folder",
          onClick: () => showInFolder(path),
        });
      } else {
        const blob = new Blob([content], { type: "application/json" });

        // Check for File System Access API support
        if ("showSaveFilePicker" in window) {
          try {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: "project.lineo",
              types: [
                {
                  description: "Linéo Project",
                  accept: {
                    "application/json": [".lineo", ".json"],
                  },
                },
              ],
            });
            // Allow autosave on web if we could persist handle, but for now logic is simpler.
            // We do NOT set hasSavedPath on web unless we have a robust way to write back.
            // For now, let's assume one-off saves for web unless we invest in File System Access persistence.
            // To satisfy "impossible to click save ... if not saved-as or loaded", we'll only set it for Tauri or if we implemented FS Access fully.
            // Given context, let's treat web as always manual for now to be safe, or just manual save.
            // Actually, for this request, if "loaded" means we have content, that's different.
            // But "saved-as or loaded" usually implies file association.

            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            addNotification("success", `Project saved as ${handle.name}`);
            return;
          } catch (err: any) {
            if (err.name === "AbortError") return;
            console.error("File picker failed, falling back to download", err);
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "project.lineo";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addNotification("success", "Project saved as project.lineo");
      }
    } catch (error) {
      console.error("Failed to save project:", error);
      addNotification("error", "Failed to save project");
    }
  }, [addNotification]);

  const saveProject = useCallback(
    async (silent = false) => {
      // If we have a path (Tauri), use it.
      if (isTauri() && currentPathRef.current) {
        try {
          const projectData = {
            version: 1,
            series: seriesRef.current,
            plotSettings: plotSettingsRef.current,
            viewMode: viewModeRef.current,
          };
          const content = JSON.stringify(projectData, null, 2);
          await invoke("save_text_file", { path: currentPathRef.current, content });
          if (!silent) {
            const fileName = currentPathRef.current.split(/[/\\]/).pop() || "project";
            addNotification("success", `Project saved: ${fileName}`);
          }
        } catch (e) {
          console.error("Failed to save project:", e);
          if (!silent) addNotification("error", "Failed to save project");
        }
      } else {
        // Fallback to Save As
        await saveProjectAs();
      }
    },
    [saveProjectAs, addNotification],
  );

  const loadProject = useCallback(async () => {
    try {
      let content = "";
      let loadedFileName = "";

      if (isTauri()) {
        const path = await open({
          filters: [
            {
              name: "Linéo Project",
              extensions: ["lineo", "json"],
            },
          ],
        });

        if (!path) return;
        currentPathRef.current = path; // Update current path
        setHasSavedPath(true);
        loadedFileName = path.split(/[/\\]/).pop() || "project";
        content = (await invoke("read_text_file_custom", { path })) as string;
      } else {
        const result = await new Promise<{ content: string; name: string }>((resolve, reject) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".lineo,.json";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              resolve({ content: "", name: "" });
              return;
            }
            const reader = new FileReader();
            reader.onload = (e) => resolve({ content: e.target?.result as string, name: file.name });
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
          };
          input.click();
        });
        content = result.content;
        loadedFileName = result.name;
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
          `Load project "${loadedFileName}"`,
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
          },
        );
        addNotification("success", `Project loaded: ${loadedFileName}`);
      }
    } catch (error) {
      console.error("Failed to load project:", error);
      addNotification("error", "Failed to load project");
    }
  }, [_setSeries, _setPlotSettings, recordAction, addNotification]);

  useEffect(() => {
    if (!autoSaveEnabled || !hasSavedPath || !currentPathRef.current || !isTauri()) return;

    const timer = setTimeout(() => {
      saveProject(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [series, plotSettings, viewMode, autoSaveEnabled, hasSavedPath, saveProject]);

  return (
    <ProjectContext.Provider
      value={{
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
        saveProjectAs,
        loadProject,
        startTransaction,
        commitTransaction,
        autoSaveEnabled,
        toggleAutoSave: () => setAutoSaveEnabled((prev) => !prev),
        hasSavedPath,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
