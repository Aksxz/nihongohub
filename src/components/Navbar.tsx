import React, { useState, useRef, useEffect } from 'react';
import { AppView } from '../types/vocab';
import { JLPTLevel } from '../types/kanji';
import { 
  BookOpen, 
  Sparkles, 
  BarChart3, 
  PlusCircle, 
  Settings, 
  Volume2, 
  VolumeX, 
  Menu, 
  X, 
  BookMarked, 
  ChevronDown, 
  User as UserIcon, 
  Shield,
  Bell,
  Headphones,
  CheckCheck
} from 'lucide-react';
import { api } from '../services/api';
import { NotificationItem } from '../types/notification';

interface NavbarProps {
  currentView: AppView;
  currentLevel?: JLPTLevel;
  userRole?: 'user' | 'admin';
  onNavigate: (view: AppView) => void;
  onOpenAddModal: () => void;
  onOpenAddKanjiModal?: () => void;
  onOpenSettings: () => void;
  onOpenMobileSidebar?: () => void;
  onOpenProfile?: () => void;
  onOpenNotificationContent?: (type: 'reading' | 'listening', contentId: string) => void;
  userName?: string;
  totalVocabCount: number;
  totalKanjiCount?: number;
  totalNotesCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  currentLevel,
  userRole,
  onNavigate,
  onOpenAddModal,
  onOpenAddKanjiModal,
  onOpenSettings,
  onOpenMobileSidebar,
  onOpenProfile,
  onOpenNotificationContent,
  userName,
  totalVocabCount,
  totalKanjiCount = 0,
  totalNotesCount,
  soundEnabled,
  onToggleSound,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifMenuOpen, setNotifMenuOpen] = useState<boolean>(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.notifications.getAll();
      if (res && res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.read) {
      try {
        await api.notifications.markAsRead(item.id || item._id);
        setNotifications(prev => prev.map(n => (n.id === item.id || n._id === item.id) ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (_) {}
    }
    setNotifMenuOpen(false);
    if (onOpenNotificationContent && item.contentId) {
      onOpenNotificationContent(item.type, item.contentId);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const navItems: { id: AppView; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <span className="font-serif-jp text-sm">主頁</span> },
    { id: 'vocab-list', label: 'Vocabulary', icon: <BookOpen className="w-4 h-4" />, count: totalVocabCount },
    { id: 'kanji-list', label: 'Kanji', icon: <span className="font-japanese font-bold text-sm text-[#ea580c]">漢</span>, count: totalKanjiCount },
    { id: 'practice', label: 'Practice', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { id: 'notes', label: 'Notes', icon: <BookMarked className="w-4 h-4 text-indigo-500" />, count: totalNotesCount },
    { id: 'statistics', label: 'Progress', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#eeece6] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Mobile Menu */}
          <div className="flex items-center gap-3 shrink-0">
            {onOpenMobileSidebar && (
              <button
                onClick={onOpenMobileSidebar}
                className="lg:hidden p-2 -ml-2 rounded-xl text-[#6e6b66] hover:bg-[#f7f6f2] hover:text-[#1a1918] cursor-pointer shrink-0"
                title="Open menu drawer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div 
              className="flex items-center gap-2.5 cursor-pointer group shrink-0 whitespace-nowrap"
              onClick={() => onNavigate('dashboard')}
            >
              <div className="w-9 h-9 rounded-xl bg-[#d93829] flex items-center justify-center text-white shadow-sm shadow-red-200 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <span className="font-serif-jp text-base font-bold leading-none select-none">日</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <span className="font-japanese font-bold text-base sm:text-lg text-[#1a1918] tracking-tight whitespace-nowrap select-none">日本語ハブ</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#d93829] bg-[#fef2f2] px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap select-none">NihongoHub</span>
                {currentLevel && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#d93829] text-white shadow-xs ml-1 font-mono shrink-0 whitespace-nowrap">
                    {currentLevel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#f7f6f2] p-1 rounded-xl border border-[#eeece6]">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#1a1918] shadow-xs font-semibold'
                      : 'text-[#6e6b66] hover:text-[#1a1918] hover:bg-white/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[11px] bg-[#eeece6] text-[#6e6b66] px-1.5 py-0.2 rounded-full font-mono">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              title={soundEnabled ? 'Mute audio' : 'Enable audio'}
              className="p-2 rounded-lg text-[#6e6b66] hover:text-[#1a1918] hover:bg-[#f7f6f2] transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-[#1a1918]" /> : <VolumeX className="w-5 h-5 text-neutral-400" />}
            </button>

            <button
              onClick={onOpenSettings}
              title="Backup & Settings"
              className="p-2 rounded-lg text-[#6e6b66] hover:text-[#1a1918] hover:bg-[#f7f6f2] transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* In-App Notifications Bell */}
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                title="Notifications"
                className="p-2 rounded-lg text-[#6e6b66] hover:text-[#1a1918] hover:bg-[#f7f6f2] transition-colors relative cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#d93829] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#eeece6] py-2 z-50 animate-pop-in">
                  <div className="px-4 py-2 border-b border-[#eeece6] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1a1918]">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-red-50 text-[#d93829] text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-100">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-[#6e6b66] hover:text-[#d93829] font-medium transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#f5f4f0]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-[#8c8880] text-xs font-medium">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id || item._id}
                          onClick={() => handleNotificationClick(item)}
                          className={`p-3.5 hover:bg-[#faf9f6] transition-colors cursor-pointer flex items-start gap-3 ${
                            !item.read ? 'bg-[#fef8f8]' : ''
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            item.type === 'listening' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {item.type === 'listening' ? <Headphones className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-bold text-xs text-[#1a1918] truncate">{item.title}</span>
                              <span className="text-[10px] text-[#8c8880] shrink-0 font-mono">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6e6b66] line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-[#d93829] shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add Dropdown */}
            <div className="relative hidden sm:block" ref={addMenuRef}>
              <button
                onClick={() => setAddMenuOpen(!addMenuOpen)}
                className="flex items-center gap-1.5 bg-[#d93829] hover:bg-[#b92a1d] text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-xs shadow-red-200 transition-all active:scale-98 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {addMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#eeece6] py-1.5 z-50 animate-pop-in">
                  <button
                    onClick={() => {
                      onOpenAddModal();
                      setAddMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left hover:bg-[#faf9f6] text-[#1a1918] font-semibold cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#d93829]" />
                    <div>
                      <div>Add Vocabulary</div>
                      <span className="text-[10px] text-[#8c8880] font-normal">New word or phrase</span>
                    </div>
                  </button>
                  {onOpenAddKanjiModal && (
                    <button
                      onClick={() => {
                        onOpenAddKanjiModal();
                        setAddMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left hover:bg-[#faf9f6] text-[#1a1918] font-semibold cursor-pointer border-t border-[#f2f0ea]"
                    >
                      <span className="font-japanese font-bold text-sm text-[#ea580c]">漢</span>
                      <div>
                        <div>Add Kanji</div>
                        <span className="text-[10px] text-[#8c8880] font-normal">Character, On/Kun & JLPT</span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Admin Panel Quick Access Button */}
            {userRole === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-[#d93829] text-white shadow-xs'
                    : 'bg-[#fef2f2] text-[#d93829] hover:bg-red-100 border border-red-200'
                }`}
                title="Open NihongoHub Admin Panel"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}

            {userName && onOpenProfile && (
              <button
                onClick={onOpenProfile}
                title={`Profile: ${userName}`}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-[#f7f6f2] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-[#d93829]/10 border border-red-200 text-[#d93829] font-bold text-xs flex items-center justify-center">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-[#6e6b66] hover:bg-[#f7f6f2]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#eeece6] space-y-1 animate-pop-in">
            {userRole === 'admin' && (
              <button
                onClick={() => {
                  onNavigate('admin');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium mb-1 ${
                  currentView === 'admin' ? 'bg-[#d93829] text-white font-bold' : 'text-[#d93829] bg-red-50 hover:bg-red-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4" />
                  <span>Admin Panel</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white text-[#d93829] px-1.5 py-0.5 rounded">
                  Atlas
                </span>
              </button>
            )}
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                  currentView === item.id ? 'bg-[#fef2f2] text-[#d93829] font-semibold' : 'text-[#6e6b66] hover:bg-[#f7f6f2]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded-full">{item.count}</span>
                )}
              </button>
            ))}

            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenAddModal();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 bg-[#d93829] text-white py-2 rounded-xl text-xs font-semibold shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Vocab</span>
              </button>
              {onOpenAddKanjiModal && (
                <button
                  onClick={() => {
                    onOpenAddKanjiModal();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-[#ea580c] text-white py-2 rounded-xl text-xs font-semibold shadow-xs"
                >
                  <span className="font-japanese font-bold text-sm">漢</span>
                  <span>+ Kanji</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
