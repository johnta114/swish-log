import type { ShotLocation } from '../types';

export const COURT_WIDTH = 300;
export const COURT_HEIGHT = 240;

// ゴールリング中心座標 (viewBox 300x240)
export const BASKET_X = 150;
export const BASKET_Y = 33;
export const THREE_POINT_RADIUS = 125;
export const CORNER_THREE_X_LEFT = 30;
export const CORNER_THREE_X_RIGHT = 270;
export const CORNER_THREE_Y_MAX = 55;

/**
 * タップ座標が3ポイントシュートかどうかを幾何学的に判定する
 * @param loc 正規化座標 (x: 0~100, y: 0~100)
 * @param isU12 U12モードの場合は常にfalse（3Pなし・全シュート2点）
 */
export function isThreePointer(loc: ShotLocation, isU12: boolean = false): boolean {
  if (isU12) {
    return false;
  }

  const px = (loc.x / 100) * COURT_WIDTH;
  const py = (loc.y / 100) * COURT_HEIGHT;

  // コーナー3P判定（サイドライン際かつベースライン近辺）
  if (py <= CORNER_THREE_Y_MAX && (px <= CORNER_THREE_X_LEFT || px >= CORNER_THREE_X_RIGHT)) {
    return true;
  }

  // アーク（円弧）判定: ゴール中心からの距離
  const dx = px - BASKET_X;
  const dy = py - BASKET_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return dist >= THREE_POINT_RADIUS;
}

export type ShotZone = 'paint' | 'mid' | 'three';

/**
 * シュートゾーンを判定する
 */
export function getShotZone(loc: ShotLocation, isU12: boolean = false): ShotZone {
  if (isThreePointer(loc, isU12)) {
    return 'three';
  }

  const px = (loc.x / 100) * COURT_WIDTH;
  const py = (loc.y / 100) * COURT_HEIGHT;

  // ペイントエリア（制限区域: 横110~190, 縦0~96）
  if (px >= 110 && px <= 190 && py >= 0 && py <= 96) {
    return 'paint';
  }

  return 'mid';
}

/**
 * UI表示用のエリア説明文を取得する
 */
export function getZoneLabel(loc: ShotLocation, isU12: boolean = false): {
  category: '2PT' | '3PT';
  points: number;
  label: string;
  badgeClass: string;
} {
  const is3P = isThreePointer(loc, isU12);

  if (is3P) {
    return {
      category: '3PT',
      points: 3,
      label: '3PTエリア (+3点対象)',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    };
  }

  const zone = getShotZone(loc, isU12);
  const u12Note = isU12 ? ' (U12)' : '';

  if (zone === 'paint') {
    return {
      category: '2PT',
      points: 2,
      label: `2PT ペイント・ゴール下${u12Note} (+2点)`,
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    };
  }

  return {
    category: '2PT',
    points: 2,
    label: `2PT ミドルレンジ${u12Note} (+2点)`,
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };
}
