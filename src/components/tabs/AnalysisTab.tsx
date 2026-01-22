import { Series, RegressionType, ManualParameter } from "../../types";
import { calculateRegressionDetails, getAutoParameters } from "../../regressionHelper";
import { Toggle } from "../ui/Toggle";
import { CustomSelect } from "../ui/CustomSelect";
import { NumberInput } from "../ui/NumberInput";
import { RangeInput } from "../ui/RangeInput";
import { useNotification } from "../../contexts/NotificationContext";

interface AnalysisTabProps {
  series: Series[];
  updateSeries: (id: string, updates: Partial<Series>, skipHistory?: boolean) => void;
  editingSeriesId: string | null;
  setEditingSeriesId: (id: string | null) => void;
  startTransaction?: () => void;
  commitTransaction?: (description: string) => void;
}

export function AnalysisTab({
  series,
  updateSeries,
  editingSeriesId,
  setEditingSeriesId,
  startTransaction,
  commitTransaction,
}: AnalysisTabProps) {
  const { addNotification } = useNotification();

  const updateRegression = (s: Series, regression: any, notify: boolean = true) => {
    let points: any[] = [];
    if (regression.type !== "none") {
      let manualParamsValues: Record<string, number> | undefined = undefined;
      if (regression.mode === "manual" && regression.parameters) {
        manualParamsValues = {};
        Object.entries(regression.parameters).forEach(([k, v]: [string, any]) => {
          manualParamsValues![k] = v.value;
        });
      }

      const result = calculateRegressionDetails(
        s.data,
        regression.type,
        regression.order,
        regression.forceOrigin,
        manualParamsValues,
        regression.manualPoints,
      );

      points = result.points;

      if (notify && regression.type !== "manual" && regression.type !== "spline") {
        if (result.success) {
          addNotification(
            "success",
            `Approximation found for ${s.name}: ${result.equation} (Error: ${result.error?.toExponential(2)})`,
          );
        } else {
          addNotification("error", `Approximation failed for ${s.name}: ${result.errorMessage}`);
        }
      }
    }

    updateSeries(s.id, {
      regression: regression,
      regressionPoints: points,
    });
  };

  const handleRegressionChange = (s: Series, type: RegressionType, order?: number, forceOrigin?: boolean) => {
    // Reset to auto if structural parameters change
    const shouldReset =
      type !== s.regression.type || order !== s.regression.order || forceOrigin !== s.regression.forceOrigin;

    const newRegression = {
      ...s.regression,
      type,
      order,
      forceOrigin,
      mode: shouldReset ? "auto" : s.regression.mode,
    };

    if (shouldReset) {
      newRegression.parameters = undefined;
    }

    updateRegression(s, newRegression);
  };

  const handleModeChange = (s: Series, mode: "auto" | "manual") => {
    let newParams = s.regression.parameters;

    if (mode === "manual" && !newParams) {
      const autoParams = getAutoParameters(
        s.data,
        s.regression.type,
        s.regression.order,
        s.regression.forceOrigin,
      );
      newParams = {};
      Object.entries(autoParams).forEach(([k, v]) => {
        const range = Math.abs(v) === 0 ? 10 : Math.abs(v) * 2;
        newParams![k] = {
          value: v,
          min: v - range,
          max: v + range,
        };
      });
    }

    const newRegression = { ...s.regression, mode, parameters: newParams };
    updateRegression(s, newRegression);
  };

  const handleParamChange = (s: Series, key: string, newParam: ManualParameter) => {
    const newParams = { ...s.regression.parameters, [key]: newParam };
    const newRegression = { ...s.regression, parameters: newParams };
    updateRegression(s, newRegression, false);
  };

  if (series.length === 0) return <p>No series loaded.</p>;

  return (
    <div className="analysis-tab">
      {series.map((s) => (
        <div key={s.id} className="series-analysis">
          <h4>{s.name}</h4>

          <div className="control-group">
            <label>Approximation Type:</label>
            <CustomSelect
              value={s.regression.type}
              onChange={(val) =>
                handleRegressionChange(s, val as RegressionType, s.regression.order, s.regression.forceOrigin)
              }
              options={[
                { value: "none", label: "None" },
                { value: "linear", label: "Linear" },
                { value: "polynomial", label: "Polynomial" },
                { value: "exponential", label: "Exponential" },
                { value: "logarithmic", label: "Logarithmic" },
                { value: "power", label: "Power" },
                { value: "sqrt", label: "Square Root" },
                { value: "sinusoidal", label: "Sinusoidal (Basic)" },
                { value: "negativeExponential", label: "Negative Exponential" },
                { value: "spline", label: "Spline Interpolation" },
                { value: "manual", label: "Manual (Hand Drawn)" },
              ]}
            />
          </div>

          {s.regression.type === "manual" && (
            <div className="control-group">
              <button
                onClick={() => setEditingSeriesId(editingSeriesId === s.id ? null : s.id)}
                className={`edit-points-btn ${editingSeriesId === s.id ? "active" : ""}`}
              >
                {editingSeriesId === s.id ? "Stop Editing Points" : "Edit Points"}
              </button>
              <p className="help-text">Click on plot to add points. Drag to move. Right-click to delete.</p>
            </div>
          )}

          {["linear", "polynomial", "sqrt", "sinusoidal", "negativeExponential"].includes(
            s.regression.type,
          ) && (
            <div className="control-group">
              <Toggle
                label="Force Origin (0,0)"
                checked={s.regression.forceOrigin || false}
                onChange={(checked) =>
                  handleRegressionChange(s, s.regression.type, s.regression.order, checked)
                }
                onLabel="Yes"
                offLabel="No"
              />
            </div>
          )}

          {s.regression.type === "polynomial" && (
            <div className="control-group">
              <NumberInput
                label={`Degree: ${s.regression.order || 2}`}
                min="2"
                max="10"
                value={s.regression.order || 2}
                onChange={(val) =>
                  handleRegressionChange(s, "polynomial", val || 2, s.regression.forceOrigin)
                }
              />
            </div>
          )}

          {s.regression.type !== "none" && s.regression.type !== "manual" && (
            <>
              <div className="control-group">
                <Toggle
                  label="Toggle manual mode"
                  checked={s.regression.mode === "manual"}
                  onChange={(checked) => handleModeChange(s, checked ? "manual" : "auto")}
                  onLabel="Manual"
                  offLabel="Auto"
                />
              </div>

              {s.regression.mode === "manual" && s.regression.parameters && (
                <div className="manual-parameters" style={{ marginTop: "10px", marginBottom: "10px" }}>
                  {Object.entries(s.regression.parameters).map(([key, param]) => (
                    <div key={key} className="parameter-control">
                      <label
                        style={{
                          fontWeight: "bold",
                          display: "block",
                          marginBottom: "5px",
                        }}
                      >
                        {key}
                      </label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          marginBottom: "5px",
                        }}
                      >
                        <input
                          type="number"
                          value={param.min}
                          onChange={(e) =>
                            handleParamChange(s, key, {
                              ...param,
                              min: parseFloat(e.currentTarget.value),
                            })
                          }
                          style={{ width: "60px" }}
                          title="Min Value"
                        />
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={(param.max - param.min) / 100}
                          value={param.value}
                          onInput={(e) =>
                            handleParamChange(s, key, {
                              ...param,
                              value: parseFloat(e.currentTarget.value),
                            })
                          }
                          style={{ flex: 1 }}
                        />
                        <input
                          type="number"
                          value={param.max}
                          onChange={(e) =>
                            handleParamChange(s, key, {
                              ...param,
                              max: parseFloat(e.currentTarget.value),
                            })
                          }
                          style={{ width: "60px" }}
                          title="Max Value"
                        />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          value={param.value}
                          onChange={(e) =>
                            handleParamChange(s, key, {
                              ...param,
                              value: parseFloat(e.currentTarget.value),
                            })
                          }
                          style={{ width: "100px" }}
                          title="Current Value"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {s.regression.type !== "none" && (
            <>
              <div className="control-group">
                <label>Line Color:</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="color"
                    value={s.regression.color}
                    disabled={s.regression.syncColor}
                    onInput={(e) =>
                      updateSeries(s.id, {
                        regression: { ...s.regression, color: e.currentTarget.value },
                      })
                    }
                    style={{
                      height: "30px",
                      width: "50px",
                      padding: "0 2px",
                      cursor: s.regression.syncColor ? "not-allowed" : "pointer",
                      opacity: s.regression.syncColor ? 0.5 : 1,
                    }}
                  />
                  <Toggle
                    label="Sync"
                    checked={s.regression.syncColor || false}
                    onChange={(checked) =>
                      updateSeries(s.id, {
                        regression: { ...s.regression, syncColor: checked },
                      })
                    }
                    onLabel="On"
                    offLabel="Off"
                  />
                  <button
                    disabled={s.regression.syncColor}
                    onClick={() =>
                      updateSeries(s.id, {
                        regression: { ...s.regression, color: s.color },
                      })
                    }
                    title="One-time sync from point color"
                    style={{ padding: "4px 8px", fontSize: "0.8em", whiteSpace: "nowrap" }}
                  >
                    Sync Now
                  </button>
                </div>
              </div>
              <RangeInput
                label="Line Width"
                value={s.regression.width}
                onPointerDown={() => startTransaction?.()}
                onPointerUp={() => commitTransaction?.("Change regression width")}
                onMouseDown={() => startTransaction?.()}
                onMouseUp={() => commitTransaction?.("Change regression width")}
                onInput={(val) => updateSeries(s.id, { regression: { ...s.regression, width: val } }, true)}
                onChange={() => {}}
                min="1"
                max="10"
                unit="px"
              />
              <div className="control-group">
                <label>Line Style:</label>
                <CustomSelect
                  value={s.regression.style}
                  onChange={(val) =>
                    updateSeries(s.id, {
                      regression: { ...s.regression, style: val as any },
                    })
                  }
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "dashed", label: "Dashed" },
                    { value: "dotted", label: "Dotted" },
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
