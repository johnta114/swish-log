import React, { useState, useEffect } from 'react';
import { storage } from '../../utils/storage';
import {
  MapPin,
  Navigation,
  X,
  Clock,
  ExternalLink,
  Loader2,
  Check,
  Building,
  AlertCircle,
} from 'lucide-react';

interface VenueCandidate {
  name: string;
  category: string;
  lat: number;
  lng: number;
  distanceKm?: number;
}

interface VenueMapModalProps {
  currentVenue: string;
  onSelectVenue: (venueName: string, location?: { lat: number; lng: number }) => void;
  onClose: () => void;
}

// 2点間の距離（km）計算（ハバーサイン公式）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球の半径 km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const VenueMapModal: React.FC<VenueMapModalProps> = ({
  currentVenue,
  onSelectVenue,
  onClose,
}) => {
  const [loadingLocation, setLoadingLocation] = useState<boolean>(false);
  const [searchingVenues, setSearchingVenues] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [customVenueInput, setCustomVenueInput] = useState<string>(currentVenue);
  const [candidates, setCandidates] = useState<VenueCandidate[]>([]);
  const [venueHistory, setVenueHistory] = useState<string[]>([]);

  // 履歴取得
  useEffect(() => {
    setVenueHistory(storage.getVenueHistory());
  }, []);

  // 現在地取得処理
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('お使いの端末・ブラウザは位置情報（GPS）に対応していません。');
      return;
    }

    setLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentCoords({ lat, lng });
        setLoadingLocation(false);

        // 周辺施設検索（OpenStreetMap Nominatim）
        await searchNearbyVenues(lat, lng);
      },
      (err) => {
        setLoadingLocation(false);
        let msg = '現在地の取得に失敗しました。';
        if (err.code === err.PERMISSION_DENIED) {
          msg = '位置情報の利用が許可されていません。端末の設定を確認してください。';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = '位置情報が利用できません。';
        } else if (err.code === err.TIMEOUT) {
          msg = '位置情報の取得がタイムアウトしました。';
        }
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // 初回マウント時に自動で現在地取得を試みる
  useEffect(() => {
    handleGetLocation();
  }, []);

  // 周辺の体育館・スポーツセンター検索
  const searchNearbyVenues = async (lat: number, lng: number) => {
    setSearchingVenues(true);
    try {
      // Nominatim API で現在地周辺の sports_centre / stadium / gymnasium などを検索
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=体育館+アリーナ+スポーツセンター&lat=${lat}&lon=${lng}&radius=10000&limit=8&accept-language=ja`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const formatted: VenueCandidate[] = data.map((item: any) => {
            const itemLat = parseFloat(item.lat);
            const itemLng = parseFloat(item.lon);
            const dist = calculateDistance(lat, lng, itemLat, itemLng);
            // 表示名をシンプルに整形
            const rawName: string = item.display_name || '';
            const simpleName = rawName.split(',')[0].trim();
            return {
              name: simpleName || item.name || '周辺スポーツ施設',
              category: item.type || '体育館・アリーナ',
              lat: itemLat,
              lng: itemLng,
              distanceKm: dist,
            };
          });

          // 距離順でソート
          formatted.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
          setCandidates(formatted);
          return;
        }
      }

      // 検索ヒットしなかった場合のフォールバック（現在地情報に基づく会場候補名生成）
      setCandidates([
        {
          name: `現在地周辺 体育館 (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
          category: '現在地ピン',
          lat,
          lng,
          distanceKm: 0,
        },
      ]);
    } catch {
      // オフラインまたはネットワークエラー時
      setCandidates([
        {
          name: `現在地コート (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
          category: '現在地ピン',
          lat,
          lng,
          distanceKm: 0,
        },
      ]);
    } finally {
      setSearchingVenues(false);
    }
  };

  const handleSelectCandidate = (candidate: VenueCandidate) => {
    onSelectVenue(candidate.name, { lat: candidate.lat, lng: candidate.lng });
    onClose();
  };

  const handleSelectHistory = (historyName: string) => {
    onSelectVenue(historyName);
    onClose();
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customVenueInput.trim()) {
      onSelectVenue(customVenueInput.trim(), currentCoords || undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">試合会場を現在地から探す</h3>
              <p className="text-[11px] text-slate-400">GPSで現在地を取得し、周辺体育館を検索</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* スクロール可能コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 会場直接入力バー */}
          <form onSubmit={handleApplyCustom} className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              会場名（手入力・決定）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customVenueInput}
                onChange={(e) => setCustomVenueInput(e.target.value)}
                placeholder="例: 市民総合体育館 サブアリーナ"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={!customVenueInput.trim()}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl active:scale-95 transition flex items-center gap-1 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>決定</span>
              </button>
            </div>
          </form>

          {/* 現在地ステータス & マッププレビュー */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Navigation className={`w-4 h-4 ${loadingLocation ? 'text-orange-400 animate-spin' : 'text-sky-400'}`} />
                <span className="font-semibold">
                  {loadingLocation
                    ? '現在地を取得中...'
                    : currentCoords
                    ? `現在地: 緯度 ${currentCoords.lat.toFixed(4)}, 経度 ${currentCoords.lng.toFixed(4)}`
                    : '現在地が未取得です'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={loadingLocation}
                className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 disabled:opacity-50 hover:underline"
              >
                {loadingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                <span>再取得</span>
              </button>
            </div>

            {locationError && (
              <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{locationError}</span>
              </div>
            )}

            {/* マッププレビュー（OpenStreetMap Embed） */}
            {currentCoords && (
              <div className="relative rounded-lg overflow-hidden border border-slate-700 h-40 bg-slate-900">
                <iframe
                  title="現在地マッププレビュー"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentCoords.lng - 0.01}%2C${currentCoords.lat - 0.007}%2C${currentCoords.lng + 0.01}%2C${currentCoords.lat + 0.007}&layer=mapnik&marker=${currentCoords.lat}%2C${currentCoords.lng}`}
                  className="w-full h-full opacity-90 contrast-125"
                />
                <div className="absolute bottom-1 right-1 bg-slate-900/85 backdrop-blur px-2 py-0.5 rounded text-[10px] text-slate-300 flex items-center gap-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${currentCoords.lat},${currentCoords.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Googleマップで開く</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 周辺体育館・施設検索結果 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-orange-400" />
                周辺の体育館・施設候補
              </span>
              {searchingVenues && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  検索中...
                </span>
              )}
            </div>

            {candidates.length > 0 ? (
              <div className="space-y-1.5">
                {candidates.map((cand, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectCandidate(cand)}
                    className="w-full text-left bg-slate-800 hover:bg-slate-750 active:scale-[0.99] border border-slate-700/80 hover:border-orange-500/50 p-2.5 rounded-xl transition flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-white group-hover:text-orange-300 truncate">
                        {cand.name}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="bg-slate-700 px-1.5 py-0.2 rounded font-mono text-slate-300">
                          {cand.category}
                        </span>
                        {cand.distanceKm !== undefined && (
                          <span>約 {cand.distanceKm} km</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] font-semibold text-orange-400 shrink-0 group-hover:translate-x-0.5 transition">
                      選択 →
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              !searchingVenues && (
                <div className="text-center py-4 bg-slate-800/40 rounded-xl border border-dashed border-slate-700/80 text-slate-400 text-xs">
                  周辺の体育館情報が見つかりませんでした。上の入力欄から直接入力できます。
                </div>
              )
            )}
          </div>

          {/* 過去に入力した会場履歴 */}
          {venueHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                過去に使用した会場履歴
              </span>
              <div className="flex flex-wrap gap-1.5">
                {venueHistory.map((hist, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectHistory(hist)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-95 transition flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3 text-orange-400" />
                    <span>{hist}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
