import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const triggerHaptic = {
  // シュート成功時（しっかりとした手応え）
  score: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Webブラウザ環境など未対応の場合は無視
    }
  },

  // シュート失敗・通常タップ
  miss: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // 無視
    }
  },

  // ファール登録時（警告フィードバック）
  foul: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      // 無視
    }
  },

  // 取り消し（Undo）時
  undo: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // 無視
    }
  },
};
