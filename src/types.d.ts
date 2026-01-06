declare module "fit-curve" {
  type Point = [number, number];
  type BezierCurve = Point[]; // Array of control points
  export default function fitCurve(points: Point[], error: number): BezierCurve[];
}

declare module "regression" {
  export interface Result {
    points: [number, number][];
    predict(x: number): [number, number];
    equation: number[];
    string: string;
    r2: number;
  }

  export interface Options {
    order?: number;
    precision?: number;
  }

  export function linear(data: [number, number][], options?: Options): Result;
  export function polynomial(data: [number, number][], options?: Options): Result;
  export function exponential(data: [number, number][], options?: Options): Result;
  export function logarithmic(data: [number, number][], options?: Options): Result;
  export function power(data: [number, number][], options?: Options): Result;
}
