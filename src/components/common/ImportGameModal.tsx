import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { inspectGamePackage } from '../../utils/gameShare';
import type { GameImportPreview } from '../../types';
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Calendar,
  Trophy,
  Target,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface ImportGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (gameId: string) => void;
}

export const ImportGameModal: React.FC<ImportGameModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { games, teams, importGame, navigateTo } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<GameImportPreview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setSuccessMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = inspectGamePackage(text, games, teams);
      setPreview(res);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setPreview({
        isValid: false,
        errorMessage: 'ファイルの読み込みに失敗しました。',
        gameTitle: '',
        gameDate: '',
        score: { home: 0, away: 0 },
        totalEventsCount: 0,
        totalShotsCount: 0,
        isDuplicate: false,
      });
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = (mode: 'add_new' | 'overwrite') => {
    if (!preview?.packageData) return;

    try {
      const newGameId = importGame(preview.packageData, mode);
      setSuccessMessage('試合データを正常に取り込みました！');

      setTimeout(() => {
        onClose();
        if (onImportSuccess) {
          onImportSuccess(newGameId);
        } else {
          navigateTo('stats_view', { gameId: newGameId });
        }
      }, 900);
    } catch (err: any) {
      alert(`取り込みに失敗しました: ${err.message}`);
    }
  };

  const handleReset = () => {
    setFileName('');
    setPreview(null);
    setSuccessMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* モーダルヘッダー */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">試合データを取り込む</h3>
              <p className="text-[11px] text-slate-400">AirDropやLINE等で受け取った試合ファイル(.json)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* モーダルボディ */}
        <div className="p-5 space-y-4">
          {/* 安心設計の説明 */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-[11px] text-slate-300 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>安心設計:</strong> 共有データを取り込んでも、あなたの端末に保存されている他の試合やマイチーム設定が消えたり壊れることは一切ありません。
            </span>
          </div>

          {/* 成功トースト */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center space-x-2 animate-bounce">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ファイル選択エリア */}
          {!preview?.isValid && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.swish"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full py-8 px-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-orange-500/70 bg-slate-800/40 hover:bg-slate-800/80 flex flex-col items-center justify-center space-y-2.5 transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-orange-400 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-200">
                    {isLoading ? '解析中...' : '試合ファイル（.json）を選択'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    スマホの「ファイル」や受信フォルダから選択
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* エラー表示 */}
          {preview && !preview.isValid && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 space-y-2">
              <p className="font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>取り込みエラー</span>
              </p>
              <p className="text-[11px] text-red-300/90 leading-relaxed">{preview.errorMessage}</p>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-300 underline hover:text-white pt-1"
              >
                別のファイルを選択する
              </button>
            </div>
          )}

          {/* プレビュー表示 */}
          {preview && preview.isValid && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider shrink-0">
                      取り込みプレビュー
                    </span>
                    {fileName && (
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                        ({fileName})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] text-slate-400 hover:text-white underline shrink-0"
                  >
                    変更
                  </button>
                </div>

                {/* 試合タイトル・スコア */}
                <div className="text-center py-2">
                  <h4 className="text-base font-black text-white">{preview.gameTitle}</h4>
                  <div className="text-2xl font-black font-mono text-orange-400 tracking-wider my-1">
                    {preview.score.home} <span className="text-slate-500 text-sm">-</span> {preview.score.away}
                  </div>
                  {preview.tournamentName && (
                    <p className="text-xs text-slate-300 flex items-center justify-center space-x-1 mt-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{preview.tournamentName}</span>
                    </p>
                  )}
                </div>

                {/* メタ情報リスト */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>開催日: {preview.gameDate}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>シュート数: {preview.totalShotsCount} 本 (位置あり)</span>
                  </div>
                </div>

                {/* 重複チェック警告 */}
                {preview.isDuplicate && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs space-y-1">
                    <p className="font-bold flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>すでに登録済みの試合です</span>
                    </p>
                    <p className="text-[11px] text-amber-200/90">
                      同じ試合IDのデータが既に存在します。上書きするか、別試合として複製して保存するかを選択してください。
                    </p>
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div className="space-y-2 pt-1">
                {preview.isDuplicate ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleExecuteImport('overwrite')}
                      className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow transition"
                    >
                      <span>既存の試合を最新データで上書き</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteImport('add_new')}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center space-x-1 transition border border-slate-700"
                    >
                      <span>別の新規試合として複製追加</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleExecuteImport('add_new')}
                    className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-orange-900/30 transition"
                  >
                    <span>この試合データを取り込む</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
