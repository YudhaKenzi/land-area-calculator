import { useState, useRef } from "react";
import { 
  Plus, Save, Download, Trash2, FileText 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { type Line } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface MeasurementPanelProps {
  lines: Line[];
  onLinesChange: (lines: Line[]) => void;
  defaultLength: number;
  onDefaultLengthChange: (length: number) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  activeTool: "line" | "polygon";
  onToolChange: (tool: "line" | "polygon") => void;
  totalArea: number;
}

export default function MeasurementPanel({
  lines,
  onLinesChange,
  defaultLength,
  onDefaultLengthChange,
  scale,
  onScaleChange,
  activeTool,
  onToolChange,
  totalArea
}: MeasurementPanelProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Handle default length change
  const handleDefaultLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      onDefaultLengthChange(value);
    }
  };
  
  // Handle scale change
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      onScaleChange(value);
    }
  };
  
  // Handle measurement line length change
  const handleLineLengthChange = (lineId: number, newLength: number) => {
    if (isNaN(newLength) || newLength <= 0) return;
    
    const updatedLines = lines.map(line => 
      line.id === lineId ? { ...line, length: newLength } : line
    );
    
    onLinesChange(updatedLines);
  };
  
  // Handle deleting a line
  const handleDeleteLine = (lineId: number) => {
    const updatedLines = lines.filter(line => line.id !== lineId);
    onLinesChange(updatedLines);
  };
  
  // Handle adding a new line
  const handleAddLine = () => {
    // This is just a UI button - actual line adding happens in the Canvas
    toast({
      title: "Tambah Garis",
      description: "Klik pada kanvas untuk mulai menggambar garis pengukuran baru",
    });
  };
  
  // Handle saving
  const handleSave = async () => {
    if (lines.length < 3) {
      toast({
        title: "Tidak Dapat Menyimpan",
        description: "Mohon gambar setidaknya 3 garis pengukuran untuk membentuk area tertutup",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const measurements = {
        lines,
        area: totalArea
      };
      
      const date = new Date().toISOString();
      
      await apiRequest("POST", "/api/land-plots", {
        name: `Lahan ${date}`,
        measurements,
        area: Math.round(totalArea),
        createdAt: date,
        userId: 1 // In production, this would be the authenticated user ID
      });
      
      toast({
        title: "Pengukuran Tersimpan",
        description: "Data pengukuran lahan Anda telah berhasil disimpan",
      });
    } catch (error) {
      toast({
        title: "Gagal Menyimpan",
        description: "Terjadi kesalahan saat menyimpan pengukuran Anda",
        variant: "destructive"
      });
    }
  };
  
  // Handle export to JSON
  const handleExport = () => {
    if (lines.length < 3) {
      toast({
        title: "Tidak Dapat Mengekspor",
        description: "Mohon gambar setidaknya 3 garis pengukuran untuk membentuk area tertutup",
        variant: "destructive"
      });
      return;
    }
    
    // Create export data
    const exportData = {
      lines,
      area: totalArea,
      date: new Date().toISOString()
    };
    
    // Convert to JSON and create download link
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create and click download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `pengukuran-lahan-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Ekspor Berhasil",
      description: "Data pengukuran lahan Anda telah diekspor ke JSON",
    });
  };
  
  // Handle export to PDF with canvas capture
  const handleExportPDF = async () => {
    if (lines.length < 3) {
      toast({
        title: "Tidak Dapat Mengekspor",
        description: "Mohon gambar setidaknya 3 garis pengukuran untuk membentuk area tertutup",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Membuat notifikasi
      toast({
        title: "Membuat PDF",
        description: "Mohon tunggu sementara PDF dibuat...",
      });
      
      // Cari elemen canvas
      const canvasElement = document.querySelector('canvas');
      if (!canvasElement) {
        toast({
          title: "Ekspor Gagal",
          description: "Tidak dapat menemukan elemen canvas",
          variant: "destructive"
        });
        return;
      }
      
      // Buat dokumen PDF baru (landscape untuk menampung gambar)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Dapatkan data waktu
      const now = new Date();
      let dateString, timeString;
      
      try {
        dateString = now.toLocaleDateString('id-ID');
        timeString = now.toLocaleTimeString('id-ID');
      } catch (err) {
        dateString = now.toLocaleDateString();
        timeString = now.toLocaleTimeString();
      }
      
      // Header dan informasi dasar
      pdf.setFontSize(20);
      pdf.text('Laporan Pengukuran Lahan', 150, 15, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text(`Tanggal: ${dateString}`, 20, 25);
      pdf.text(`Waktu: ${timeString}`, 20, 30);
      
      // Tambahkan garis pemisah
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 35, 280, 35);
      
      // Detail pengukuran - kolom kiri
      pdf.setFontSize(16);
      pdf.text('Informasi Pengukuran Lahan', 20, 45);
      
      // Luas area dan informasi pengukuran lainnya
      pdf.setFontSize(12);
      pdf.text(`Luas Area: ${totalArea.toFixed(2)} m²`, 20, 55);
      pdf.text(`Jumlah Garis: ${lines.length}`, 20, 60);
      pdf.text(`Skala Pengukuran: 1:${scale}`, 20, 65);
      
      // Tabel garis pengukuran
      pdf.setFontSize(12);
      pdf.text('Detail Garis Pengukuran:', 20, 75);
      
      // Header tabel
      pdf.setDrawColor(0);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, 80, 80, 7, 'FD');
      
      pdf.setTextColor(0);
      pdf.setFontSize(10);
      pdf.text('No', 25, 85);
      pdf.text('Panjang (meter)', 50, 85);
      
      // Isi tabel
      let yPos = 87;
      lines.forEach((line, index) => {
        pdf.rect(20, yPos, 80, 7, 'S');
        pdf.text(`${index + 1}`, 25, yPos + 5);
        pdf.text(`${line.length.toFixed(2)} meter`, 50, yPos + 5);
        yPos += 7;
      });
      
      try {
        // Ambil gambar dari canvas
        const canvasImage = await html2canvas(canvasElement);
        const imgData = canvasImage.toDataURL('image/png');
        
        // Tempatkan gambar di sisi kanan
        pdf.addImage(imgData, 'PNG', 110, 45, 160, 120);
        
        // Tambahkan keterangan gambar
        pdf.setFontSize(9);
        pdf.text('Visualisasi Pengukuran Lahan', 190, 170, { align: 'center' });
      } catch (imgError) {
        console.error('Error mengambil gambar canvas:', imgError);
        pdf.setFontSize(10);
        pdf.setTextColor(255, 0, 0);
        pdf.text('* Gambar tidak dapat ditampilkan', 150, 100);
        pdf.setTextColor(0);
      }
      
      // Catatan footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('* Dokumen ini dihasilkan secara otomatis dari aplikasi Pengukur Luas Tanah', 20, 190);
      
      // Simpan PDF
      pdf.save(`pengukuran-lahan-${now.getTime()}.pdf`);
      
      // Notifikasi sukses
      toast({
        title: "Ekspor Berhasil",
        description: "Data pengukuran lahan Anda telah diekspor ke PDF dengan gambar",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Ekspor Gagal",
        description: "Tidak dapat membuat PDF. Silakan coba lagi.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="lg:w-1/3">
      {/* Drawing Tools */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Alat Gambar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Button
              onClick={() => onToolChange("line")}
              variant={activeTool === "line" ? "default" : "outline"}
              className="flex-1"
            >
              Alat Garis
            </Button>
            <Button
              onClick={() => onToolChange("polygon")}
              variant={activeTool === "polygon" ? "default" : "outline"}
              className="flex-1"
            >
              Alat Polygon
            </Button>
          </div>
          
          <div className="mb-4">
            <Label htmlFor="default-length" className="text-sm font-medium text-gray-700">
              Panjang Garis Default
            </Label>
            <div className="flex mt-1">
              <Input
                id="default-length"
                type="number"
                value={defaultLength}
                onChange={handleDefaultLengthChange}
                min="0.1"
                step="0.1"
                className="rounded-r-none"
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                meter
              </span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="scale-ratio" className="text-sm font-medium text-gray-700">
              Skala Rasio (1:X)
            </Label>
            <Input
              id="scale-ratio"
              type="number"
              value={scale}
              onChange={handleScaleChange}
              min="1"
              step="1"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">Atur skala untuk pengukuran</p>
          </div>
        </CardContent>
      </Card>
      
      {/* Measurements List */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Pengukuran</CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              Belum ada pengukuran. Mulai dengan menggambar garis di kanvas.
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {lines.map((line, index) => (
                <div key={line.id} className="border-b border-gray-200 pb-2 last:border-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Garis {index + 1}</span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={line.length}
                        onChange={(e) => handleLineLengthChange(line.id, parseFloat(e.target.value))}
                        className="w-20 h-8 text-sm"
                        min="0.1"
                        step="0.1"
                      />
                      <span className="text-xs text-gray-500">m</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteLine(line.id)}
                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-2 pt-2 border-t border-gray-200">
            <Button
              onClick={handleAddLine}
              variant="ghost"
              className="w-full flex items-center justify-center py-2 text-sm text-primary hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah Garis Pengukuran
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Perhitungan Luas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">Luas Total</p>
            <div className="text-3xl font-bold text-primary">
              {totalArea.toFixed(2)} m²
            </div>
            <p className="text-xs text-gray-500 mt-1">Berdasarkan garis pengukuran Anda</p>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-1" />
              Simpan
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-1" />
              JSON
            </Button>
            <Button onClick={handleExportPDF} variant="outline" className="bg-blue-50 hover:bg-blue-100">
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
