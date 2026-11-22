import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  PlusCircle,
  LayoutDashboard,
  AlertTriangle,
  LogIn,
} from 'lucide-react';
import { User, AppNotification } from '../types';

interface TopBarProps {
  currentUser: User | null;
  emailVerified: boolean;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onStartListEquipment: () => void;
  onSignOut: () => Promise<void>;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => Promise<void>;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  emailVerified,
  currentScreen,
  onNavigate,
  onStartListEquipment,
  onSignOut,
  notifications,
  onMarkNotificationRead,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDashboardScreen = (user: User): string => {
    if (user.role === 'owner') return 'owner-dashboard';
    if (user.role === 'supervisor') return 'supervisor-dashboard';
    if (user.role === 'admin') return 'admin-dashboard';
    return 'requester-dashboard';
  };

  const getDashboardLabel = (user: User): string => {
    if (user.role === 'owner') return 'Owner Hub';
    if (user.role === 'supervisor') return 'Supervisor Queue';
    if (user.role === 'admin') return 'Admin & Audit';
    return 'My Requests';
  };

  const handleHowItWorksClick = () => {
    setMobileMenuOpen(false);
    if (currentScreen !== 'discover') {
      onNavigate('discover');
      setTimeout(() => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0D0D0F]/95 backdrop-blur border-b border-[#2C2A2F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => onNavigate('discover')}
            className="flex items-center gap-2.5 group text-left cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#7A1F3D] border border-[#F4A6C0]/40 flex items-center justify-center group-hover:bg-[#93294B] transition-colors">
              <Film className="w-4 h-4 text-[#F5F1F2]" />
            </div>
            <div>
              <span className="font-title text-lg sm:text-xl font-bold tracking-wider text-[#F5F1F2] block leading-none">
                IDLETOIDEA
              </span>
              <span className="block text-[10px] font-mono-code uppercase tracking-widest text-[#B8AEB2] mt-0.5">
                Shared Equipment &amp; Spaces
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Primary Navigation">
            <button
              type="button"
              onClick={() => onNavigate('discover')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                currentScreen === 'discover'
                  ? 'bg-[#7A1F3D] text-[#F5F1F2]'
                  : 'text-[#B8AEB2] hover:text-[#F5F1F2] hover:bg-[#17171B]'
              }`}
            >
              Browse
            </button>

            <button
              type="button"
              onClick={handleHowItWorksClick}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#B8AEB2] hover:text-[#F5F1F2] hover:bg-[#17171B] transition-colors cursor-pointer"
            >
              How it works
            </button>

            <button
              type="button"
              onClick={onStartListEquipment}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentScreen === 'create-listing'
                  ? 'bg-[#7A1F3D] text-[#F5F1F2]'
                  : 'text-[#F4A6C0] hover:text-[#F5F1F2] hover:bg-[#17171B]'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>List equipment</span>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={() => onNavigate(getDashboardScreen(currentUser))}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentScreen.includes('dashboard')
                    ? 'bg-[#7A1F3D] text-[#F5F1F2]'
                    : 'text-[#B8AEB2] hover:text-[#F5F1F2] hover:bg-[#17171B]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{getDashboardLabel(currentUser)}</span>
              </button>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {currentUser && !emailVerified && (
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#17171B] border border-[#E0A33A]/60 text-[#E0A33A] text-xs font-medium cursor-pointer"
                title="Verify your email address to enable bookings and listings"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Verify Email</span>
              </button>
            )}

            {/* Authenticated Notifications */}
            {currentUser && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen((prev) => !prev)}
                  className="relative p-2 rounded-lg text-[#B8AEB2] hover:text-[#F5F1F2] hover:bg-[#17171B] transition-colors cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F4A6C0] text-[#0D0D0F] text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#17171B] border border-[#2C2A2F] shadow-2xl p-3 z-50">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#2C2A2F]">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#F4A6C0]" />
                        <span className="text-xs font-semibold text-[#F5F1F2]">Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="text-[11px] font-mono-code text-[#F4A6C0]">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-[#2C2A2F] mt-1">
                      {notifications.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[#B8AEB2]">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <button
                            type="button"
                            key={n.id}
                            onClick={() => {
                              if (!n.readAt) onMarkNotificationRead(n.id);
                            }}
                            className={`w-full py-2.5 px-2 hover:bg-[#1E1E24] rounded transition-colors text-left cursor-pointer ${
                              !n.readAt ? 'bg-[#1E1E24]/70' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-[#F5F1F2]">{n.title}</p>
                              {!n.readAt && (
                                <span className="w-2 h-2 rounded-full bg-[#F4A6C0] mt-1 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-[#B8AEB2] leading-relaxed mt-0.5">
                              {n.message}
                            </p>
                            <span className="text-[10px] font-mono-code text-[#B8AEB2] mt-1 block">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sign In or Authenticated Account Dropdown */}
            {!currentUser ? (
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7A1F3D] hover:bg-[#93294B] text-[#F5F1F2] text-sm font-semibold transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-[#F4A6C0]" />
                <span>Sign in</span>
              </button>
            ) : (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#17171B] border border-[#2C2A2F] hover:border-[#F4A6C0]/50 text-xs text-[#F5F1F2] transition-colors cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[#7A1F3D] text-[#F5F1F2] text-xs flex items-center justify-center font-bold">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block max-w-[120px] truncate">
                    <span className="block text-xs font-semibold text-[#F5F1F2] leading-tight truncate">
                      {currentUser.displayName}
                    </span>
                    <span className="block text-[10px] text-[#F4A6C0] uppercase tracking-wider font-mono-code">
                      {currentUser.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#B8AEB2]" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#17171B] border border-[#2C2A2F] shadow-2xl p-2 z-50">
                    <div className="px-3 py-2.5 border-b border-[#2C2A2F]">
                      <p className="text-xs font-semibold text-[#F5F1F2] truncate">
                        {currentUser.displayName}
                      </p>
                      <p className="text-[11px] text-[#B8AEB2] truncate">{currentUser.email}</p>
                      <p className="text-[10px] font-mono-code uppercase text-[#F4A6C0] mt-1">
                        Role: {currentUser.role}
                        {currentUser.organisationName ? ` · ${currentUser.organisationName}` : ''}
                      </p>
                    </div>

                    <div className="py-1 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onNavigate(getDashboardScreen(currentUser));
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#F5F1F2] hover:bg-[#1E1E24] flex items-center gap-2 cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-[#F4A6C0]" />
                        <span>{getDashboardLabel(currentUser)}</span>
                      </button>

                      {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => {
                            setAccountMenuOpen(false);
                            onNavigate('create-listing');
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#F5F1F2] hover:bg-[#1E1E24] flex items-center gap-2 cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-[#F4A6C0]" />
                          <span>List equipment</span>
                        </button>
                      )}

                      <div className="pt-1 border-t border-[#2C2A2F]">
                        <button
                          type="button"
                          onClick={async () => {
                            setAccountMenuOpen(false);
                            await onSignOut();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#E0555F] hover:bg-[#1E1E24] flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg text-[#B8AEB2] hover:text-[#F5F1F2] hover:bg-[#17171B]"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#2C2A2F] space-y-1">
            <button
              type="button"
              onClick={() => {
                onNavigate('discover');
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                currentScreen === 'discover'
                  ? 'bg-[#7A1F3D] text-[#F5F1F2]'
                  : 'text-[#B8AEB2] hover:bg-[#17171B]'
              }`}
            >
              Browse
            </button>
            <button
              type="button"
              onClick={handleHowItWorksClick}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#B8AEB2] hover:bg-[#17171B]"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onStartListEquipment();
              }}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#F4A6C0] hover:bg-[#17171B]"
            >
              List equipment
            </button>
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate(getDashboardScreen(currentUser));
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#B8AEB2] hover:bg-[#17171B]"
              >
                {getDashboardLabel(currentUser)}
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
