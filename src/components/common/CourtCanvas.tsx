import React, { useRef } from 'react';
import type { ShotLocation, StatEvent } from '../../types';
import {
  COURT_WIDTH,
  COURT_HEIGHT,
  isThreePointer,
} from '../../utils/court';

interface CourtCanvasProps {
  // 入力モード用
  interactive?: boolean;
  selectedLocation?: ShotLocation | null;
  onLocationSelect?: (loc: ShotLocation) => void;

  // 表示用シュート履歴
  events?: StatEvent[];
  // 特定選手のみに絞り込む場合の選手ID（指定がなければ全件）
  filterPlayerId?: string | null;

  isU12?: boolean;
  className?: string;
}

export const CourtCanvas: React.FC<CourtCanvasProps> = ({
  interactive = false,
  selectedLocation = null,
  onLocationSelect,
  events = [],
  filterPlayerId = null,
  isU12 = false,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // コートタップ時の座標計算
  const handleCourtClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onLocationSelect || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 0〜100%に正規化（クランプ処理）
    const xPct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    onLocationSelect({
      x: Math.round(xPct * 10) / 10,
      y: Math.round(yPct * 10) / 10,
    });
  };

  // 表示対象のシュートイベント
  const shotEvents = events.filter((ev) => {
    // 位置情報が存在し、かつシュート（2PT/3PT）であるもの
    const isShot =
      ev.type.startsWith('2PT') || ev.type.startsWith('3PT');
    if (!isShot || !ev.location) return false;

    if (filterPlayerId && ev.playerId !== filterPlayerId) {
      return false;
    }
    return true;
  });

  return (
    <div className={`relative w-full aspect-[15/12] bg-[#1a2333] rounded-2xl border-2 border-slate-700/80 overflow-hidden shadow-inner select-none ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`}
        className={`w-full h-full ${interactive ? 'cursor-crosshair' : 'cursor-default'}`}
        onClick={handleCourtClick}
      >
        {/* 背景フロア */}
        <rect x="0" y="0" width={COURT_WIDTH} height={COURT_HEIGHT} fill="#141d2d" />

        {/* 3Pエリア内の微かなフロアカラー変化 */}
        <path
          d="M 30,0 L 30,55 A 125 125 0 0 0 270,55 L 270,0 Z"
          fill="#1b263b"
          opacity="0.9"
        />

        {/* ペイントエリア (制限区域: 縦96, 横80) */}
        <rect
          x="110"
          y="0"
          width="80"
          height="96"
          fill="#0f172a"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />

        {/* フリースローサークル */}
        <circle
          cx="150"
          cy="96"
          r="36"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <path
          d="M 114,96 A 36 36 0 0 0 186,96"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />

        {/* バックボード & バスケットリング */}
        {/* バックボード */}
        <line x1="130" y1="20" x2="170" y2="20" stroke="#f8fafc" strokeWidth="3" />
        {/* リング支柱 */}
        <line x1="150" y1="20" x2="150" y2="27" stroke="#64748b" strokeWidth="2" />
        {/* リング */}
        <circle
          cx="150"
          cy="33"
          r="8"
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
        />
        {/* ノーチャージセミサークル */}
        <path
          d="M 135,20 A 15 15 0 0 0 165,20"
          fill="none"
          stroke="#64748b"
          strokeWidth="1.5"
        />

        {/* スリーポイントライン */}
        <path
          d="M 30,0 L 30,55 A 125 125 0 0 0 270,55 L 270,0"
          fill="none"
          stroke={isU12 ? '#475569' : '#38bdf8'}
          strokeWidth={isU12 ? '1.5' : '2'}
          strokeDasharray={isU12 ? '4 3' : undefined}
        />

        {/* ハーフコートセンターサークル */}
        <path
          d="M 115,240 A 35 35 0 0 1 185,240"
          fill="none"
          stroke="#475569"
          strokeWidth="1.5"
        />

        {/* 過去のシュートプロット（履歴） */}
        {shotEvents.map((ev) => {
          if (!ev.location) return null;
          const px = (ev.location.x / 100) * COURT_WIDTH;
          const py = (ev.location.y / 100) * COURT_HEIGHT;
          const isMade = ev.type.endsWith('MADE');

          return (
            <g key={ev.id} opacity={interactive ? '0.65' : '0.95'}>
              {isMade ? (
                // 成功: エメラルドの円 + チェック
                <>
                  <circle
                    cx={px}
                    cy={py}
                    r={interactive ? '4.5' : '5.5'}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x={px}
                    y={py + 2.5}
                    fontSize="7"
                    fontWeight="bold"
                    fill="#ffffff"
                    textAnchor="middle"
                  >
                    ✓
                  </text>
                </>
              ) : (
                // 失敗: レッドの円 + バツ
                <>
                  <circle
                    cx={px}
                    cy={py}
                    r={interactive ? '4.5' : '5.5'}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x={px}
                    y={py + 2.5}
                    fontSize="7"
                    fontWeight="bold"
                    fill="#ffffff"
                    textAnchor="middle"
                  >
                    ✕
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* 選択中のターゲットピン（入力モード時） */}
        {selectedLocation && (
          <g
            transform={`translate(${(selectedLocation.x / 100) * COURT_WIDTH}, ${
              (selectedLocation.y / 100) * COURT_HEIGHT
            })`}
          >
            {/* 波紋アニメーション */}
            <circle
              cx="0"
              cy="0"
              r="14"
              fill={isThreePointer(selectedLocation, isU12) ? '#c084fc' : '#60a5fa'}
              opacity="0.3"
              className="animate-ping"
            />
            {/* 外枠 */}
            <circle
              cx="0"
              cy="0"
              r="9"
              fill={isThreePointer(selectedLocation, isU12) ? '#9333ea' : '#2563eb'}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
            {/* 中心点 */}
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
          </g>
        )}
      </svg>

      {/* コート下部ガイド・凡例 */}
      <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] pointer-events-none">
        {interactive ? (
          <div className="bg-slate-900/80 px-2 py-0.5 rounded text-slate-400 backdrop-blur-sm border border-slate-700/80">
            {selectedLocation ? (
              <span>タップで位置変更可</span>
            ) : (
              <span className="text-amber-300 font-semibold">コートをタップしてシュート位置を指定</span>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="bg-slate-900/85 px-2 py-0.5 rounded text-slate-300 backdrop-blur-sm border border-slate-700/80 flex items-center space-x-2">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold text-white">成功</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="font-semibold text-white">失敗</span>
          </span>
          {isU12 && (
            <span className="bg-amber-500/20 text-amber-300 px-1 rounded font-bold border border-amber-500/40">
              U12 (全2PT)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
