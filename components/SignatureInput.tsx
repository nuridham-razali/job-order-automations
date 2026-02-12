
import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Image as ImageIcon, Type, X } from 'lucide-react';

interface SignatureInputProps {
  label: string;
  value?: string; // Base64 image string
  onChange: (value: string) => void;
  signerName: string;
}

const SignatureInput: React.FC<SignatureInputProps> = ({ label, value, onChange, signerName }) => {
  const [mode, setMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState(signerName || '');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Sync typed name if prop changes
  useEffect(() => {
    if (signerName && !typedName) setTypedName(signerName);
  }, [signerName]);

  // Handle Draw Mode
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).nativeEvent.offsetY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).nativeEvent.offsetX;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).nativeEvent.offsetY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
        setIsDrawing(false);
        saveCanvas();
    }
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        onChange(canvas.toDataURL('image/png'));
    }
  };

  // Handle Upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
            onChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Type Mode
  useEffect(() => {
    if (mode === 'type' && typedName) {
        // Generate image from text
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Increased font size to 90px and kept 'bold'
            ctx.font = 'bold 90px "Kunstler Script", "Great Vibes", cursive';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
            onChange(canvas.toDataURL('image/png'));
        }
    }
  }, [mode, typedName]);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-bold text-gray-700">{label}</label>
          <div className="flex space-x-2">
            <button 
                onClick={() => setMode('draw')} 
                className={`p-1.5 rounded ${mode === 'draw' ? 'bg-brand-100 text-brand-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Draw"
            >
                <PenTool className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setMode('type')} 
                className={`p-1.5 rounded ${mode === 'type' ? 'bg-brand-100 text-brand-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Type"
            >
                <Type className="w-4 h-4" />
            </button>
            <button 
                onClick={() => setMode('upload')} 
                className={`p-1.5 rounded ${mode === 'upload' ? 'bg-brand-100 text-brand-600' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Upload PNG"
            >
                <ImageIcon className="w-4 h-4" />
            </button>
            {value && (
                <button onClick={() => onChange('')} className="p-1.5 rounded text-red-500 hover:bg-red-50" title="Clear">
                    <X className="w-4 h-4" />
                </button>
            )}
          </div>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center min-h-[120px] relative overflow-hidden">
        {mode === 'draw' && (
            <>
                <canvas 
                    ref={canvasRef}
                    width={400} 
                    height={120}
                    className="cursor-crosshair w-full h-full absolute top-0 left-0"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!value && !isDrawing && <span className="text-gray-400 pointer-events-none select-none">Sign here</span>}
            </>
        )}

        {mode === 'type' && (
            <div className="w-full p-4 text-center">
                <input 
                    type="text" 
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder="Type name here"
                    // Changed to text-7xl for larger display
                    className="w-full p-2 border-b border-gray-300 bg-transparent text-center text-7xl font-bold text-black focus:outline-none"
                    style={{ fontFamily: '"Kunstler Script", "Great Vibes", cursive' }}
                />
            </div>
        )}

        {mode === 'upload' && (
             <div className="text-center p-4">
                 <input type="file" accept="image/png" onChange={handleUpload} className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                 <p className="text-xs text-gray-400 mt-2">PNG Only</p>
             </div>
        )}

        {/* Preview overlay for non-draw modes if value exists, or just showing result */}
        {(mode !== 'draw' && value) && (
             <img src={value} alt="Signature" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none bg-white/90" />
        )}
        
        {/* For draw mode, we are drawing on canvas directly, but if value was loaded from storage we might need to show it */}
        {mode === 'draw' && value && !isDrawing && (
             <img src={value} alt="Signature" className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none -z-10" />
        )}
      </div>
    </div>
  );
};

export default SignatureInput;
