import React, { useState, useRef, useEffect } from 'react';

export default function Heatmap() {
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [mode, setMode] = useState('router'); // 'router' | 'wall'
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  
  const [walls, setWalls] = useState([]);
  const [routerPos, setRouterPos] = useState(null);
  const [drawingWall, setDrawingWall] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setBackgroundImage(url);
        imageRef.current = img;
      };
      img.src = url;
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [backgroundImage, walls, routerPos, drawingWall]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw Background
    if (imageRef.current) {
      // Scale image to fit canvas
      const scale = Math.min(width / imageRef.current.width, height / imageRef.current.height);
      const x = (width / 2) - (imageRef.current.width / 2) * scale;
      const y = (height / 2) - (imageRef.current.height / 2) * scale;
      ctx.drawImage(imageRef.current, x, y, imageRef.current.width * scale, imageRef.current.height * scale);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Kat planı resmi (JPG/PNG) yükleyin', width/2, height/2);
    }

    // Draw Walls
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ef4444';
    walls.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    });

    // Draw current drawing wall
    if (drawingWall) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.beginPath();
      ctx.moveTo(drawingWall.x1, drawingWall.y1);
      ctx.lineTo(drawingWall.x2, drawingWall.y2);
      ctx.stroke();
    }

    // Draw Router
    if (routerPos) {
      ctx.beginPath();
      ctx.arc(routerPos.x, routerPos.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Draw fake signal radius
      const gradient = ctx.createRadialGradient(routerPos.x, routerPos.y, 0, routerPos.x, routerPos.y, 250);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      
      ctx.beginPath();
      ctx.arc(routerPos.x, routerPos.y, 250, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  };

  const handleMouseDown = (e) => {
    if (!backgroundImage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (mode === 'router') {
      setRouterPos({ x, y });
    } else if (mode === 'wall') {
      setDrawingWall({ x1: x, y1: y, x2: x, y2: y });
    }
  };

  const handleMouseMove = (e) => {
    if (!drawingWall || mode !== 'wall') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawingWall(prev => ({ ...prev, x2: x, y2: y }));
  };

  const handleMouseUp = () => {
    if (drawingWall && mode === 'wall') {
      setWalls([...walls, drawingWall]);
      setDrawingWall(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
        <input 
          type="file" 
          accept="image/png, image/jpeg" 
          onChange={handleImageUpload} 
          style={{ color: 'var(--text-secondary)' }}
        />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setMode('router')} 
            style={{ 
              background: mode === 'router' ? 'var(--cyan)' : 'rgba(255,255,255,0.1)', 
              color: mode === 'router' ? '#000' : '#fff',
              border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            Modem Yerleştir
          </button>
          <button 
            onClick={() => setMode('wall')} 
            style={{ 
              background: mode === 'wall' ? 'var(--red)' : 'rgba(255,255,255,0.1)', 
              color: mode === 'wall' ? '#000' : '#fff',
              border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            Duvar Çiz
          </button>
          <button 
            onClick={() => { setWalls([]); setRouterPos(null); }} 
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Temizle
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          width: '100%',
          height: '500px',
          background: 'var(--bg-card)',
          borderRadius: '8px',
          cursor: mode === 'router' ? 'crosshair' : 'url(crosshair), auto',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      />
    </div>
  );
}
