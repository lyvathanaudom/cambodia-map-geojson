import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';

/**
 * Creates a color scale and interpolator based on the provided numeric data.
 *
 * @param data - A record mapping keys to numeric values (e.g., crime numbers).
 * @returns An object containing:
 *   - colorScale: A d3 linear scale mapping numbers to the range [0, 1].
 *   - customInterpolator: A function that returns a color string for a value between 0 and 1.
 *   - minValue: The minimum value in the provided data.
 *   - maxValue: The maximum value in the provided data.
 */
export function createColorScale(data: Record<string, number>) {
  const dataValues = Object.values(data);
  const minValue = Math.min(...dataValues);
  const maxValue = Math.max(...dataValues);
  
  // Use .nice() to extend the domain margins so that small differences are more visible.
  const colorScale: ScaleLinear<number, number, never> = scaleLinear()
    .domain([minValue, maxValue])
    .nice()
    .range([0, 1]);
    
  const customInterpolator = (t: number) => interpolateRgb("#e57373", "#b71c1c")(t);

  return {
    colorScale,
    customInterpolator,
    minValue,
    maxValue
  };
}