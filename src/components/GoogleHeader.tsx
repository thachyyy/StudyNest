import React from 'react';
import { Role } from '../types';
import { GraduationCap, Users, Sparkles, ChevronDown, Search, Bell, LogIn, LogOut, Cloud, ShieldCheck } from 'lucide-react';
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
  const { currentUser, loginWithGoogle, logout, isConnected } = useFirebase();

  return (
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
          <span>Firestore: Connected</span>
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

        {/* Role Switcher Pills */}
        <div className="bg-slate-100/80 p-1 rounded-full border border-slate-200/60 flex items-center">
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
              <div className="w-8 h-8 rounded-full bg-orange-400 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-white font-bold text-xs">
                {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'US'}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px]">
                {currentUser.displayName || currentUser.email}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold leading-none mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Signed in
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
          <button
            onClick={loginWithGoogle}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Login</span>
          </button>
        )}
      </div>
    </header>
  );
};
