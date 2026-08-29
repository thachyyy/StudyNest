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
  X,
  Database,
  RefreshCw,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { useDomain } from '../context/DomainContext';

interface GoogleHeaderProps {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
}

export const GoogleHeader: React.FC<GoogleHeaderProps> = ({
  activeRole,
  onRoleChange,
}) => {
  const {
    currentUser,
    serverUser,
    authoritativeRole,
    loginWithGoogle,
    loginAsDemo,
    switchUserRole,
    logout,
    isConnected,
    isLoggingIn,
    authNotice,
    clearAuthNotice
  } = useFirebase();

  const {
    classes,
    classesState,
    selectedClassId,
    setSelectedClassId,
    refreshClasses,
  } = useDomain();

  const [showAuthMenu, setShowAuthMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      {authNotice && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />
            <span className="leading-snug">{authNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                loginAsDemo('teacher');
                clearAuthNotice();
              }}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            >
              Sign in as Teacher
            </button>
            <button
              onClick={() => {
                loginAsDemo('student');
                clearAuthNotice();
              }}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            >
              Sign in as Student
            </button>
            <button
              onClick={() => {
                window.open(window.location.href, '_blank');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-800/80 hover:bg-amber-900 text-amber-100 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Open full page to bypass iframe popup sandbox restrictions"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={clearAuthNotice}
              className="text-amber-200 hover:text-white p-1 rounded-full ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo & Title */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 hidden sm:inline">
              Synapse <span className="text-sm font-normal text-slate-500">Edu AI</span>
            </span>
          </div>

          {/* Database / Backend Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>PostgreSQL: Real Services</span>
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
          {/* PostgreSQL Class Picker */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Class:</span>
            {classesState.loading ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Loading classes...</span>
              </div>
            ) : classesState.error ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-full text-xs text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="font-medium">
                  {classesState.status === 403
                    ? 'Access forbidden'
                    : classesState.status === 404
                    ? 'Classes not found'
                    : 'Error loading classes'}
                </span>
                <button
                  onClick={() => refreshClasses()}
                  title="Retry loading classes"
                  className="p-0.5 hover:bg-rose-100 rounded-full text-rose-600 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            ) : classes.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedClassId || ''}
                  onChange={(e) => setSelectedClassId(e.target.value || null)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold py-1.5 pl-3 pr-8 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">No classes yet</span>
            )}
          </div>

          {/* Role Switcher Pills (UI Preview Mode) */}
          <div className="flex items-center gap-1.5">
            <span className="hidden xl:inline text-[11px] font-semibold text-slate-400">
              View Mode:
            </span>
            <div className="bg-slate-100/80 p-1 rounded-full border border-slate-200/60 flex items-center" title="UI View Preview - Backend authorization is strictly enforced by PostgreSQL role">
              <button
                onClick={() => onRoleChange('teacher')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
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

          {/* User Profile or Sign In Button */}
          {serverUser || currentUser ? (
            <div className="flex items-center gap-2.5 pl-1">
              {(serverUser?.photoUrl || currentUser?.photoURL) ? (
                <img
                  src={serverUser?.photoUrl || currentUser?.photoURL || ''}
                  alt={serverUser?.displayName || currentUser?.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  {(serverUser?.displayName || currentUser?.displayName || serverUser?.email || 'U')[0].toUpperCase()}
                </div>
              )}

              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-800 line-clamp-1">
                  {serverUser?.displayName || currentUser?.displayName || serverUser?.email || 'Demo User'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span className="capitalize font-semibold text-blue-600">{serverUser?.role || authoritativeRole || 'teacher'}</span>
                  <span>•</span>
                  <span>PostgreSQL Active</span>
                </div>
              </div>

              {/* Quick switch between Demo Teacher and Student */}
              <div className="relative">
                <button
                  onClick={() => setShowAuthMenu(!showAuthMenu)}
                  title="Account Settings & Role Switch"
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showAuthMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100 mb-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Active Identity
                      </span>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        {serverUser?.displayName || currentUser?.displayName || 'Authenticated User'}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase">
                        {serverUser?.role || authoritativeRole || 'Teacher'}
                      </span>
                    </div>

                    <div className="py-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1">
                        {currentUser ? 'Change Your Role' : 'Switch Identity'}
                      </span>
                      {currentUser ? (
                        <>
                          <button
                            onClick={() => {
                              setShowAuthMenu(false);
                              switchUserRole('teacher');
                              onRoleChange('teacher');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                              serverUser?.role === 'teacher' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Teacher Role</span>
                            </div>
                            {serverUser?.role === 'teacher' && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">Active</span>}
                          </button>
                          <button
                            onClick={() => {
                              setShowAuthMenu(false);
                              switchUserRole('student');
                              onRoleChange('student');
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                              serverUser?.role === 'student' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Student Role</span>
                            </div>
                            {serverUser?.role === 'student' && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">Active</span>}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setShowAuthMenu(false);
                              loginAsDemo('teacher');
                              onRoleChange('teacher');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Demo Teacher (Dr. Sarah Vance)</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowAuthMenu(false);
                              loginAsDemo('student');
                              onRoleChange('student');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Demo Student (An Minh)</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1 mt-1">
                      {!currentUser ? (
                        <button
                          onClick={() => {
                            setShowAuthMenu(false);
                            loginWithGoogle();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-slate-500" />
                          <span>Connect Google Account</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowAuthMenu(false);
                            loginAsDemo('teacher');
                            onRoleChange('teacher');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Switch to Demo Environment</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowAuthMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowAuthMenu(!showAuthMenu)}
                disabled={isLoggingIn}
                className="google-btn-primary flex items-center gap-2 text-xs py-2 px-3.5 disabled:opacity-50 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </>
                )}
              </button>

              {showAuthMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-slate-100 mb-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Authentication
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sign in to synchronize role and curriculum data.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowAuthMenu(false);
                      loginWithGoogle();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>

                  <div className="border-t border-slate-100 my-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1">
                      Quick Demo Switch
                    </span>
                    <button
                      onClick={() => {
                        setShowAuthMenu(false);
                        loginAsDemo('teacher');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Demo Teacher (Ms. Nguyen)</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAuthMenu(false);
                        loginAsDemo('student');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Demo Student (An Minh)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
