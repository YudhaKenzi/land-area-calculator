import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Canvas from "@/components/Canvas";
import MeasurementPanel from "@/components/MeasurementPanel";
import { type Line } from "@shared/schema";
import { 
  calculatePolygonArea, 
  extractVerticesFromLines,
  scaleAreaToRealWorld
} from "@/lib/utils/area";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  
  // State
  const [lines, setLines] = useState<Line[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<"line" | "polygon">("line");
  const [defaultLength, setDefaultLength] = useState<number>(10);
  const [scale, setScale] = useState<number>(100);
  
  // Calculate the total area based on the measurement lines
  const totalArea = useMemo(() => {
    if (lines.length < 3) return 0;
    
    const vertices = extractVerticesFromLines(lines);
    const pixelArea = calculatePolygonArea(vertices);
    
    return scaleAreaToRealWorld(pixelArea, lines, scale);
  }, [lines, scale]);
  
  // Handle creating a new plot
  const handleNewPlot = () => {
    if (lines.length > 0 || backgroundImage) {
      if (window.confirm("Are you sure you want to create a new plot? All current measurements will be lost.")) {
        setLines([]);
        setBackgroundImage(null);
      }
    } else {
      setLines([]);
      setBackgroundImage(null);
    }
  };
  
  // Handle image upload
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      setBackgroundImage(e.target?.result as string);
    };
    
    reader.onerror = () => {
      toast({
        title: "Upload Failed",
        description: "Failed to load the image. Please try a different file.",
        variant: "destructive"
      });
    };
    
    reader.readAsDataURL(file);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onNewPlot={handleNewPlot} 
        onImageUpload={handleImageUpload} 
      />
      
      <main className="container mx-auto px-4 py-6">
        <div className="lg:flex lg:space-x-6">
          <Canvas 
            lines={lines}
            onLinesChange={setLines}
            backgroundImage={backgroundImage}
            activeTool={activeTool}
            defaultLength={defaultLength}
            scale={scale}
          />
          
          <MeasurementPanel 
            lines={lines}
            onLinesChange={setLines}
            defaultLength={defaultLength}
            onDefaultLengthChange={setDefaultLength}
            scale={scale}
            onScaleChange={setScale}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            totalArea={totalArea}
          />
        </div>
      </main>
    </div>
  );
}
