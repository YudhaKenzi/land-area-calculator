import { Button } from "@/components/ui/button";
import { Upload, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HeaderProps {
  onNewPlot: () => void;
  onImageUpload: (file: File) => void;
}

export default function Header({ onNewPlot, onImageUpload }: HeaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">Land Area Calculator</h1>
        <div className="flex space-x-3">
          <Button 
            onClick={onNewPlot}
            size="sm"
            className="px-3 py-1.5 bg-primary text-white hover:bg-blue-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Plot
          </Button>
          
          <div className="relative">
            <Input
              id="file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button 
              onClick={() => document.getElementById('file-input')?.click()}
              variant="outline"
              size="sm"
              className="px-3 py-1.5"
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload Image
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
