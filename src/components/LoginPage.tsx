import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../../types';
import { fetchPlayer } from '../services/api';
import { AuthService } from '../services/auth';
import { AlertCircle, Loader } from 'lucide-react';
import { useToast } from './ui/Toast';
import { useI18n } from '../i18n/I18nProvider';

interface LoginPageProps {
  onLoginSuccess: (user: any, player: Player) => void;
}

const ALLIANCE_OPTIONS = ['TWD', 'NTD', 'QUO', 'TTU', 'ONE', 'DEU'];

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useI18n();
  
  const [fid, setFid] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAlliance, setSelectedAlliance] = useState('');
  const [customAlliance, setCustomAlliance] = useState('');
  const [allianceList, setAllianceList] = useState<string[]>(ALLIANCE_OPTIONS);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playerData, setPlayerData] = useState<Player | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [step, setStep] = useState<'input' | 'verify' | 'register' | 'selectAlliance'>('input');

  const handleFidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fid.trim()) {
      setError(t('enterGameId_error'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Fetch player data from game API
      const player = await fetchPlayer(fid);
      console.log('🎮 API 返回的完整玩家數據:', player);
      setPlayerData(player);

      // Check if user exists in database
      const userExists = await AuthService.userExists(fid);
      
      if (userExists) {
        setIsNewUser(false);
        setStep('verify');
      } else {
        setIsNewUser(true);
        setStep('register');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('fetchPlayerDataFailed'));
      setPlayerData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError(t('enterPassword_error'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      const user = await AuthService.login(fid, password);
      if (!user) {
        setError(t('loginFailed_auth'));
        return;
      }
      
      console.log('✅ 登入返回的用戶數據:', user);
      
      // 登入成功後，更新玩家資料到資料庫
      if (playerData) {
        await AuthService.updatePlayerData({
          nickname: playerData.nickname,
          kid: playerData.kid,
          stoveLv: playerData.stove_lv,
          avatarImage: playerData.avatar_image,
        });
      }
      
      addToast(`${t('welcomeMessage')}, ${playerData?.nickname}!`, 'success');
      onLoginSuccess(user, playerData!);
      navigate('/register');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loginFailed_general'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError(t('enterPassword_error'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }

    setError('');
    setStep('selectAlliance');
  };

  const handleSelectAlliance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAlliance) {
      setError(t('selectAllianceRequired'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 如果是自訂聯盟，添加到列表
      let allianceToUse = selectedAlliance;
      if (selectedAlliance === 'custom' && customAlliance.trim()) {
        allianceToUse = customAlliance.trim().toUpperCase();
        // 添加到列表（如果不存在）
        if (!allianceList.includes(allianceToUse)) {
          setAllianceList([...allianceList, allianceToUse]);
        }
      } else if (selectedAlliance === 'custom') {
        setError(t('customAllianceRequired'));
        return;
      }

      const user = await AuthService.register(fid, password, allianceToUse, {
        nickname: playerData?.nickname,
        kid: playerData?.kid,
        stoveLv: playerData?.stove_lv,
        avatarImage: playerData?.avatar_image,
      });
      if (!user) {
        setError(t('registrationFailed_db'));
        return;
      }
      addToast(`${t('registerSuccess')}, ${t('welcomeMessage')} ${playerData?.nickname}!`, 'success');
      onLoginSuccess(user, playerData!);
      navigate('/register');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('registerSuccess'));
    } finally {
      setLoading(false);
    }
  };

  // 驗證自訂聯盟名稱
  const validateAllianceName = (name: string): string => {
    const trimmed = name.trim().toUpperCase();
    // 檢查長度
    if (trimmed.length !== 3) {
      return t('allianceNameMust3Chars');
    }
    // 檢查只能是英文大小寫和數字
    if (!/^[A-Z0-9]{3}$/.test(trimmed)) {
      return t('onlyEnglishNumbers');
    }
    return '';
  };

  const handleBack = () => {
    setStep('input');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl shadow-2xl shadow-amber-500/40 mb-6">
            <span className="text-4xl">🏆</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">WOS Manager</h1>
          <p className="text-slate-400 text-lg">{t('systemDescription')}</p>
        </div>

        {/* Main Card */}
        <div className="backdrop-blur-sm bg-slate-800/80 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Step 1: Input FID */}
          {step === 'input' && (
            <form onSubmit={handleFidSubmit} className="p-8 md:p-10">
              <h2 className="text-2xl font-bold text-white mb-2">{t('startRegistration')}</h2>
              <p className="text-slate-400 mb-8 text-sm">{t('enterGameIdSubtitle')}</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    {t('gameIdLabel')} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fid}
                    onChange={(e) => setFid(e.target.value)}
                    placeholder={t('enterGameId')}
                    className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition"
                    disabled={loading}
                    autoFocus
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
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-lg transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      {t('verifying')}
                    </>
                  ) : (
                    <>
                      <span>{t('verifyAndContinue')}</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Login (existing user) */}
          {step === 'verify' && playerData && (
            <form onSubmit={handleLogin} className="p-8 md:p-10">
              <h2 className="text-2xl font-bold text-white mb-2">{t('welcomeBack')}</h2>
              <p className="text-slate-400 mb-8 text-sm">{playerData?.nickname}</p>
              
              <div className="mb-8 p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg border border-slate-600/50">
                <div className="flex items-center gap-4">
                  {playerData?.avatar_image && (
                    <img src={playerData.avatar_image} alt="avatar" className="w-12 h-12 rounded-lg" />
                  )}
                  <div className="flex-1">
                    <p className="text-white font-semibold">{playerData?.nickname}</p>
                    <p className="text-slate-400 text-sm">ID: {playerData?.fid}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    {t('passwordLabel')} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('enterPassword')}
                    className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition"
                    disabled={loading}
                    autoFocus
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
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        {t('loggingIn')}
                      </>
                    ) : (
                      t('confirmLogin')
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('input');
                      setFid('');
                      setPassword('');
                      setError('');
                    }}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                  >
                    {t('back')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Step 3: Register (new user) */}
          {step === 'register' && playerData && (
            <form onSubmit={handleRegister} className="p-8 md:p-10">
              <h2 className="text-2xl font-bold text-white mb-2">{t('createAccount')}</h2>
              <p className="text-slate-400 mb-8 text-sm">{playerData?.nickname}</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    {t('passwordLabel')} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('atLeast6Characters')}
                    className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    {t('confirmPasswordLabel')} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('reEnterPassword')}
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
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-lg transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      {t('creating')}
                    </>
                  ) : (
                    t('next')
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('input');
                    setFid('');
                    setPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="w-full py-2 text-slate-400 hover:text-slate-300 font-semibold transition"
                >
                  {t('back')}
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Select Alliance */}
          {step === 'selectAlliance' && (
            <form onSubmit={handleSelectAlliance} className="p-8 md:p-10">
              <h2 className="text-2xl font-bold text-white mb-2">{t('selectAllianceTitle')}</h2>
              <p className="text-slate-400 mb-8 text-sm">{t('selectOrEnterAlliance')}</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    {t('allianceLabel')} <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={selectedAlliance}
                    onChange={(e) => {
                      setSelectedAlliance(e.target.value);
                      setShowCustomInput(e.target.value === 'custom');
                      setError('');
                    }}
                    className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition cursor-pointer"
                    disabled={loading}
                    autoFocus
                  >
                    <option value="">{t('pleaseSelect')}</option>
                    {allianceList.map((alliance) => (
                      <option key={alliance} value={alliance}>
                        {alliance}
                      </option>
                    ))}
                    <option value="custom">{t('custom')}</option>
                  </select>
                </div>

                {/* 自訂聯盟輸入 */}
                {showCustomInput && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-3">
                      {t('customAllianceName')} <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={customAlliance}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        setCustomAlliance(value);
                        // 即時驗證
                        if (value.trim()) {
                          const validationError = validateAllianceName(value);
                          if (validationError) {
                            setError(validationError);
                          } else {
                            setError('');
                          }
                        }
                      }}
                      placeholder={t('enter3Characters')}
                      maxLength={3}
                      className="w-full px-4 py-3 bg-slate-700/60 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition uppercase"
                      disabled={loading}
                    />
                    <p className="text-slate-400 text-xs mt-2">
                      {t('onlyAlphanumeric')}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-300 text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (selectedAlliance === 'custom' && !customAlliance.trim())}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-bold rounded-lg transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      {t('completing')}
                    </>
                  ) : (
                    t('completeRegistration')
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('register');
                    setError('');
                    setSelectedAlliance('');
                    setCustomAlliance('');
                    setShowCustomInput(false);
                  }}
                  className="w-full py-2 text-slate-400 hover:text-slate-300 font-semibold transition"
                >
                  {t('back')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-8">
          {t('dataStoragePrivacyFooter')}
        </p>
      </div>

    </div>
  );
}

export default LoginPage;
