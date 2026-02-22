import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Download, ArrowLeft, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';

interface Alliance {
  id: string;
  name: string;
  color: string;
}

interface MapData {
  id: string;
  title: string;
  status: string;
  alliances: Alliance[];
  gridData: Record<string, string>;
  gridOwners: Record<string, string>;
}

const PublicMapView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMap = async () => {
      if (!id) {
        setError('無效的地圖連結');
        setLoading(false);
        return;
      }

      try {
        // 根據環境選擇 API URL
        const apiUrl = window.location.hostname === 'localhost'
          ? `http://localhost:3001/api/maps/public/${id}`
          : `/api-proxy.php?path=maps/public/${id}`;

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('找不到此地圖');
          } else if (response.status === 403) {
            setError('此地圖未開放查看');
          } else {
            setError('載入地圖失敗');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setMapData(data);
      } catch (err) {
        console.error('Error loading map:', err);
        setError('載入地圖失敗，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    loadMap();
  }, [id]);

  const downloadMapImage = async () => {
    if (!mapRef.current || !mapData) return;
    
    try {
      const canvas = await html2canvas(mapRef.current, {
        backgroundColor: '#cbd5e1',
        scale: 2,
      });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `alliance_map_${mapData.title}_${timestamp}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-purple-400 mx-auto mb-4" size={48} />
          <p className="text-white">載入地圖中...</p>
        </div>
      </div>
    );
  }

  if (error || !mapData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-bold text-white mb-2">{error || '載入失敗'}</h2>
          <p className="text-slate-400 mb-6">請確認連結是否正確</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            <ArrowLeft size={16} /> 返回首頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題區 */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 sm:p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <MapPin size={28} className="text-purple-400" />
            <h1 className="text-2xl font-bold text-white">◆ {mapData.title}</h1>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadMapImage}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition"
            >
              <Download size={18} /> 下載圖片
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition"
            >
              <ArrowLeft size={18} /> 返回首頁
            </Link>
          </div>
        </div>

        {/* 地圖顯示 */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 sm:p-6">
          <div className="flex justify-center overflow-auto">
            <div
              ref={mapRef}
              style={{
                width: Math.ceil(14 * 40 * Math.sqrt(2)),
                height: Math.ceil(14 * 40 * Math.sqrt(2)),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#cbd5e1',
                borderRadius: '16px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(14, 38px)`,
                  gridTemplateRows: `repeat(14, 38px)`,
                  gap: '2px',
                  transform: 'rotate(45deg)',
                }}
              >
                {Array.from({ length: 14 * 14 }).map((_, idx) => {
                  const row = Math.floor(idx / 14);
                  const col = idx % 14;
                  const key = `${row}-${col}`;
                  const blocked = row >= 4 && row <= 9 && col >= 4 && col <= 9;
                  
                  // 方向格子
                  const directionMap: Record<string, string> = {
                    '4-4': 'N', '4-9': 'E', '9-4': 'W', '9-9': 'S'
                  };
                  const direction = directionMap[key];
                  
                  if (direction) {
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-center bg-slate-600 border-2 border-slate-500 rounded-sm"
                        style={{ width: 38, height: 38 }}
                      >
                        <span className="text-white font-bold text-sm" style={{ transform: 'rotate(-45deg)' }}>{direction}</span>
                      </div>
                    );
                  }
                  
                  if (blocked) {
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-center bg-slate-800 border-2 border-slate-700 rounded-sm"
                        style={{ width: 38, height: 38 }}
                      >
                        <span className="text-slate-500 text-xs">✕</span>
                      </div>
                    );
                  }
                  
                  const allianceId = mapData.gridData?.[key];
                  const owner = mapData.gridOwners?.[key];
                  const alliance = mapData.alliances?.find((a) => a.id === allianceId);
                  const bgColor = alliance?.color || '#e2e8f0';
                  
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-center border-2 rounded-sm cursor-pointer hover:scale-105 transition-transform duration-100"
                      style={{
                        width: 38,
                        height: 38,
                        backgroundColor: bgColor,
                        borderColor: alliance ? '#475569' : '#cbd5e1',
                      }}
                      onMouseEnter={(e) => {
                        if (owner) {
                          setTooltip({ text: owner, x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onMouseMove={(e) => {
                        if (owner && tooltip) {
                          setTooltip({ ...tooltip, x: e.clientX, y: e.clientY });
                        }
                      }}
                    >
                      {owner && (
                        <span
                          className="font-bold"
                          style={{
                            fontSize: '10px',
                            color: '#000',
                            transform: 'rotate(-45deg)',
                            textShadow: '0 0 2px white, 0 0 2px white',
                            textAlign: 'center',
                            lineHeight: '1.1',
                            maxWidth: '36px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {owner}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              style={{
                position: 'fixed',
                left: `${tooltip.x + 10}px`,
                top: `${tooltip.y + 10}px`,
                backgroundColor: '#1f2937',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                border: '1px solid #4b5563',
                zIndex: 1000,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              }}
            >
              {tooltip.text}
            </div>
          )}

          {/* 聯盟統計 */}
          {mapData.alliances && mapData.alliances.length > 0 && (
            <div className="mt-6 bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">聯盟統計</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {mapData.alliances.map((alliance) => {
                  const count = Object.values(mapData.gridData || {}).filter((id) => id === alliance.id).length;
                  return (
                    <div key={alliance.id} className="flex items-center gap-2 bg-slate-600/50 rounded px-3 py-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: alliance.color }}
                      />
                      <span className="text-white text-sm">{alliance.name}</span>
                      <span className="text-slate-400 text-xs ml-auto">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 頁尾 */}
        <div className="text-center mt-6 text-slate-500 text-sm">
          WOS Manager - Alliance Map
        </div>
      </div>
    </div>
  );
};

export default PublicMapView;
