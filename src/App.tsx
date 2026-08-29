import React, { useState } from 'react';
import { Role, Material } from './types';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { GoogleHeader } from './components/GoogleHeader';
import { TeacherView } from './components/TeacherView';
import { StudentView } from './components/StudentView';
import { Sparkles, GraduationCap, ShieldCheck, Database } from 'lucide-react';

function AppContent() {
  const [activeRole, setActiveRole] = useState<Role>('teacher');
  const [selectedClass, setSelectedClass] = useState<string>('Grade 10A');

  const {
    materials,
    students,
    conversations,
    quiz,
    analytics,
    addMaterial,
    isConnected,
    serverUser,
    authoritativeRole
  } = useFirebase();

  const classList = ['Grade 10A', 'Grade 11B', 'Grade 12 Advanced'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header Bar */}
      <GoogleHeader
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        selectedClass={selectedClass}
        onClassChange={setSelectedClass}
        classList={classList}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Authoritative Role Preview Notice if preview differs from authoritative server role */}
        {authoritativeRole && authoritativeRole !== activeRole && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-xs text-indigo-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>UI Preview Active:</strong> You are previewing the {activeRole === 'teacher' ? 'Teacher' : 'Student'} UI. Your authenticated account role in PostgreSQL is <strong>{authoritativeRole}</strong>. Backend API authorization is strictly enforced by your PostgreSQL role.
              </span>
            </div>
          </div>
        )}

        {/* Banner Alert describing Google Edu AI Capabilities & Firebase Status */}
        <div className="mb-8 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Synapse Edu AI Studio</h1>
                <span className="text-[11px] bg-blue-100 text-blue-700 font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                  <Database className="w-3 h-3" /> Firebase Firestore
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {activeRole === 'teacher'
                  ? 'Manage curriculum materials, extract Text → Knowledge Trees, monitor live student readiness analytics with persistent Firestore cloud storage.'
                  : 'Prepare lessons with interactive Knowledge Trees, research keywords with AI Tutor, and take adaptive readiness quizzes with cloud syncing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Active Portal:</span>
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-2 shadow-xs">
              {activeRole === 'teacher' ? <ShieldCheck className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
              {activeRole === 'teacher' ? 'Teacher Portal' : 'Student Portal'}
            </span>
          </div>
        </div>

        {/* Dynamic Views */}
        {activeRole === 'teacher' ? (
          <TeacherView
            materials={materials}
            students={students}
            conversations={conversations}
            analytics={analytics}
            onAddMaterial={addMaterial}
          />
        ) : (
          <StudentView
            materials={materials}
            initialQuiz={quiz}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium text-slate-600">
            <span className="text-blue-600 font-bold">Synapse Edu AI</span>
            <span>•</span>
            <span>Intelligent Workspace for Educators & Learners</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Firestore Active
            </span>
            <span>•</span>
            <span>Powered by Gemini 3.6 Flash & Firebase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
