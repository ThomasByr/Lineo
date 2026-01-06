// @ts-ignore
import * as regression from "regression";
import { DataPoint, RegressionType } from "./types";

function simpleLinearRegression(data: [number, number][]): { m: number; c: number } {
  const n = data.length;
  if (n === 0) return { m: 0, c: 0 };
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (const [x, y] of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { m: 0, c: 0 };

  const m = (n * sumXY - sumX * sumY) / denominator;
  const c = (sumY - m * sumX) / n;
  return { m, c };
}

function linearRegressionOrigin(data: [number, number][]): { m: number } {
  let sumXY = 0,
    sumXX = 0;
  for (const [x, y] of data) {
    sumXY += x * y;
    sumXX += x * x;
  }
  if (sumXX === 0) return { m: 0 };
  return { m: sumXY / sumXX };
}

function solveGaussian(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augment A with b
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    // Eliminate
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += M[i][j] * x[j];
    }
    x[i] = (M[i][n] - sum) / M[i][i];
  }
  return x;
}

function polynomialRegressionOrigin(data: [number, number][], order: number): number[] {
  // y = a1*x + a2*x^2 + ... + an*x^n
  // Normal equations: X'X a = X'y
  // (X'X)_ij = sum(x^(i+j)) for i,j in 1..order
  // (X'y)_i = sum(y * x^i) for i in 1..order

  const n = order;
  const A = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));
  const b = Array(n).fill(0);

  // Precompute powers sums to optimize? Or just iterate.
  // Data length might be large, so iterating once is better.
  // But we need powers up to 2*order.

  // Let's just iterate data for each element of matrix.
  // Optimization: sum_pow[k] = sum(x^k)
  const maxPow = 2 * n;
  const sumX = new Array(maxPow + 1).fill(0);
  const sumXY = new Array(n + 1).fill(0);

  for (const [x, y] of data) {
    let xp = x;
    for (let k = 1; k <= maxPow; k++) {
      sumX[k] += xp;
      if (k <= n) {
        sumXY[k] += y * xp; // y * x^k
      }
      xp *= x;
    }
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Matrix indices 0..n-1 correspond to powers 1..n
      // Power is (i+1) + (j+1) = i+j+2
      A[i][j] = sumX[i + j + 2];
    }
    b[i] = sumXY[i + 1];
  }

  return solveGaussian(A, b);
}

function fitNegativeExponential(
  data: [number, number][],
  forceOrigin: boolean,
): { a: number; b: number; c: number } | null {
  const n = data.length;
  if (n < 3) return null;

  const yMin = Math.min(...data.map((p) => p[1]));
  const yMax = Math.max(...data.map((p) => p[1]));
  const yRange = yMax - yMin || 1;

  let bestSSE = Infinity;
  let bestParams = null;

  const steps = 50;

  // Try increasing (asymptote > yMax)
  for (let i = 1; i <= steps; i++) {
    const a = yMax + yRange * ((i / steps) * 5 + 0.01);

    let cParam = 0;
    let bParam = 0;

    if (forceOrigin) {
      // y = a(1 - exp(-cx)) -> ln(1 - y/a) = -cx
      const validPoints: [number, number][] = [];
      for (const [x, y] of data) {
        validPoints.push([x, Math.log(1 - y / a)]);
      }

      const { m } = linearRegressionOrigin(validPoints);
      cParam = -m;
      bParam = a;
    } else {
      // y = a - B * exp(-cx) -> ln(a - y) = ln(B) - cx
      const validPoints: [number, number][] = [];
      for (const [x, y] of data) {
        validPoints.push([x, Math.log(a - y)]);
      }

      const { m, c } = simpleLinearRegression(validPoints);
      cParam = -m;
      bParam = Math.exp(c);
    }

    let sse = 0;
    for (const [x, y] of data) {
      const pred = a - bParam * Math.exp(-cParam * x);
      sse += (y - pred) ** 2;
    }

    if (sse < bestSSE) {
      bestSSE = sse;
      bestParams = { a, b: bParam, c: cParam };
    }
  }

  // Try decreasing (asymptote < yMin) - only if not forcing origin (or if we handle negative growth from 0)
  if (!forceOrigin) {
    for (let i = 1; i <= steps; i++) {
      const a = yMin - yRange * ((i / steps) * 5 + 0.01);
      // y = a + B * exp(-cx) -> ln(y - a) = ln(B) - cx

      const validPoints: [number, number][] = [];
      for (const [x, y] of data) {
        if (y > a) validPoints.push([x, Math.log(y - a)]);
      }

      if (validPoints.length < 3) continue;

      const { m, c } = simpleLinearRegression(validPoints);
      const cParam = -m;
      const B = Math.exp(c);

      let sse = 0;
      for (const [x, y] of data) {
        const pred = a + B * Math.exp(-cParam * x);
        sse += (y - pred) ** 2;
      }

      if (sse < bestSSE) {
        bestSSE = sse;
        bestParams = { a, b: -B, c: cParam };
      }
    }
  }

  return bestParams;
}

export function getAutoParameters(
  data: DataPoint[],
  type: RegressionType,
  order?: number,
  forceOrigin?: boolean,
): Record<string, number> {
  const points: [number, number][] = data.map((p) => [p.x, p.y]);

  if (type === "linear") {
    if (forceOrigin) {
      const { m } = linearRegressionOrigin(points);
      return { m, c: 0 };
    } else {
      const { m, c } = simpleLinearRegression(points);
      return { m, c };
    }
  } else if (type === "polynomial") {
    if (forceOrigin) {
      const coeffs = polynomialRegressionOrigin(points, order || 2);
      const params: Record<string, number> = { a0: 0 };
      coeffs.forEach((c, i) => {
        params[`a${i + 1}`] = c;
      });
      return params;
    } else {
      const result = regression.polynomial(points, { order: order || 2 });
      const params: Record<string, number> = {};
      result.equation.forEach((c: number, i: number) => {
        params[`a${i}`] = c;
      });
      return params;
    }
  } else if (type === "exponential") {
    const validPoints = points.filter((p) => p[1] > 0).map((p) => [p[0], Math.log(p[1])] as [number, number]);
    if (validPoints.length > 1) {
      const { m: b, c: lnA } = simpleLinearRegression(validPoints);
      return { a: Math.exp(lnA), b };
    }
  } else if (type === "logarithmic") {
    const validPoints = points.filter((p) => p[0] > 0).map((p) => [Math.log(p[0]), p[1]] as [number, number]);
    if (validPoints.length > 1) {
      const { m: b, c: a } = simpleLinearRegression(validPoints);
      return { a, b };
    }
  } else if (type === "power") {
    const validPoints = points
      .filter((p) => p[0] > 0 && p[1] > 0)
      .map((p) => [Math.log(p[0]), Math.log(p[1])] as [number, number]);
    if (validPoints.length > 1) {
      const { m: b, c: lnA } = simpleLinearRegression(validPoints);
      return { a: Math.exp(lnA), b };
    }
  } else if (type === "sqrt") {
    const validPoints = points
      .filter((p) => p[0] >= 0)
      .map((p) => [Math.sqrt(p[0]), p[1]] as [number, number]);
    if (validPoints.length > 0) {
      if (forceOrigin) {
        const { m } = linearRegressionOrigin(validPoints);
        return { m, c: 0 };
      } else if (validPoints.length > 1) {
        const { m, c } = simpleLinearRegression(validPoints);
        return { m, c };
      }
    }
  } else if (type === "sinusoidal") {
    const transformed: [number, number][] = points.map((p) => [Math.sin(p[0]), p[1]]);
    if (forceOrigin) {
      const { m } = linearRegressionOrigin(transformed);
      return { m, c: 0 };
    } else {
      const { m, c } = simpleLinearRegression(transformed);
      return { m, c };
    }
  } else if (type === "negativeExponential") {
    const result = fitNegativeExponential(points, forceOrigin || false);
    if (result) {
      return result;
    }
  } else if (type === "spline") {
    return { tension: 0.5 };
  }
  return {};
}

export function getPredictFunction(
  type: RegressionType,
  params: Record<string, number>,
): ((x: number) => number) | null {
  if (type === "linear") {
    return (x) => params.m * x + (params.c || 0);
  } else if (type === "polynomial") {
    return (x) => {
      let y = 0;
      let xp = 1;
      let i = 0;
      // We assume params are a0, a1, ...
      // But we need to know how many. We can iterate keys or just check existence.
      // Better to iterate up to a reasonable max or check keys.
      // Since we don't know the order here easily without passing it, we'll iterate keys that match a\d+
      // Or just loop until undefined.
      while (params[`a${i}`] !== undefined) {
        y += params[`a${i}`] * xp;
        xp *= x;
        i++;
      }
      return y;
    };
  } else if (type === "exponential") {
    return (x) => params.a * Math.exp(params.b * x);
  } else if (type === "logarithmic") {
    return (x) => params.a + params.b * Math.log(x);
  } else if (type === "power") {
    return (x) => params.a * Math.pow(x, params.b);
  } else if (type === "sqrt") {
    return (x) => params.m * Math.sqrt(x) + (params.c || 0);
  } else if (type === "sinusoidal") {
    return (x) => params.m * Math.sin(x) + (params.c || 0);
  } else if (type === "negativeExponential") {
    return (x) => params.a - params.b * Math.exp(-params.c * x);
  }
  return null;
}

function calculateSpline(points: DataPoint[], tension: number = 0.5): DataPoint[] {
  if (points.length < 2) return [];

  const sortedPoints = [...points].sort((a, b) => a.x - b.x);
  const splinePoints: DataPoint[] = [];

  // Catmull-Rom Spline
  // Duplicate start and end points to ensure curve passes through them
  const p = [sortedPoints[0], ...sortedPoints, sortedPoints[sortedPoints.length - 1]];

  const numSegments = 20;

  for (let i = 0; i < p.length - 3; i++) {
    const p0 = p[i];
    const p1 = p[i + 1];
    const p2 = p[i + 2];
    const p3 = p[i + 3];

    for (let t = 0; t < 1; t += 1 / numSegments) {
      const t2 = t * t;
      const t3 = t2 * t;

      const c0 = -tension * t3 + 2 * tension * t2 - tension * t;
      const c1 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
      const c2 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
      const c3 = tension * t3 - tension * t2;

      const x = c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x;
      const y = c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y;

      splinePoints.push({ x, y });
    }
  }
  splinePoints.push(sortedPoints[sortedPoints.length - 1]);

  return splinePoints;
}

export interface RegressionResult {
  points: DataPoint[];
  params?: Record<string, number>;
  error?: number;
  equation?: string;
  success: boolean;
  errorMessage?: string;
}

export function formatEquation(type: RegressionType, params: Record<string, number>): string {
  const f = (n: number) => n?.toExponential(2) ?? "NaN";

  switch (type) {
    case "linear":
      return `y = ${f(params.m)}x + ${f(params.c || 0)}`;
    case "polynomial":
      let terms: string[] = [];
      let i = 0;
      while (params[`a${i}`] !== undefined) {
        if (i === 0) terms.push(`${f(params[`a${i}`])}`);
        else if (i === 1) terms.push(`${f(params[`a${i}`])}x`);
        else terms.push(`${f(params[`a${i}`])}x^${i}`);
        i++;
      }
      return "y = " + terms.join(" + ");
    case "exponential":
      return `y = ${f(params.a)} * e^(${f(params.b)}x)`;
    case "logarithmic":
      return `y = ${f(params.a)} + ${f(params.b)} * ln(x)`;
    case "power":
      return `y = ${f(params.a)} * x^${f(params.b)}`;
    case "sqrt":
      return `y = ${f(params.m)} * sqrt(x) + ${f(params.c || 0)}`;
    case "sinusoidal":
      return `y = ${f(params.m)} * sin(x) + ${f(params.c || 0)}`;
    case "negativeExponential":
      return `y = ${f(params.a)} - ${f(params.b)} * e^(-${f(params.c)}x)`;
    default:
      return "";
  }
}

export function calculateError(data: DataPoint[], predict: (x: number) => number): number {
  if (data.length === 0) return 0;
  let sse = 0;
  let count = 0;
  for (const p of data) {
    const yPred = predict(p.x);
    if (!isNaN(yPred) && isFinite(yPred)) {
      sse += (p.y - yPred) ** 2;
      count++;
    }
  }
  return count > 0 ? sse / count : Infinity; // MSE
}

export function calculateRegressionDetails(
  data: DataPoint[],
  type: RegressionType,
  order?: number,
  forceOrigin?: boolean,
  manualParams?: Record<string, number>,
  manualPoints?: DataPoint[],
): RegressionResult {
  if (type === "manual") {
    const points = manualPoints ? calculateSpline(manualPoints) : [];
    return { points, success: true };
  }

  if (type === "spline") {
    const tension = manualParams?.tension ?? 0.5;
    const points = calculateSpline(data, tension);
    return { points, success: true };
  }

  if (data.length === 0 && !manualParams) {
    return { points: [], success: false, errorMessage: "No data points" };
  }

  let xMin = 0;
  let xMax = 10;

  if (data.length > 0) {
    xMin = Math.min(...data.map((p) => p.x));
    xMax = Math.max(...data.map((p) => p.x));
  }

  // Extend range to origin if forced
  if (forceOrigin && ["linear", "polynomial", "sqrt", "sinusoidal"].includes(type)) {
    xMin = Math.min(xMin, 0);
    xMax = Math.max(xMax, 0);
  }

  const range = xMax - xMin;
  const step = range === 0 ? 1 : range / 100;

  let params = manualParams;
  if (!params && data.length > 0) {
    params = getAutoParameters(data, type, order, forceOrigin);
  }

  if (!params || Object.keys(params).length === 0) {
    return {
      points: [],
      success: false,
      errorMessage: "Could not calculate parameters (check data range or validity)",
    };
  }

  const predict = getPredictFunction(type, params);

  if (!predict) {
    return {
      points: [],
      success: false,
      errorMessage: "Could not generate prediction function",
    };
  }

  const fittedPoints: DataPoint[] = [];
  // Handle single point case or range 0
  if (range === 0) {
    const y = predict(xMin);
    if (!isNaN(y) && isFinite(y)) {
      fittedPoints.push({ x: xMin, y });
    }
  } else {
    for (let x = xMin; x <= xMax; x += step) {
      const y = predict(x);
      if (!isNaN(y) && isFinite(y)) {
        fittedPoints.push({ x, y });
      }
    }
  }

  if (fittedPoints.length === 0) {
    return {
      points: [],
      success: false,
      errorMessage: "Calculation resulted in invalid values (NaN/Infinity)",
    };
  }

  const error = calculateError(data, predict);
  const equation = formatEquation(type, params);

  return {
    points: fittedPoints,
    params,
    error,
    equation,
    success: true,
  };
}

export function calculateRegression(
  data: DataPoint[],
  type: RegressionType,
  order?: number,
  forceOrigin?: boolean,
  manualParams?: Record<string, number>,
  manualPoints?: DataPoint[],
): DataPoint[] {
  return calculateRegressionDetails(data, type, order, forceOrigin, manualParams, manualPoints).points;
}
