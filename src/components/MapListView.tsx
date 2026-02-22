import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, RefreshCw, Download, Share2 } from 'lucide-react';
import { MapService } from '../services/auth';
import { useToast } from './ui/Toast';
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
  createdAt: string;
}

const MapListView: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [openMaps, setOpenMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const mapViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOpenMaps();
  }, []);

  const loadOpenMaps = async () => {
    try {
      setLoadingMaps(true);
      const allMaps = await MapService.getAllMaps();
      const openOnly = allMaps.filter((m: any) => m.status === 'open');
      setOpenMaps(openOnly);
    } catch (error) {
      console.error('Error loading maps:', error);
      addToast('載入地圖失敗', 'error');
    } finally {
      setLoadingMaps(false);
    }
  };

  const loadMapDetail = async (mapId: string) => {
    try {
      const mapDetail = await MapService.getMap(mapId);
      if (mapDetail) {
        setSelectedMap(mapDetail);
      } else {
        addToast('載入地圖詳情失敗', 'error');
      }
    } catch (error) {
      console.error('Error loading map detail:', error);
      addToast('載入地圖詳情失敗', 'error');
    }
  };

  const downloadMapImage = async () => {
    if (!mapViewRef.current || !selectedMap) return;
    
    try {
      const canvas = await html2canvas(mapViewRef.current, {
        backgroundColor: '#cbd5e1',
        scale: 2,
      });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `alliance_map_${selectedMap.title}_${timestamp}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
      addToast('下載失敗', 'error');
    }
  };

  const shareMapLink = () => {
    if (!selectedMap) return;
    const shareURL = `${window.location.origin}/map/${selectedMap.id}`;
    
    navigator.clipboard.writeText(shareURL).then(() => {
      addToast('分享連結已複製', 'success');
    }).catch(() => {
      addToast('複製失敗', 'error');
    });
  };

  if (selectedMap) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* 標題區 */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 sm:p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setSelectedMap(null)}
                className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-700"
              >
                <ArrowLeft size={20} />
              </button>
              <MapPin size={28} className="text-purple-400" />
              <h1 className="text-2xl font-bold text-white">◆ {selectedMap.title}</h1>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadMapImage}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition text-sm"
              >
                <Download size={18} /> 下載圖片
              </button>
              <button
                onClick={shareMapLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition text-sm"
              >
                <Share2 size={18} /> 分享連結
              </button>
            </div>
          </div>

          {/* 地圖顯示 */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 sm:p-6">
            <div className="flex justify-center overflow-auto">
              <div
                ref={mapViewRef}
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
                    
                    const allianceId = selectedMap.gridData?.[key];
                    const owner = selectedMap.gridOwners?.[key];
                    const alliance = selectedMap.alliances?.find((a) => a.id === allianceId);
                    const bgColor = alliance?.color || '#e2e8f0';
                    
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-center border-2 rounded-sm"
                        style={{
                          width: 38,
                          height: 38,
                          backgroundColor: bgColor,
                          borderColor: alliance ? '#475569' : '#cbd5e1',
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

            {/* 聯盟統計 */}
            {selectedMap.alliances && selectedMap.alliances.length > 0 && (
              <div className="mt-6 bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">聯盟統計</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {selectedMap.alliances.map((alliance) => {
                    const count = Object.values(selectedMap.gridData || {}).filter((id) => id === alliance.id).length;
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
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-700"
            >
              <ArrowLeft size={20} />
            </button>
            <MapPin size={28} className="text-purple-400" />
            <h1 className="text-2xl font-bold text-white">SVS 聯盟地圖分配</h1>
          </div>
        </div>

        {/* 地圖列表 */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 sm:p-6">
          {loadingMaps ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-purple-400" size={32} />
            </div>
          ) : openMaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h4 className="text-xl font-bold text-white mb-2">目前沒有開放的地圖</h4>
              <p className="text-slate-400 text-center">請等待管理員發布地圖</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openMaps.map((map: any) => (
                <button
                  key={map.id}
                  onClick={() => loadMapDetail(map.id)}
                  className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 text-left transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-white font-bold text-lg">◆ {map.title}</h4>
                      <p className="text-slate-400 text-sm">
                        建立時間: {new Date(map.createdAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-semibold rounded">
                      開放中
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapListView;
