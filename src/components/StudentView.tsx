import React, { useState } from 'react';
import { Material, Quiz, ChatMessage, Keyword, QuizQuestion } from '../types';
import { KnowledgeTree } from './KnowledgeTree';
import { PromptCoachCard } from './PromptCoachCard';
import { auth } from '../lib/firebase';
import {
  BookOpen, Sparkles, Send, CheckCircle2, AlertCircle, HelpCircle,
  Lightbulb, RefreshCw, Loader2, ArrowRight, Award, MessageSquare, ListCheck
} from 'lucide-react';

interface StudentViewProps {
  materials: Material[];
  initialQuiz: Quiz;
}

export const StudentView: React.FC<StudentViewProps> = ({ materials, initialQuiz }) => {
  const [activeTab, setActiveTab] = useState<'prep' | 'quiz'>('prep');
  const [selectedMaterial, setSelectedMaterial] = useState<Material>(materials[0]);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Hello An Minh! I am your AI Tutor for **${selectedMaterial.title}**. Ask me any questions, or click one of the suggested prompts below to practice asking high-quality prompts!`,
      timestamp: 'Just now'
    }
  ]);
  const [studentInput, setStudentInput] = useState('');
  const [activeKeywordFocus, setActiveKeywordFocus] = useState<string>(selectedMaterial.keywords[0]?.word || '');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Quiz state
  const [currentQuiz, setCurrentQuiz] = useState<Quiz>(initialQuiz);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isQuizGenerating, setIsQuizGenerating] = useState(false);

  // Send message to AI Tutor
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || studentInput;
    if (!promptToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'student',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      keywordFocus: activeKeywordFocus
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setStudentInput('');
    setIsChatLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          studentPrompt: promptToSend,
          keyword: activeKeywordFocus,
          lessonContext: selectedMaterial.nextLessonContent,
          chatHistory: chatMessages.slice(-4)
        })
      });

      const data = await res.json();
      if (data.success) {
        // Update user message with prompt evaluation
        if (data.promptEvaluation) {
          setChatMessages(prev =>
            prev.map(m => (m.id === userMsg.id ? { ...m, promptEvaluation: data.promptEvaluation } : m))
          );
        }

        // Add AI response
        const aiMsg: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          text: data.aiResponse || 'I am happy to explain this concept further!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Chat error', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Generate new AI Quiz
  const handleGenerateNewQuiz = async () => {
    setIsQuizGenerating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lessonTitle: selectedMaterial.title,
          keywords: selectedMaterial.keywords,
          materialId: selectedMaterial.id,
          questionCount: 3
        })
      });

      const data = await res.json();
      if (data.success && data.quiz) {
        setCurrentQuiz(data.quiz);
        setQuizAnswers({});
        setQuizSubmitted(false);
      }
    } catch (err) {
      console.error('Quiz generation failed', err);
    } finally {
      setIsQuizGenerating(false);
    }
  };

  // Calculate Quiz Score
  const calculateScore = () => {
    let score = 0;
    currentQuiz.questions.forEach(q => {
      if (q.type === 'mcq' && quizAnswers[q.id] === q.correctAnswer) {
        score += 100 / currentQuiz.questions.length;
      } else if (q.type !== 'mcq' && quizAnswers[q.id] && String(quizAnswers[q.id]).length > 10) {
        score += 100 / currentQuiz.questions.length;
      }
    });
    return Math.round(score);
  };

  return (
    <div className="space-y-6">
      {/* Top Selector Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('prep')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'prep'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>1. Chuẩn Bị Bài (Lesson Prep & Tree)</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'quiz'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListCheck className="w-4 h-4 text-emerald-600" />
            <span>2. Ôn Bài & làm Quiz</span>
          </button>
        </div>

        {/* Material Selection Pills */}
        <div className="flex items-center gap-2 pr-2">
          <span className="text-xs font-semibold text-gray-500">Lesson:</span>
          <select
            value={selectedMaterial.id}
            onChange={(e) => {
              const mat = materials.find(m => m.id === e.target.value);
              if (mat) setSelectedMaterial(mat);
            }}
            className="bg-white border border-gray-300 text-gray-800 text-xs font-bold py-1.5 px-3 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {materials.map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: PREPARATION & KNOWLEDGE TREE & CHAT */}
      {activeTab === 'prep' && (
        <div className="space-y-6">
          {/* Lesson Goals & Reading Material */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 google-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{selectedMaterial.subject}</span>
                  <h2 className="text-lg font-bold text-gray-900 mt-0.5">{selectedMaterial.title}</h2>
                </div>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                  Prep Status: Active
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Learning Objectives</h4>
                <ul className="space-y-1.5 text-xs text-gray-700">
                  {selectedMaterial.learningGoals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Upcoming Lesson Notes</h4>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 leading-relaxed font-normal whitespace-pre-line">
                  {selectedMaterial.nextLessonContent}
                </div>
              </div>
            </div>

            {/* Keyword Explorer Column */}
            <div className="lg:col-span-4 google-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Key Keywords to Research
              </h3>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {selectedMaterial.keywords.map((kw) => (
                  <div
                    key={kw.id}
                    onClick={() => setActiveKeywordFocus(kw.word)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      activeKeywordFocus === kw.word
                        ? 'bg-blue-50/80 border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{kw.word}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                        {kw.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1">{kw.definition}</p>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveKeywordFocus(kw.word);
                        handleSendMessage(`Can you explain ${kw.word} with a real-world example?`);
                      }}
                      className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                    >
                      Research with AI <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Knowledge Tree */}
          <KnowledgeTree
            nodes={selectedMaterial.treeNodes}
            onSelectKeyword={(kw) => {
              setActiveKeywordFocus(kw);
              handleSendMessage(`How does ${kw} connect to the main topic?`);
            }}
          />

          {/* AI Tutor Chatbot Panel with Live Prompt Coaching */}
          <div className="google-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">AI Tutor & Prompt Coach</h3>
                  <p className="text-xs text-gray-500">Ask questions and receive instant Prompt Coaching feedback on prompt clarity and depth</p>
                </div>
              </div>

              {activeKeywordFocus && (
                <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-bold">
                  Focus Keyword: {activeKeywordFocus}
                </span>
              )}
            </div>

            {/* Suggested Prompts Pill Chips */}
            <div>
              <span className="text-xs font-semibold text-gray-500 block mb-2">Recommended Prompts for "{activeKeywordFocus}":</span>
              <div className="flex flex-wrap gap-2">
                {selectedMaterial.keywords
                  .find(k => k.word === activeKeywordFocus)
                  ?.suggestedPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(p)}
                      className="google-chip text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{p}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200 space-y-4 max-h-[400px] overflow-y-auto">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={`flex gap-3 p-3.5 rounded-2xl text-xs max-w-2xl ${
                      msg.sender === 'student'
                        ? 'bg-blue-600 text-white ml-auto rounded-br-xs'
                        : 'bg-white border border-gray-200 text-gray-800 mr-auto rounded-bl-xs'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold ${msg.sender === 'student' ? 'text-blue-100' : 'text-gray-900'}`}>
                          {msg.sender === 'student' ? 'You (An Minh)' : 'Google Edu AI Tutor'}
                        </span>
                        <span className={`text-[10px] ${msg.sender === 'student' ? 'text-blue-200' : 'text-gray-400'}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>

                  {/* Prompt Coach Evaluation card under user message */}
                  {msg.sender === 'student' && msg.promptEvaluation && (
                    <div className="ml-auto max-w-xl">
                      <PromptCoachCard evaluation={msg.promptEvaluation} />
                    </div>
                  )}
                </div>
              ))}

              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs text-blue-600 bg-white p-3 rounded-xl border border-blue-100 w-fit">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Tutor is formulating explanation & evaluating prompt quality...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="text"
                placeholder={`Ask AI Tutor about ${activeKeywordFocus || 'this lesson'}...`}
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                disabled={isChatLoading}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!studentInput.trim() || isChatLoading}
                className="google-btn-primary flex items-center gap-1.5 px-5 text-xs py-2.5 disabled:opacity-50"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: REVIEW & QUIZ PRACTICE */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          <div className="google-card p-5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase">Readiness Assessment</span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">{currentQuiz.title}</h3>
              </div>

              <button
                onClick={handleGenerateNewQuiz}
                disabled={isQuizGenerating}
                className="google-btn-outline text-xs flex items-center gap-2 py-2 px-4"
              >
                {isQuizGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Quiz...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    <span>Generate New AI Adaptive Quiz</span>
                  </>
                )}
              </button>
            </div>

            {/* Questions List */}
            <div className="mt-6 space-y-6">
              {currentQuiz.questions.map((q, idx) => (
                <div key={q.id} className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                      Question {idx + 1} ({q.type.toUpperCase()})
                    </span>
                    {q.relatedKeyword && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                        {q.relatedKeyword}
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-gray-900">{q.question}</p>

                  {/* Multiple Choice Options */}
                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-2 pl-1">
                      {q.options.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-xs transition-all ${
                            quizAnswers[q.id] === optIdx
                              ? 'bg-blue-50 border-blue-600 font-semibold text-blue-900'
                              : 'bg-white border-gray-200 hover:bg-gray-100/60 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={quizAnswers[q.id] === optIdx}
                            onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                            disabled={quizSubmitted}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Essay / Practical Answer Area */}
                  {q.type !== 'mcq' && (
                    <div>
                      <textarea
                        rows={3}
                        placeholder="Write your explanation and reasoning..."
                        value={String(quizAnswers[q.id] || '')}
                        onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        disabled={quizSubmitted}
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {/* Submitted Feedback & Explanation */}
                  {quizSubmitted && (
                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1">
                      <span className="font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> AI Feedback & Explanation:
                      </span>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quiz Action Bar & Result */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
              {quizSubmitted ? (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg font-extrabold text-sm flex items-center gap-1.5">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <span>Your Quiz Score: {calculateScore()} / 100</span>
                  </div>
                  <button
                    onClick={() => {
                      setQuizSubmitted(false);
                      setQuizAnswers({});
                    }}
                    className="google-btn-outline text-xs py-2 px-4"
                  >
                    Retake Quiz
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setQuizSubmitted(true)}
                  disabled={Object.keys(quizAnswers).length === 0}
                  className="google-btn-primary text-xs py-2.5 px-6 disabled:opacity-50"
                >
                  Submit Quiz Answers
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
