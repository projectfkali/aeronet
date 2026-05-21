import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SpectrumChart({ networks }) {
  const [band, setBand] = useState('2.4GHz');

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    scales: {
      y: {
        min: -100,
        max: -30,
        title: { display: true, text: 'Sinyal Gücü (dBm)', color: 'rgba(255,255,255,0.7)' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      },
      x: {
        title: { display: true, text: 'Kanal', color: 'rgba(255,255,255,0.7)' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false }
    }
  };

  const chartData = useMemo(() => {
    let channels = [];
    if (band === '2.4GHz') channels = Array.from({length: 14}, (_, i) => i + 1);
    else if (band === '5GHz') channels = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 149, 153, 157, 161, 165];
    else if (band === '6GHz') channels = Array.from({length: 30}, (_, i) => i * 4 + 1); // Simplified 6GHz channels (1, 5, 9...)

    const datasets = networks
      .filter(n => n.band === band)
      .map((nw, i) => {
        const hue = (i * 137.5) % 360; // Golden angle for unique colors
        const color = `hsla(${hue}, 80%, 60%, 0.6)`;
        const borderColor = `hsla(${hue}, 80%, 60%, 1)`;
        
        // Generate a pseudo bell-curve around the network's channel
        const data = channels.map(ch => {
          const distance = Math.abs(ch - nw.channel);
          let spread = band === '2.4GHz' ? 2 : band === '5GHz' ? 4 : 8;
          if (distance <= spread) {
            const factor = 1 - (distance / (spread + 1));
            // e.g. -60 at center, drops to -100 at edges
            return -100 + ((nw.signal_level + 100) * factor);
          }
          return null; // Don't draw points too far away
        });

        return {
          label: `${nw.ssid} (Ch: ${nw.channel})`,
          data: data,
          borderColor: borderColor,
          backgroundColor: color,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          spanGaps: false
        };
      });

    return {
      labels: channels,
      datasets: datasets
    };
  }, [networks, band]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        {['2.4GHz', '5GHz', '6GHz'].map(b => (
          <button 
            key={b}
            onClick={() => setBand(b)}
            className={`btn-${band === b ? 'primary' : 'secondary'}`}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: band === b ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.05)',
              color: band === b ? '#06b6d4' : '#fff',
              cursor: 'pointer'
            }}
          >
            {b}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: '350px' }}>
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
}
