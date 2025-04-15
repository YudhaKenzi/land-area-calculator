import { useState, useRef, useEffect, useMemo } from "react";
import { 
  Trash2, Undo, ZoomIn, ZoomOut, Info, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Point, type Line } from "@shared/schema";
import { calculatePolygonArea, extractVerticesFromLines } from "@/lib/utils/area";

interface CanvasProps {
  lines: Line[];
  onLinesChange: (lines: Line[]) => void;
  backgroundImage: string | null;
  activeTool: "line" | "polygon";
  defaultLength: number;
  scale: number;
}

export default function Canvas({ 
  lines, 
  onLinesChange, 
  backgroundImage, 
  activeTool,
  defaultLength,
  scale
}: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<Partial<Line> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<{ lineId: number, isStart: boolean } | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Create polygon from lines
  const polygon = useMemo(() => {
    if (lines.length < 3) return null;
    
    const vertices = extractVerticesFromLines(lines);
    return vertices.map(point => `${point.x},${point.y}`).join(' ');
  }, [lines]);
  
  // Handle canvas click to start drawing a line
  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) return;
    
    // Only handle clicks directly on the SVG or background rect
    if (
      e.target instanceof SVGSVGElement || 
      (e.target instanceof SVGRectElement && e.target.getAttribute('fill')?.includes('grid'))
    ) {
      const svgElement = svgRef.current;
      if (!svgElement) return;
      
      const rect = svgElement.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      
      setIsDrawing(true);
      
      // Start a new line
      const newLine: Partial<Line> = {
        id: lines.length + 1,
        startPoint: { x, y },
        length: defaultLength
      };
      
      setCurrentLine(newLine);
    }
  };
  
  // Handle mouse move when drawing a line
  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    
    const rect = svgElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    if (isDrawing && currentLine) {
      // Update the end point of the current line
      setCurrentLine({
        ...currentLine,
        endPoint: { x, y }
      });
      
    } else if (isDragging && dragPoint) {
      // Find the line being dragged
      const lineIndex = lines.findIndex(line => line.id === dragPoint.lineId);
      if (lineIndex === -1) return;
      
      // Create a copy of the lines array
      const newLines = [...lines];
      
      // Update the point that's being dragged
      if (dragPoint.isStart) {
        newLines[lineIndex] = {
          ...newLines[lineIndex],
          startPoint: { x, y }
        };
      } else {
        newLines[lineIndex] = {
          ...newLines[lineIndex],
          endPoint: { x, y }
        };
      }
      
      onLinesChange(newLines);
    }
  };
  
  // Finish drawing a line or end dragging
  const handleCanvasMouseUp = () => {
    if (isDrawing && currentLine && currentLine.startPoint && currentLine.endPoint) {
      // Finish the current line and add it to the lines array
      const newLine: Line = {
        id: currentLine.id || Date.now(),
        startPoint: currentLine.startPoint,
        endPoint: currentLine.endPoint,
        length: currentLine.length || defaultLength
      };
      
      onLinesChange([...lines, newLine]);
      setCurrentLine(null);
    }
    
    setIsDrawing(false);
    setIsDragging(false);
    setDragPoint(null);
  };
  
  // Handle starting to drag a point
  const handlePointMouseDown = (e: React.MouseEvent, lineId: number, isStart: boolean) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragPoint({ lineId, isStart });
  };
  
  // Handle zoom in
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };
  
  // Handle undo (remove last line)
  const handleUndo = () => {
    if (lines.length > 0) {
      onLinesChange(lines.slice(0, -1));
    }
  };
  
  // Handle clear all lines
  const handleClearAll = () => {
    onLinesChange([]);
  };
  
  // Apply zoom effect
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    
    svgElement.style.transform = `scale(${zoom})`;
    svgElement.style.transformOrigin = 'top left';
  }, [zoom]);
  
  return (
    <div className="lg:w-2/3 bg-white rounded-lg shadow-md p-4 mb-6 lg:mb-0">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-medium">Drawing Canvas</h2>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleUndo}
            title="Undo"
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
          >
            <Undo className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClearAll}
            title="Clear All"
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleZoomOut}
            title="Zoom Out" 
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="border border-gray-300 rounded-md bg-gray-50 relative overflow-hidden"
        style={{ height: '550px' }}
      >
        {/* Background image if provided */}
        {backgroundImage && (
          <img 
            src={backgroundImage}
            alt="Land plot"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        
        {/* Placeholder when no lines and no background */}
        {!backgroundImage && lines.length === 0 && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2">Click to draw measurement lines or upload an image</p>
            </div>
          </div>
        )}
        
        {/* SVG Drawing Canvas */}
        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {/* Grid pattern for reference */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E5E7EB" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Polygon area visualization */}
          {polygon && (
            <polygon 
              points={polygon}
              fill="#3B82F6" 
              fillOpacity="0.1"
              stroke="#3B82F6" 
              strokeWidth="1" 
              strokeDasharray="5,5"
            />
          )}
          
          {/* Render existing measurement lines */}
          {lines.map(line => (
            <g key={line.id} className="measurement-group">
              <line 
                x1={line.startPoint.x} 
                y1={line.startPoint.y}
                x2={line.endPoint.x} 
                y2={line.endPoint.y}
                className="stroke-primary stroke-2"
              />
              
              <circle 
                cx={line.startPoint.x} 
                cy={line.startPoint.y} 
                r="5"
                className="fill-primary cursor-move"
                onMouseDown={(e) => handlePointMouseDown(e, line.id, true)}
              />
              
              <circle 
                cx={line.endPoint.x} 
                cy={line.endPoint.y} 
                r="5"
                className="fill-primary cursor-move"
                onMouseDown={(e) => handlePointMouseDown(e, line.id, false)}
              />
              
              {/* Line label */}
              <text 
                x={(line.startPoint.x + line.endPoint.x) / 2}
                y={(line.startPoint.y + line.endPoint.y) / 2 - 10}
                className="text-sm font-medium fill-gray-600"
                textAnchor="middle"
              >
                {line.length}m
              </text>
            </g>
          ))}
          
          {/* Current line being drawn */}
          {isDrawing && currentLine && currentLine.startPoint && currentLine.endPoint && (
            <g className="measurement-group">
              <line 
                x1={currentLine.startPoint.x} 
                y1={currentLine.startPoint.y}
                x2={currentLine.endPoint.x} 
                y2={currentLine.endPoint.y}
                className="stroke-primary stroke-2"
              />
              
              <circle 
                cx={currentLine.startPoint.x} 
                cy={currentLine.startPoint.y} 
                r="5"
                className="fill-primary"
              />
              
              <circle 
                cx={currentLine.endPoint.x} 
                cy={currentLine.endPoint.y} 
                r="5"
                className="fill-primary"
              />
            </g>
          )}
        </svg>
      </div>
      
      {/* Canvas instructions */}
      <div className="mt-3 text-sm text-gray-600 flex items-center">
        <Info className="h-4 w-4 mr-1" />
        Click to place points and create measurement lines. Drag points to adjust.
      </div>
    </div>
  );
}
