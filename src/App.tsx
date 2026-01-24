import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegistrationForm from './components/RegistrationForm';
import AdminDashboard from './components/AdminDashboard';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { I18nProvider } from './i18n/I18nProvider';
import { ToastProvider } from './components/ui/Toast';
import { Player, User } from '../types';
import { AuthService } from './services/auth';
import { fetchPlayer } from './services/api';

// 路由上下文用於管理用戶狀態
const AuthContext = React.createContext<{
  currentUser: User | null;
  currentPlayer: Player | null;
  isLoading: boolean;
  handleLoginSuccess: (user: User, player: Player) => void;
  handleLogout: () => void;
} | null>(null);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// 保護的路由組件
const ProtectedRoute: React.FC<{ 
  children: (auth: ReturnType<typeof useAuth>) => React.ReactNode;
  requireAdmin?: boolean;
}> = ({ children, requireAdmin = false }) => {
  const auth = useAuth();
  const { currentUser, isLoading } = auth;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>載入中...</p>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    console.log('🔒 ProtectedRoute: 用戶未登入，重新導向到登入頁面');
    return <Navigate to="/" replace />;
  }

  // 如果需要管理員權限但用戶不是管理員，重新導向到報名頁面
  if (requireAdmin && !currentUser.isAdmin) {
    console.warn('🔒 ProtectedRoute: 用戶不是管理員，無法訪問管理員頁面', { 
      gameId: currentUser.gameId, 
      isAdmin: currentUser.isAdmin 
    });
    return <Navigate to="/form" replace />;
  }
  
  if (requireAdmin && currentUser.isAdmin) {
    console.log('✅ ProtectedRoute: 管理員驗證通過', { gameId: currentUser.gameId });
  }
  
  return <>{children(auth)}</>;
};

// 登入路由 - 如果已登入則重新導向
const LoginRoute: React.FC<{ onLoginSuccess: (user: User, player: Player) => void }> = ({ onLoginSuccess }) => {
  const { currentUser, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>載入中...</p>
        </div>
      </div>
    );
  }
  
  if (currentUser) {
    return <Navigate to="/form" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <LoginPage onLoginSuccess={onLoginSuccess} />
    </div>
  );
};

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const initializeUser = async () => {
      const user = AuthService.getCurrentUser();
      
      if (user) {
        try {
          // 從伺服器獲取最新的用戶資料（包括 isAdmin 狀態）
          let latestUser = user;
          try {
            const serverUser = await AuthService.refreshUserData();
            if (serverUser) {
              latestUser = serverUser;
            }
          } catch (refreshError) {
            console.warn('無法從伺服器獲取最新用戶資料，使用快取資料:', refreshError);
          }
          
          // 嘗試重新獲取玩家資料，但失敗時不登出
          let player: Player | null = null;
          try {
            player = await fetchPlayer(latestUser.gameId);
          } catch (fetchError) {
            console.warn('無法從遊戲 API 獲取玩家資料，使用快取資料:', fetchError);
            // 使用基本的 player 資料
            player = {
              fid: latestUser.gameId,
              nickname: latestUser.gameId,
              kid: 0,
              stove_lv: 0,
              stove_lv_content: '',
              avatar_image: '',
            };
          }
          
          setCurrentUser(latestUser as any);
          setCurrentPlayer(player);
        } catch (error) {
          console.error('Failed to initialize user:', error);
          // 如果初始化失敗，登出用戶
          AuthService.logout();
        }
      }
      setIsLoading(false);
    };
    initializeUser();
  }, []);

  const handleLoginSuccess = (user: User, player: Player) => {
    setCurrentUser(user);
    setCurrentPlayer(player);
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setCurrentPlayer(null);
  };


  return (
    <AuthContext.Provider value={{ currentUser, currentPlayer, isLoading, handleLoginSuccess, handleLogout }}>
      <Router>
        <Routes>
          {/* 登入頁面 */}
          <Route path="/" element={<LoginRoute onLoginSuccess={handleLoginSuccess} />} />
          
          {/* 報名表單頁面 */}
          <Route
            path="/form"
            element={
              <ProtectedRoute>
                {(auth) => (
                  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                    <div className="absolute top-4 right-4 z-50">
                      <LanguageSwitcher />
                    </div>
                    {auth.currentPlayer && auth.currentUser && (
                      <RegistrationForm
                        user={auth.currentUser}
                        playerData={auth.currentPlayer}
                        onLogout={auth.handleLogout}
                        onSwitchToManager={() => {
                          window.location.href = '/manager';
                        }}
                      />
                    )}
                  </div>
                )}
              </ProtectedRoute>
            }
          />
          
          {/* 管理員頁面 */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute requireAdmin={true}>
                {(auth) => (
                  auth.currentUser?.isAdmin && (
                    <AdminDashboard 
                      onLogout={auth.handleLogout} 
                      currentUser={auth.currentUser} 
                      onBackToPlayer={() => {
                        window.location.href = '/form';
                      }}
                    />
                  )
                )}
              </ProtectedRoute>
            }
          />
          
          {/* 其他路由導向首頁 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <I18nProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </I18nProvider>
  );
};

export default App;
