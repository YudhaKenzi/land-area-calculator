import { type Point, type Line } from "@shared/schema";

/**
 * Calculate the distance between two points
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the area of a polygon defined by an array of points
 * Uses the Shoelace formula (Gauss's area formula)
 */
export function calculatePolygonArea(vertices: Point[]): number {
  if (vertices.length < 3) return 0;
  
  // Apply the Shoelace formula
  let area = 0;
  
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  
  // Take the absolute value and divide by 2
  return Math.abs(area) / 2;
}

/**
 * Calculate area directly from line measurement values rather than pixel-based calculations
 */
export function scaleAreaToRealWorld(pixelArea: number, lines: Line[], scale: number = 1): number {
  if (lines.length < 3) return 0;
  
  // For a rectangle with sides A and B, the area is A * B
  // For simplicity, if we have a 4-sided polygon, we'll assume it's a rectangle
  if (lines.length === 4) {
    // Get the lengths from the actual measurement values
    const lengthA = lines[0].length;
    const lengthB = lines[1].length;
    
    // Check if opposite sides are equal (approximately) to confirm it's a rectangle
    const lengthC = lines[2].length;
    const lengthD = lines[3].length;
    
    const isRectangle = Math.abs(lengthA - lengthC) < 0.1 && Math.abs(lengthB - lengthD) < 0.1;
    
    if (isRectangle) {
      // Use the actual measurements to calculate area
      return lengthA * lengthB;
    }
  }
  
  // For arbitrary polygons, use the original pixel area calculation
  // but improve the ratio calculation
  
  // Calculate average pixel to meter ratio
  let pixelToMeterRatios: number[] = [];
  
  for (const line of lines) {
    const pixelLength = calculateDistance(line.startPoint, line.endPoint);
    if (pixelLength > 0) {
      // Store the ratio for each line
      pixelToMeterRatios.push(line.length / pixelLength);
    }
  }
  
  if (pixelToMeterRatios.length === 0) return 0;
  
  // Use the average ratio to scale the area
  const avgRatio = pixelToMeterRatios.reduce((sum, ratio) => sum + ratio, 0) / pixelToMeterRatios.length;
  
  // Square the ratio since we're converting area (2D)
  return pixelArea * avgRatio * avgRatio;
}

/**
 * Check if points form a closed polygon
 */
export function isClosedPolygon(points: Point[]): boolean {
  if (points.length < 3) return false;
  
  // Check if the last point is close to the first point
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  
  const distance = calculateDistance(firstPoint, lastPoint);
  
  // Consider it closed if the distance is very small
  return distance < 5;
}

/**
 * Extract vertices from line segments
 * This assumes lines are connected end-to-end in order
 * And ensures the polygon is closed for area calculation
 */
export function extractVerticesFromLines(lines: Line[]): Point[] {
  if (lines.length === 0) return [];
  
  // Start with the first line's start point
  const vertices: Point[] = [lines[0].startPoint];
  
  // Add each line's end point
  for (const line of lines) {
    vertices.push(line.endPoint);
  }
  
  // For area calculation, ensure the polygon is closed by adding the first point again if needed
  if (lines.length >= 3) {
    const firstPoint = vertices[0];
    const lastPoint = vertices[vertices.length - 1];
    
    // If the first and last points are not the same, add the first point again to close the polygon
    if (firstPoint.x !== lastPoint.x || firstPoint.y !== lastPoint.y) {
      vertices.push(firstPoint);
    }
  }
  
  return vertices;
}
