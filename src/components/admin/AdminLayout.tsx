import React, { useState } from 'react';
import { Users, FileText, LogOut, Settings, ArrowLeft, Menu, X } from 'lucide-react';
import { User } from '../../../types';

interface AdminLayoutProps {
  currentUser: User;
  onLogout: () => void;
  onBackToPlayer?: () => void;
  children: React.ReactNode;
  activeTab: 'users' | 'submissions' | 'officers' | 'events';
  onTabChange: (tab: 'users' | 'submissions' | 'officers' | 'events') => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  onLogout,
  onBackToPlayer,
  children,
  activeTab,
  onTabChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'users' as const, label: '會員管理', icon: Users },
    { id: 'submissions' as const, label: '報名管理', icon: FileText },
    { id: 'officers' as const, label: '官職管理', icon: Users },
    { id: 'events' as const, label: '場次設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-40">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText size={24} className="text-white" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">WOS Manager - 後台管理</h1>
            </div>

            {/* Desktop Header Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              {onBackToPlayer && (
                <button
                  onClick={onBackToPlayer}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition"
                >
                  <ArrowLeft size={18} />
                  <span className="hidden sm:inline">返回玩家介面</span>
                </button>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">登出</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 hover:bg-slate-700 rounded-lg transition"
            >
              {mobileMenuOpen ? (
                <X size={24} className="text-white" />
              ) : (
                <Menu size={24} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-slate-800 border-b border-slate-700">
          <div className="px-4 py-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-700 mt-2 space-y-1">
              {onBackToPlayer && (
                <button
                  onClick={() => {
                    onBackToPlayer();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition"
                >
                  <ArrowLeft size={20} />
                  <span>返回玩家介面</span>
                </button>
              )}
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition"
              >
                <LogOut size={20} />
                <span>登出</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden sm:block bg-slate-800 border-b border-slate-700">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
      </main>
    </div>
  );
};
