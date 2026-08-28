import React from 'react';
import { PromptEvaluation } from '../types';
import { Award, Lightbulb, MessageSquareCode, Star, ShieldAlert } from 'lucide-react';

interface PromptCoachCardProps {
  evaluation: PromptEvaluation;
  studentName?: string;
  compact?: boolean;
}

export const PromptCoachCard: React.FC<PromptCoachCardProps> = ({ evaluation, studentName, compact }) => {
  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-xs text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-blue-600" /> Prompt Quality
          </span>
          <span className={`px-2 py-0.5 rounded-full font-bold border ${getScoreBadgeColor(evaluation.score)}`}>
            {evaluation.score}/100
          </span>
        </div>
        <p className="text-gray-600 line-clamp-1"><strong className="text-gray-800">Feedback:</strong> {evaluation.critique}</p>
        <p className="text-blue-700 bg-blue-50/70 p-1.5 rounded border border-blue-100 flex items-start gap-1">
          <Lightbulb className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
          <span><strong>Tip:</strong> {evaluation.improvementTip}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl border border-blue-100 p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <MessageSquareCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">AI Prompt Coach Evaluation</h4>
            {studentName && <p className="text-xs text-gray-500">Student: {studentName}</p>}
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-extrabold border ${getScoreBadgeColor(evaluation.score)} flex items-center gap-1`}>
          <Award className="w-4 h-4" />
          <span>{evaluation.score} / 100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getScoreBarColor(evaluation.score)}`}
            style={{ width: `${evaluation.score}%` }}
          />
        </div>
      </div>

      {/* Ratings */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-white p-2.5 rounded-lg border border-gray-200/80 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Clarity</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${star <= evaluation.clarity ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-gray-200/80 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Conceptual Depth</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${star <= evaluation.depth ? 'text-blue-500 fill-blue-500' : 'text-gray-200'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Critique & Improvement */}
      <div className="mt-3 space-y-2 text-xs">
        <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-gray-700">
          <span className="font-semibold text-gray-900 block mb-0.5">Analysis:</span>
          {evaluation.critique}
        </div>

        <div className="p-2.5 bg-amber-50/80 rounded-lg border border-amber-200/80 text-amber-900 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Suggested Improvement:</span>
            {evaluation.improvementTip}
          </div>
        </div>
      </div>
    </div>
  );
};
