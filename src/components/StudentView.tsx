import React, { useState, useEffect } from 'react';
import { Material, Quiz, ChatMessage, Keyword, QuizQuestion } from '../types';
import { KnowledgeTree } from './KnowledgeTree';
import { PromptCoachCard } from './PromptCoachCard';
import { StudentTopicExplorer } from './curriculum/StudentTopicExplorer.tsx';
import { useDomain } from '../context/DomainContext.tsx';
import { apiClient } from '../services/apiClient';
import {
  BookOpen, Sparkles, Send, CheckCircle2, AlertCircle, HelpCircle,
  Lightbulb, RefreshCw, Loader2, ArrowRight, Award, MessageSquare, ListCheck,
  FolderTree, FileText, Layers
} from 'lucide-react';

interface StudentViewProps {
  materials: Material[];
  initialQuiz: Quiz;
}

export const StudentView: React.FC<StudentViewProps> = ({ materials, initialQuiz }) => {
  const [activeTab, setActiveTab] = useState<'curriculum' | 'prep' | 'quiz'>('curriculum');
  const [selectedMaterial, setSelectedMaterial] = useState<Material>(materials[0] || null);

  const {
    selectedClass,
    selectedTopic,
    documents,
  } = useDomain();

  // Chatbot state
  const activeTitle = selectedTopic?.title || selectedMaterial?.title || 'DNA Replication & Gene Expression';
  const activeContext = selectedTopic?.description || selectedMaterial?.nextLessonContent || 'Review the core molecular biology syllabus.';

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `Hello! I am your AI Tutor for **${activeTitle}**. Ask me any questions about this topic, or click one of the suggested prompts below to practice asking high-quality prompts!`,
      timestamp: 'Just now'
    }
  ]);
  const [studentInput, setStudentInput] = useState('');
  const [activeKeywordFocus, setActiveKeywordFocus] = useState<string>(
    selectedMaterial?.keywords?.[0]?.word || 'DNA Polymerase'
  );
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Sync welcome message when topic changes
  useEffect(() => {
    if (selectedTopic) {
      setChatMessages([
        {
          id: `welcome-${selectedTopic.id}`,
          sender: 'ai',
          text: `Welcome to **${selectedTopic.title}**! Ask me questions about this module or practice prompting to test your readiness.`,
          timestamp: 'Just now'
        }
      ]);
    }
  }, [selectedTopic?.id]);

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
      const data = await apiClient.post<{
        success: boolean;
        promptEvaluation?: any;
        aiResponse?: string;
      }>('/ai/chat', {
        studentPrompt: promptToSend,
        keyword: activeKeywordFocus,
        lessonContext: activeContext,
        chatHistory: chatMessages.slice(-4)
      });

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
      const data = await apiClient.post<{
        success: boolean;
        quiz?: Quiz;
      }>('/ai/generate-quiz', {
        lessonTitle: activeTitle,
        keywords: selectedMaterial?.keywords || [],
        materialId: selectedMaterial?.id || 'demo-mat',
        questionCount: 3
      });

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
    const questions = currentQuiz?.questions || [];
    if (questions.length === 0) return 0;
    questions.forEach(q => {
      if (!q) return;
      if (q.type === 'mcq' && quizAnswers[q.id] === q.correctAnswer) {
        score += 100 / questions.length;
      } else if (q.type !== 'mcq' && quizAnswers[q.id] && String(quizAnswers[q.id]).length > 10) {
        score += 100 / questions.length;
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
            onClick={() => setActiveTab('curriculum')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'curriculum'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>1. Syllabus & Topics (PostgreSQL)</span>
          </button>

          <button
            onClick={() => setActiveTab('prep')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'prep'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>2. AI Study Assistant & Tree</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListCheck className="w-4 h-4 text-emerald-600" />
            <span>3. Ôn Bài & làm Quiz</span>
          </button>
        </div>

        {/* Active Class & Topic Indicator */}
        <div className="flex items-center gap-2 pr-2 text-xs">
          {selectedClass && (
            <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
              {selectedClass.name}
            </span>
          )}
          {selectedTopic && (
            <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              Topic: {selectedTopic.title}
            </span>
          )}
        </div>
      </div>

      {/* TAB 1: CURRICULUM & TOPICS EXPLORER (PostgreSQL real backend) */}
      {activeTab === 'curriculum' && (
        <StudentTopicExplorer
          onTopicSelectedForStudy={(topic) => {
            setActiveKeywordFocus(topic.title);
          }}
        />
      )}

      {/* TAB 2: PREPARATION & KNOWLEDGE TREE & CHAT */}
      {activeTab === 'prep' && (
        <div className="space-y-6">
          {/* Lesson Goals & Reading Material */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 google-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                    {selectedClass?.subject || selectedMaterial?.subject || 'Biology'}
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-0.5">{activeTitle}</h2>
                </div>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                  Prep Status: Active
                </span>
              </div>

              {selectedMaterial?.learningGoals && selectedMaterial.learningGoals.length > 0 && (
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
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Module Overview / Lesson Notes</h4>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-800 leading-relaxed font-normal whitespace-pre-line">
                  {activeContext}
                </div>
              </div>
            </div>

            {/* Keyword Explorer Column */}
            <div className="lg:col-span-4 google-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Key Keywords to Research
              </h3>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {(selectedMaterial?.keywords || []).map((kw) => (
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
                      className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      Research with AI <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Knowledge Tree */}
          {selectedMaterial?.treeNodes && selectedMaterial.treeNodes.length > 0 && (
            <KnowledgeTree
              nodes={selectedMaterial.treeNodes}
              onSelectKeyword={(kw) => {
                setActiveKeywordFocus(kw);
                handleSendMessage(`How does ${kw} connect to the main topic?`);
              }}
            />
          )}

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
                {[
                  `Why is ${activeKeywordFocus} essential in this biological process?`,
                  `Compare ${activeKeywordFocus} with similar mechanisms in other organisms.`,
                  `What happens to cell function if ${activeKeywordFocus} undergoes a mutation?`
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={`flex gap-3 p-4 rounded-2xl text-xs ${
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

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">
                          {msg.sender === 'student' ? 'You' : 'Google Edu AI Tutor'}
                        </span>
                        <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                      </div>
                      <p className="text-gray-800 leading-relaxed whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>

                  {/* Prompt Coach Evaluation Box for Student Messages */}
                  {msg.sender === 'student' && msg.promptEvaluation && (
                    <div className="ml-8 max-w-xl">
                      <PromptCoachCard evaluation={msg.promptEvaluation} />
                    </div>
                  )}
                </div>
              ))}

              {isChatLoading && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 text-gray-500 text-xs rounded-xl border border-gray-200 mr-8">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Gemini AI Tutor is synthesizing an explanation and evaluating your prompt...</span>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="pt-3 border-t border-gray-200 flex gap-2">
              <input
                type="text"
                placeholder={`Ask a specific question about ${activeKeywordFocus || activeTitle}...`}
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!studentInput.trim() || isChatLoading}
                className="google-btn-primary px-5 py-2.5 flex items-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SELF-STUDY READINESS QUIZ */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          <div className="google-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Lesson Readiness Self-Test</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{currentQuiz?.title || 'Readiness Quiz'}</h3>
                <p className="text-xs text-gray-500 mt-1">Answer the questions below to test your understanding before lecture</p>
              </div>

              <button
                onClick={handleGenerateNewQuiz}
                disabled={isQuizGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isQuizGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-emerald-600" />}
                <span>Generate New AI Questions</span>
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {(currentQuiz?.questions || []).map((q, qIndex) => (
                <div key={q.id} className="p-4 rounded-xl bg-gray-50/70 border border-gray-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {qIndex + 1}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 pt-0.5 leading-relaxed">{q.question}</h4>
                  </div>

                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-2 pl-8">
                      {q.options.map((opt, optIndex) => {
                        const isSelected = quizAnswers[q.id] === optIndex;
                        const isCorrect = optIndex === q.correctAnswer;
                        let optionStyle = 'bg-white border-gray-200 hover:border-gray-300';

                        if (quizSubmitted) {
                          if (isCorrect) {
                            optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold';
                          } else if (isSelected && !isCorrect) {
                            optionStyle = 'bg-rose-50 border-rose-400 text-rose-900';
                          }
                        } else if (isSelected) {
                          optionStyle = 'bg-blue-50 border-blue-600 text-blue-900 font-semibold';
                        }

                        return (
                          <div
                            key={optIndex}
                            onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [q.id]: optIndex }))}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${optionStyle}`}
                          >
                            <span>{opt}</span>
                            {quizSubmitted && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                            {quizSubmitted && isSelected && !isCorrect && <AlertCircle className="w-4 h-4 text-rose-500" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type !== 'mcq' && (
                    <div className="pl-8">
                      <textarea
                        rows={3}
                        disabled={quizSubmitted}
                        placeholder="Write your explanation in your own words..."
                        value={(quizAnswers[q.id] as string) || ''}
                        onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {quizSubmitted && q.explanation && (
                    <div className="mt-2 pl-8 p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
                      <strong>AI Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
              {quizSubmitted ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Your Readiness Score:</span>
                    <span className={`text-base font-extrabold ${calculateScore() >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {calculateScore()} / 100
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  {Object.keys(quizAnswers).length} of {currentQuiz?.questions?.length || 0} questions answered
                </div>
              )}

              <div className="flex items-center gap-3">
                {quizSubmitted ? (
                  <button
                    onClick={() => {
                      setQuizSubmitted(false);
                      setQuizAnswers({});
                    }}
                    className="google-btn-secondary text-xs px-4 py-2 cursor-pointer"
                  >
                    Retake Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => setQuizSubmitted(true)}
                    disabled={Object.keys(quizAnswers).length === 0}
                    className="google-btn-primary text-xs px-6 py-2.5 disabled:opacity-50 cursor-pointer"
                  >
                    Submit Quiz & Get Score
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
