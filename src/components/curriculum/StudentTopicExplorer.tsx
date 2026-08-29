import React, { useState } from 'react';
import {
  Folder,
  FileText,
  BookOpen,
  CheckCircle2,
  Lock,
  ChevronRight,
  Eye,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useDomain } from '../../context/DomainContext.tsx';
import { TopicDTO, DocumentDTO } from '../../types/domain.ts';
import { DataStatusState } from '../common/DataStatusState.tsx';

interface StudentTopicExplorerProps {
  onTopicSelectedForStudy?: (topic: TopicDTO, docs: DocumentDTO[]) => void;
}

export const StudentTopicExplorer: React.FC<StudentTopicExplorerProps> = ({
  onTopicSelectedForStudy,
}) => {
  const {
    classesState,
    classes,
    selectedClassId,
    selectedClass,
    setSelectedClassId,
    refreshClasses,

    topicsState,
    topics,
    selectedTopicId,
    selectedTopic,
    setSelectedTopicId,
    refreshTopics,

    documentsState,
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    refreshDocuments,
  } = useDomain();

  // Document Reading Modal
  const [readingDoc, setReadingDoc] = useState<DocumentDTO | null>(null);

  const formatContentType = (type: string) => {
    switch (type) {
      case 'lecture_notes':
        return 'Lecture Notes';
      case 'syllabus':
        return 'Syllabus';
      case 'exercise':
        return 'Exercise & Homework';
      case 'reference':
        return 'Reference Material';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Classes & Topic Selection Banner */}
      <DataStatusState
        loading={classesState.loading}
        loadingMessage="Loading your enrolled classes..."
        error={classesState.error}
        statusCode={classesState.status}
        onRetry={refreshClasses}
        isEmpty={!classesState.loading && !classesState.error && classes.length === 0}
        emptyTitle="No Classes Yet"
        emptyDescription="You are not actively enrolled in any classes yet. Ask your teacher for an invitation or class code."
      >
        <div className="google-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Enrolled Curriculum
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {selectedClass ? `${selectedClass.name} (${selectedClass.code})` : 'Select an Enrolled Class'}
              </h3>
              {selectedClass?.description && (
                <p className="text-xs text-slate-500 mt-1">{selectedClass.description}</p>
              )}
            </div>

            {/* Enrolled Class Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Your Classes:</span>
              <select
                value={selectedClassId || ''}
                onChange={(e) => setSelectedClassId(e.target.value || null)}
                className="bg-white border border-slate-300 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Topics Row */}
          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Published Syllabus Topics ({topics.length})</span>
              {selectedTopic && (
                <span className="text-emerald-700 font-semibold lowercase">
                  active: {selectedTopic.title}
                </span>
              )}
            </h4>

            <DataStatusState
              loading={topicsState.loading}
              loadingMessage="Loading topics for this class..."
              error={topicsState.error}
              statusCode={topicsState.status}
              onRetry={refreshTopics}
              isEmpty={!topicsState.loading && !topicsState.error && topics.length === 0}
              emptyTitle="No Published Topics"
              emptyDescription="Your teacher has not published any lesson topics for this class yet."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {topics.map((topic) => {
                  const isSelected = selectedTopicId === topic.id;
                  return (
                    <div
                      key={topic.id}
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                        if (onTopicSelectedForStudy) {
                          onTopicSelectedForStudy(topic, documents);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {topic.orderIndex}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 line-clamp-1">
                            {topic.title}
                          </h5>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected ? 'text-blue-600 translate-x-0.5' : 'text-slate-300'
                          }`}
                        />
                      </div>

                      {topic.description && (
                        <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                          {topic.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </DataStatusState>
          </div>
        </div>
      </DataStatusState>

      {/* 2. Documents Section for Selected Topic */}
      {selectedTopic && (
        <div className="google-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Topic Study Materials
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                {selectedTopic.title} — Reading & Document Metadata
              </h4>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {documents.length} Available Documents
            </span>
          </div>

          <DataStatusState
            loading={documentsState.loading}
            loadingMessage="Loading documents from PostgreSQL..."
            error={documentsState.error}
            statusCode={documentsState.status}
            onRetry={refreshDocuments}
            isEmpty={!documentsState.loading && !documentsState.error && documents.length === 0}
            emptyTitle="No documents yet"
            emptyDescription="Your teacher has not uploaded study readings or documents for this topic yet."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc) => {
                const formattedDate = doc.createdAt
                  ? new Date(doc.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;

                return (
                  <div
                    key={doc.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">{doc.title}</h5>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold capitalize">
                                {formatContentType(doc.contentType)}
                              </span>
                              <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                                ID: {doc.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {doc.status}
                        </span>
                      </div>

                      {doc.content && (
                        <p className="text-[11px] text-slate-600 mt-3 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {doc.content}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{doc.fileSize ? `${doc.fileSize} bytes` : 'Metadata only'}</span>
                        {formattedDate && <span>• {formattedDate}</span>}
                      </div>

                      {doc.content && (
                        <button
                          onClick={() => setReadingDoc(doc)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Read Notes</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DataStatusState>
        </div>
      )}

      {/* READING MODAL */}
      {readingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  {formatContentType(readingDoc.contentType)}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{readingDoc.title}</h3>
              </div>
              <button
                onClick={() => setReadingDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                {readingDoc.content}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end text-xs">
              <button
                onClick={() => setReadingDoc(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
