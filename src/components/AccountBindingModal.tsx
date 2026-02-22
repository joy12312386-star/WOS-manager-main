import React, { useState, useRef, useEffect } from 'react';
import { AuthService } from '../services/auth';
import { fetchPlayer } from '../services/api';
import { useToast } from './ui/Toast';
import { AlertCircle, Loader, X } from 'lucide-react';
import { Player } from '../../types';

interface AccountBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'input' | 'verify' | 'confirm';

export const AccountBindingModal: React.FC<AccountBindingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>('input');
  const [subAccountId, setSubAccountId] = useState('');
  const [subAccountPassword, setSubAccountPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // 安全地管理焦點，避免 Selection 錯誤
  useEffect(() => {
    if (!isOpen) return;
    
    // 使用 setTimeout 確保 DOM 已完全渲染
    const timer = setTimeout(() => {
      try {
        if (step === 'input' && inputRef.current) {
          inputRef.current.focus();
        } else if (step === 'verify' && passwordRef.current) {
          passwordRef.current.focus();
        }
      } catch (err) {
        // 忽略焦點錯誤
        console.debug('Focus error:', err);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [step, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('input');
    setSubAccountId('');
    setSubAccountPassword('');
    setError('');
    setPlayerData(null);
    setAccountExists(false);
    onClose();
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subAccountId.trim()) {
      setError('請輸入子帳號遊戲ID');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 檢查帳號是否存在
      const exists = await AuthService.userExists(subAccountId);
      
      // 獲取玩家資料
      const player = await fetchPlayer(subAccountId);
      setPlayerData(player);
      setAccountExists(exists);

      if (exists) {
        // 帳號已存在 → 需要輸入密碼驗證
        setStep('verify');
        addToast('帳號已存在，請輸入密碼進行驗證', 'info');
      } else {
        // 帳號不存在 → 直接確認綁定
        setStep('confirm');
        addToast('這是新帳號，將直接綁定', 'info');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法獲取玩家資訊');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subAccountPassword.trim()) {
      setError('請輸入密碼');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 驗證子帳號密碼
      const user = await AuthService.login(subAccountId, subAccountPassword);
      if (!user) {
        setError('密碼驗證失敗');
        return;
      }

      // 密碼驗證成功 → 進入確認步驟
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : '驗證失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBinding = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      // 執行綁定
      const result = await AuthService.addSubAccount(subAccountId, {
        nickname: playerData?.nickname,
        kid: playerData?.kid,
        stoveLv: playerData?.stove_lv,
        avatarImage: playerData?.avatar_image,
      });

      if (!result.success) {
        setError(result.message || '綁定失敗');
        return;
      }

      addToast(
        `✓ 成功綁定子帳號 ${playerData?.nickname}！${
          accountExists ? '子帳號密碼已同步為主帳號密碼' : '新帳號已創建'
        }`,
        'success'
      );

      handleClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '綁定失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">🔗 綁定子帳號</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-300 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Input */}
          {step === 'input' && (
            <form onSubmit={handleInputSubmit} className="space-y-6">
              <p className="text-slate-400 text-sm">
                輸入要綁定的子帳號遊戲ID
              </p>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  子帳號遊戲ID <span className="text-amber-400">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={subAccountId}
                  onChange={(e) => setSubAccountId(e.target.value)}
                  placeholder="輸入遊戲ID"
                  className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-lg transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    查詢中...
                  </>
                ) : (
                  '下一步 →'
                )}
              </button>
            </form>
          )}

          {/* Step 2: Verify Password (only if account exists) */}
          {step === 'verify' && playerData && accountExists && (
            <form onSubmit={handleVerifyPassword} className="space-y-6">
              <div className="p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  ℹ️ 此帳號已存在<br/>
                  請輸入密碼驗證身份後進行綁定
                </p>
              </div>

              <div>
                <p className="text-slate-300 font-semibold mb-4">
                  {playerData.nickname}
                </p>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  子帳號密碼 <span className="text-amber-400">*</span>
                </label>
                <input
                  ref={passwordRef}
                  type="password"
                  value={subAccountPassword}
                  onChange={(e) => setSubAccountPassword(e.target.value)}
                  placeholder="輸入子帳號密碼"
                  className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setSubAccountPassword('');
                    setError('');
                  }}
                  className="flex-1 py-2 text-slate-400 hover:text-slate-300 font-semibold transition"
                >
                  返回
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold rounded-lg transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      驗證中...
                    </>
                  ) : (
                    '確認 →'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Confirm Binding */}
          {step === 'confirm' && playerData && (
            <form onSubmit={handleConfirmBinding} className="space-y-6">
              <div className="p-4 bg-green-600/10 border border-green-600/30 rounded-lg">
                <p className="text-green-300 text-sm">
                  {accountExists
                    ? '✓ 密碼驗證成功\n綁定後子帳號密碼將與主帳號同步'
                    : '✓ 這是新帳號\n將自動創建並綁定'}
                </p>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg">
                <p className="text-slate-300 text-sm">
                  <span className="text-slate-400">帳號:</span> {playerData.nickname}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setSubAccountId('');
                    setSubAccountPassword('');
                    setError('');
                  }}
                  className="flex-1 py-2 text-slate-400 hover:text-slate-300 font-semibold transition"
                >
                  返回
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-lg transition shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      綁定中...
                    </>
                  ) : (
                    '確認綁定 ✓'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
