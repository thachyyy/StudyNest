import React, { useState } from 'react';
import { Role } from '../types';
import {
  GraduationCap,
  Users,
  Sparkles,
  ChevronDown,
  Search,
  Bell,
  LogIn,
  LogOut,
  Cloud,
  ShieldCheck,
  Loader2,
  UserCheck,
  X
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';

interface GoogleHeaderProps {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  selectedClass: string;
  onClassChange: (className: string) => void;
  classList: string[];
}

export const GoogleHeader: React.FC<GoogleHeaderProps> = ({
  activeRole,
  onRoleChange,
  selectedClass,
  onClassChange,
  classList
}) => {
  const {
    currentUser,
    serverUser,
    authoritativeRole,
    loginWithGoogle,
    loginAsDemo,
    logout,
    isConnected,
    isLoggingIn,
    authNotice,
    clearAuthNotice
  } = useFirebase();

  const [showAuthMenu, setShowAuthMenu] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo & Search */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-800">
              Synapse <span className="text-sm font-normal text-slate-500">Edu AI</span>
            </span>
          </div>

          {/* Firebase Live Cloud Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600">
            <Cloud className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Firestore: {isConnected ? 'Connected' : 'Syncing'}</span>
          </div>

          {/* Search Workspace Input */}
          <div className="relative hidden md:block w-64 lg:w-72">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search workspace, materials..."
              className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-full py-2 pl-10 pr-4 text-xs font-medium text-slate-700 outline-none transition-all shadow-inner/5"
            />
          </div>
        </div>

        {/* Class Switcher & Role Switcher Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Class Picker */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Class:</span>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => onClassChange(e.target.value)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold py-1.5 pl-3 pr-8 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {classList.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Role Switcher Pills (UI Preview Mode) */}
          <div className="flex items-center gap-1.5">
            <span className="hidden xl:inline text-[11px] font-semibold text-slate-400">
              View Mode:
            </span>
            <div className="bg-slate-100/80 p-1 rounded-full border border-slate-200/60 flex items-center" title="UI View Preview - Backend authorization is strictly enforced by PostgreSQL role">
              <button
                onClick={() => onRoleChange('teacher')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeRole === 'teacher'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Teacher</span>
              </button>

              <button
                onClick={() => onRoleChange('student')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeRole === 'student'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>
            </div>
          </div>

          {/* Firebase Google Auth Button or User Profile */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-1">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-8 h-8 rounded-full ring-2 ring-blue-500/40 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-white font-bold text-xs">
                  {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'US'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px]">
                  {currentUser.displayName || currentUser.email || 'Signed User'}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold leading-none mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>
                    {authoritativeRole ? `Role: ${authoritativeRole}` : currentUser.isAnonymous ? 'Demo User' : 'Authenticated'}
                  </span>
                </p>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <button
                  disabled={isLoggingIn}
                  onClick={loginWithGoogle}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-full transition-all shadow-xs"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>{isLoggingIn ? 'Connecting...' : 'Google Login'}</span>
                </button>

                <button
                  disabled={isLoggingIn}
                  onClick={() => setShowAuthMenu(!showAuthMenu)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-semibold transition-colors"
                  title="Demo Account Options"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Demo Sign In Menu Dropdown */}
              {showAuthMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Instant Demo Login
                  </div>
                  <button
                    onClick={() => {
                      setShowAuthMenu(false);
                      loginAsDemo('teacher');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Demo Teacher (Dr. Vance)</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAuthMenu(false);
                      loginAsDemo('student');
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Demo Student (An Minh)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Dismissible Notice Banner if popup was blocked or cancelled */}
      {authNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{authNotice}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loginAsDemo(activeRole)}
              className="font-bold underline text-amber-900 hover:text-amber-950 text-xs"
            >
              Sign In as Demo {activeRole === 'teacher' ? 'Teacher' : 'Student'}
            </button>
            <button
              onClick={clearAuthNotice}
              className="p-1 hover:bg-amber-100 rounded-full text-amber-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
