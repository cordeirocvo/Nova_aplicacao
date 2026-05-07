"use client";

import { useRef, useState, useEffect } from "react";
import { Circle, ArrowUpRight, Save, Trash2, X } from "lucide-react";

interface ImageAnnotatorProps {
  file: File;
  onSave: (data: { urlBase64: string; observacao: string }) => void;
  onCancel: () => void;
}

export default function ImageAnnotator({ file, onSave, onCancel }: ImageAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [observacao, setObservacao] = useState("");
  const [tool, setTool] = useState<"circle" | "arrow">("circle");
  const [color, setColor] = useState("#ef4444"); // red-500
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [history, setHistory] = useState<ImageData[]>([]);
  
  // Load initial image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      // Limit max width/height to fit screen but keep high enough resolution
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Save initial state to history
      setHistory([ctx.getImageData(0, 0, width, height)]);
    };
  }, [file]);

  const restoreState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || history.length === 0) return;
    ctx.putImageData(history[history.length - 1], 0, 0);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setStartX(e.clientX - rect.left);
    setStartY(e.clientY - rect.top);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCurrentX(e.clientX - rect.left);
    setCurrentY(e.clientY - rect.top);
    drawPreview();
  };

  const drawPreview = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    restoreState();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    if (tool === "circle") {
      const radiusX = Math.abs(currentX - startX) / 2;
      const radiusY = Math.abs(currentY - startY) / 2;
      const centerX = startX + (currentX - startX) / 2;
      const centerY = startY + (currentY - startY) / 2;
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === "arrow") {
      // Draw line
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      // Draw arrowhead
      const headlen = 15;
      const angle = Math.atan2(currentY - startY, currentX - startX);
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(currentX - headlen * Math.cos(angle - Math.PI / 6), currentY - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(currentX - headlen * Math.cos(angle + Math.PI / 6), currentY - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    drawPreview();
    
    // Save to history
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      setHistory([...history, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Export with reduced quality to save space
    const base64 = canvas.toDataURL("image/jpeg", 0.7);
    onSave({ urlBase64: base64, observacao });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-black text-slate-800">Anotar Foto</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
        </div>
        
        <div className="p-4 bg-slate-100 flex gap-4 border-b border-slate-200">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button 
              onClick={() => setTool("circle")} 
              className={`p-2 rounded-md ${tool === "circle" ? "bg-slate-100 text-blue-600" : "text-slate-500"}`}
              title="Círculo"
            >
              <Circle className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setTool("arrow")} 
              className={`p-2 rounded-md ${tool === "arrow" ? "bg-slate-100 text-blue-600" : "text-slate-500"}`}
              title="Seta"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm gap-1 items-center px-2">
            <button onClick={() => setColor("#ef4444")} className={`w-6 h-6 rounded-full bg-red-500 ${color === "#ef4444" ? "ring-2 ring-offset-1 ring-red-500" : ""}`}></button>
            <button onClick={() => setColor("#3b82f6")} className={`w-6 h-6 rounded-full bg-blue-500 ${color === "#3b82f6" ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}></button>
            <button onClick={() => setColor("#22c55e")} className={`w-6 h-6 rounded-full bg-green-500 ${color === "#22c55e" ? "ring-2 ring-offset-1 ring-green-500" : ""}`}></button>
            <button onClick={() => setColor("#eab308")} className={`w-6 h-6 rounded-full bg-yellow-500 ${color === "#eab308" ? "ring-2 ring-offset-1 ring-yellow-500" : ""}`}></button>
          </div>

          <button onClick={undo} disabled={history.length <= 1} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 font-medium hover:bg-slate-50">
            Desfazer
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-800 p-4 flex justify-center items-center" ref={containerRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseOut={handleMouseUp}
            className="shadow-md cursor-crosshair max-w-full bg-white object-contain"
          />
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observação sobre a foto</label>
          <input 
            type="text" 
            placeholder="Ex: Peça danificada por sobreaquecimento, substituída."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
          />
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 text-slate-500 font-bold border border-slate-200 rounded-xl hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700">
            <Save className="w-5 h-5" /> Salvar Imagem Anexada
          </button>
        </div>
      </div>
    </div>
  );
}
