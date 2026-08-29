import React, { useState, useEffect } from 'react';
import { Material, Student, StudentConversation, LearningAnalytics, Keyword, TreeNode } from '../types';
import { KnowledgeTree } from './KnowledgeTree';
import { PromptCoachCard } from './PromptCoachCard';
import { apiClient } from '../services/apiClient';
import { useDomain } from '../context/DomainContext.tsx';
import { TopicManager } from './curriculum/TopicManager.tsx';
import { DocumentManager } from './curriculum/DocumentManager.tsx';
import { CreateClassModal } from './curriculum/CreateClassModal.tsx';
import { DataStatusState } from './common/DataStatusState.tsx';
import {
  BookOpen, Upload, Sparkles, BarChart3, Users, MessageSquare, AlertCircle,
  CheckCircle2, Clock, Plus, ArrowUpRight, TrendingUp, HelpCircle, FileText, Check, Loader2, Search,
  FolderTree, School, Layers, Database
} from 'lucide-react';

interface TeacherViewProps {
  materials: Material[];
  students: Student[];
  conversations: StudentConversation[];
  analytics: LearningAnalytics;
  onAddMaterial: (material: Material) => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  materials = [],
  students = [],
  conversations = [],
  analytics,
  onAddMaterial
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'content' | 'analytics' | 'eval'>('content');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(materials[0] || null);
  const [selectedStudentForEval, setSelectedStudentForEval] = useState<StudentConversation | null>(conversations[0] || null);

  useEffect(() => {
    if (materials.length > 0 && (!selectedMaterial || !materials.some(m => m.id === selectedMaterial.id))) {
      setSelectedMaterial(materials[0]);
    } else if (materials.length === 0) {
      setSelectedMaterial(null);
    }
  }, [materials]);

  useEffect(() => {
    if (conversations.length > 0 && (!selectedStudentForEval || !conversations.some(c => c.id === selectedStudentForEval.id))) {
      setSelectedStudentForEval(conversations[0]);
    } else if (conversations.length === 0) {
      setSelectedStudentForEval(null);
    }
  }, [conversations]);

  const {
    classesState,
    classes,
    selectedClass,
    selectedClassId,
    refreshClasses,
    selectedTopic,
  } = useDomain();

  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);

  // Form State for uploading / adding new lesson material (AI Text -> Tree)
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(selectedClass?.subject || 'Biology 10');
  const [newClassGroup, setNewClassGroup] = useState(selectedClass?.name || 'Grade 10A');
  const [newPastLesson, setNewPastLesson] = useState('');
  const [newNextLesson, setNewNextLesson] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [processSuccessMsg, setProcessSuccessMsg] = useState('');
  const [processErrorMsg, setProcessErrorMsg] = useState('');

  // Handle AI Text -> Tree Generation
  const handleGenerateAiContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newNextLesson) return;

    setIsAiProcessing(true);
    setProcessSuccessMsg('');
    setProcessErrorMsg('');

    try {
      const data = await apiClient.post<{ success: boolean; data: any; error?: string }>('/ai/text-to-tree', {
        title: newTitle,
        subject: newSubject,
        pastLesson: newPastLesson,
        nextLesson: newNextLesson
      });

      if (data.success && data.data) {
        const generated = data.data;

        const createdMat: Material = {
          id: `mat-${Date.now()}`,
          title: newTitle,
          subject: newSubject,
          classGroup: newClassGroup,
          createdAt: new Date().toISOString().split('T')[0],
          pastLessonContent: newPastLesson || 'Review of foundational concepts.',
          nextLessonContent: newNextLesson,
          learningGoals: generated.learningGoals || ['Master core concepts'],
          keywords: generated.keywords || [],
          treeNodes: generated.treeNodes || []
        };

        onAddMaterial(createdMat);
        setSelectedMaterial(createdMat);
        setProcessSuccessMsg('Material processed! AI Knowledge Tree & Keywords successfully created.');
        setNewTitle('');
        setNewPastLesson('');
        setNewNextLesson('');
      } else {
        setProcessErrorMsg(data.error || 'Failed to process AI content');
      }
    } catch (err: any) {
      console.error('Failed to generate AI content', err);
      setProcessErrorMsg(err?.message || 'Failed to generate AI content');
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
      />

      {/* Google Workspace Style Navigation Sub-Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('content')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'content'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Curriculum & Topics (PostgreSQL)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'analytics'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Learning Analytics & Progress</span>
          </button>

          <button
            onClick={() => setActiveSubTab('eval')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'eval'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <span>Student Conversations & Prompt Evaluation</span>
          </button>
        </div>

        <div className="flex items-center gap-3 pr-2">
          <button
            onClick={() => setIsCreateClassOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Class</span>
          </button>
        </div>
      </div>

      {/* Class Level State handling */}
      <DataStatusState
        loading={classesState.loading}
        loadingMessage="Loading your owned classes from PostgreSQL..."
        error={classesState.error}
        statusCode={classesState.status}
        onRetry={refreshClasses}
        isEmpty={!classesState.loading && !classesState.error && classes.length === 0}
        emptyTitle="No Classes Created Yet"
        emptyDescription="You do not have any classes registered under your teacher account. Create your first class to get started."
        emptyActionLabel="Create Class"
        onEmptyAction={() => setIsCreateClassOpen(true)}
      >
        {/* SUB-TAB 1: CURRICULUM MANAGEMENT & TOPICS */}
        {activeSubTab === 'content' && (
          <div className="space-y-6">
            {/* 1. TOP SECTION: POSTGRESQL TOPICS & DOCUMENTS MANAGEMENT */}
            <div className="google-card p-6 space-y-6">
              <TopicManager
                onSelectTopicCallback={(topic) => {
                  setNewTitle(topic.title);
                  if (topic.description) setNewNextLesson(topic.description);
                }}
              />

              <div className="pt-4 border-t border-slate-200">
                <DocumentManager />
              </div>
            </div>

            {/* 2. BOTTOM SECTION: AI TEXT-TO-TREE & PROTOTYPE KNOWLEDGE TREE */}
            <div className="pt-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>AI Knowledge Tree Engine & Material Inspector</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Transform lecture notes into visual concept graphs and suggested AI prompts.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* AI Text -> Tree Form */}
                <div className="lg:col-span-5 google-card p-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Process Notes with Gemini AI</h4>
                      <p className="text-[11px] text-gray-500">Generate structured hierarchy and keywords</p>
                    </div>
                  </div>

                  <form onSubmit={handleGenerateAiContent} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Lesson / Topic Title</label>
                      <input
                        type="text"
                        placeholder="e.g., DNA Replication & Gene Expression"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Class Group</label>
                        <input
                          type="text"
                          value={newClassGroup}
                          onChange={(e) => setNewClassGroup(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Past Lesson Summary (What was learned)</label>
                      <textarea
                        rows={2}
                        placeholder="e.g., Overview of cell nucleus, chromatin structure..."
                        value={newPastLesson}
                        onChange={(e) => setNewPastLesson(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Upcoming Lesson Content (Material to prepare)</label>
                      <textarea
                        rows={4}
                        placeholder="Paste lecture notes or textbook section here..."
                        value={newNextLesson}
                        onChange={(e) => setNewNextLesson(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {processSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{processSuccessMsg}</span>
                      </div>
                    )}

                    {processErrorMsg && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{processErrorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAiProcessing || !newTitle || !newNextLesson}
                      className="w-full google-btn-primary flex items-center justify-center gap-2 text-xs py-2.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isAiProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gemini AI Processing Text → Tree...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-300" />
                          <span>Generate AI Knowledge Tree & Keywords</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Active Material Selector & Inspector */}
                <div className="lg:col-span-7 space-y-6">
                  {materials && materials.length > 0 && (
                    <div className="google-card p-5">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <h4 className="text-sm font-bold text-gray-900">AI Knowledge Trees Library</h4>
                        <span className="text-xs text-gray-500">{materials.length} Trees</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {materials.map((mat) => (
                          <button
                            key={mat.id}
                            onClick={() => setSelectedMaterial(mat)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left cursor-pointer ${
                              selectedMaterial?.id === mat.id
                                ? 'bg-blue-50 border-blue-600 text-blue-800 ring-2 ring-blue-500/20'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-bold">{mat.title}</div>
                            <div className="text-[10px] text-gray-500">{mat.subject} • {mat.classGroup}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Material Tree Visualizer */}
                  {selectedMaterial && (
                    <div className="space-y-6">
                      <KnowledgeTree nodes={selectedMaterial.treeNodes || []} />

                      {/* Extracted Keywords & Prompts */}
                      <div className="google-card p-5">
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" /> Auto-Extracted Keywords & AI Prompts
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(selectedMaterial.keywords || []).map((kw) => (
                            <div key={kw.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">{kw.word}</span>
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                                  {kw.category}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">{kw.definition}</p>

                              <div className="pt-2 border-t border-gray-200">
                                <span className="text-[10px] font-bold text-gray-500 block mb-1">Recommended Student Prompts:</span>
                                <ul className="space-y-1">
                                  {kw.suggestedPrompts.map((p, i) => (
                                    <li key={i} className="text-[11px] text-blue-700 bg-white p-1.5 rounded border border-gray-200 flex items-start gap-1">
                                      <span className="text-amber-500 font-bold">•</span> {p}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: LEARNING ANALYTICS DASHBOARD */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="google-card p-5">
                <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                  <span>Prep Completion Rate</span>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{analytics.prepCompletionRate}%</span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-3">{students.length} Total Enrolled</p>
              </div>

              <div className="google-card p-5">
                <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                  <span>Avg Readiness Score</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{analytics.avgQuizScore} / 100</span>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +5.4
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-3">From self-study pre-quizzes</p>
              </div>

              <div className="google-card p-5">
                <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                  <span>Students Needing Review</span>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {students.filter(s => s.reviewStatus === 'needs_review').length}
                  </span>
                  <span className="text-xs text-rose-600 font-semibold">Action Required</span>
                </div>
                <p className="text-xs text-gray-500 mt-3">Low prompt score or quiz &lt; 60%</p>
              </div>

              <div className="google-card p-5">
                <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
                  <span>Prompt Quality Index</span>
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">84 / 100</span>
                  <span className="text-xs text-purple-700 font-semibold">Good Depth</span>
                </div>
                <p className="text-xs text-gray-500 mt-3">Evaluated via Gemini Prompt Coach</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Weak Keywords Heatmap & Analytics */}
              <div className="lg:col-span-7 google-card p-5">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Weak Keywords Heatmap</h3>
                    <p className="text-xs text-gray-500">Concepts requiring teacher review in next lecture</p>
                  </div>
                  <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                    {analytics.weakKeywordsStats.length} Target Areas
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {analytics.weakKeywordsStats.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-200 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-800">{item.word}</span>
                          <span className="text-[10px] bg-white text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-rose-600">
                          {item.weakStudentsCount} students ({item.percentage}%)
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.percentage > 50 ? 'bg-rose-500' : item.percentage > 30 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Common Mistakes Summary */}
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    AI Aggregated Misconceptions & Errors
                  </h4>
                  <div className="space-y-2">
                    {analytics.commonMistakes.map((mistake, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50/50 border border-rose-100 text-xs text-rose-950">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-semibold text-rose-900">{mistake.title}</span>
                          <span className="ml-2 text-[11px] text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                            {mistake.count} students
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student Roster & Individual Progress */}
              <div className="lg:col-span-5 google-card p-5">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Student Preparation Roster</h3>
                    <p className="text-xs text-gray-500">Track preparation status and readiness</p>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{students.length} Total</span>
                </div>

                <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {students.map((student) => (
                    <div key={student.id} className="p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{student.name}</h4>
                            <p className="text-xs text-gray-500">Active {student.lastActive}</p>
                          </div>
                        </div>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                            student.prepStatus === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : student.prepStatus === 'in_progress'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {student.prepStatus === 'completed' ? 'Completed' : student.prepStatus === 'in_progress' ? 'Preparing' : 'Not Started'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <div>
                          <span>Prep Progress: </span>
                          <strong className="text-gray-900">{student.prepProgressPercent}%</strong>
                        </div>
                        <div>
                          <span>Quiz Score: </span>
                          <strong className={student.quizScore >= 80 ? 'text-emerald-700' : 'text-amber-700'}>
                            {student.quizScore > 0 ? `${student.quizScore}/100` : 'N/A'}
                          </strong>
                        </div>
                      </div>

                      {student.weakKeywords && student.weakKeywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-[10px] text-gray-400 font-medium mr-1">Weak:</span>
                          {student.weakKeywords.map((kw, idx) => (
                            <span key={idx} className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: CONVERSATION LOGS & PROMPT EVALUATION */}
        {activeSubTab === 'eval' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Conversation Selector Sidebar */}
            <div className="lg:col-span-4 google-card p-5">
              <h3 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-200">
                Student Conversations ({conversations.length})
              </h3>

              <div className="mt-3 space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedStudentForEval(conv)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedStudentForEval?.id === conv.id
                        ? 'bg-blue-50 border-blue-600 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{conv.studentName}</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Score: {conv.overallPromptQualityScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{conv.prepAssessment}</p>
                    <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
                      <span>{conv.messages.length} Messages</span>
                      <span>Updated {conv.lastUpdated}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversation Detail & Prompt Coach Analysis */}
            <div className="lg:col-span-8 space-y-6">
              {selectedStudentForEval && (
                <>
                  {/* AI Thinking & Prep Assessment Summary Card */}
                  <div className="google-card p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <h4 className="text-sm font-bold text-gray-900">
                          AI Learning Analytics: {selectedStudentForEval.studentName}
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                        Overall Prompt Quality: {selectedStudentForEval.overallPromptQualityScore}/100
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-gray-200">
                        <span className="font-bold text-gray-900 block mb-1">Preparation Assessment:</span>
                        <p className="text-gray-700 leading-relaxed">{selectedStudentForEval.prepAssessment}</p>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-200">
                        <span className="font-bold text-gray-900 block mb-1">Learning Thinking Analysis:</span>
                        <p className="text-gray-700 leading-relaxed">{selectedStudentForEval.thinkingAnalysis}</p>
                      </div>
                    </div>
                  </div>

                  {/* Message Log Thread */}
                  <div className="google-card p-5 space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-200">
                      Full Chat Thread & Prompt Coaching Feedback
                    </h4>

                    <div className="space-y-4">
                      {(selectedStudentForEval.messages || []).map((msg) => (
                        <div key={msg.id} className="space-y-2">
                          {/* Chat Message Bubble */}
                          <div
                            className={`flex gap-3 p-3.5 rounded-2xl text-xs ${
                              msg.sender === 'student'
                                ? 'bg-blue-50 border border-blue-200/80 ml-8'
                                : 'bg-white border border-gray-200 mr-8'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                                msg.sender === 'student' ? 'bg-blue-600' : 'bg-emerald-600'
                              }`}
                            >
                              {msg.sender === 'student' ? 'S' : 'AI'}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-900">
                                  {msg.sender === 'student' ? selectedStudentForEval.studentName : 'Google Edu AI'}
                                </span>
                                <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                              </div>
                              <p className="text-gray-800 leading-relaxed">{msg.text}</p>
                            </div>
                          </div>

                          {/* Prompt Coach Evaluation card if attached to student message */}
                          {msg.sender === 'student' && msg.promptEvaluation && (
                            <div className="ml-8 max-w-xl">
                              <PromptCoachCard evaluation={msg.promptEvaluation} compact />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DataStatusState>
    </div>
  );
};
