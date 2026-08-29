import React, { useState } from 'react';
import {
  Folder,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Archive,
  ChevronRight,
  Loader2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { useDomain } from '../../context/DomainContext.tsx';
import { TopicDTO, CreateTopicInput, UpdateTopicInput } from '../../types/domain.ts';
import { DataStatusState } from '../common/DataStatusState.tsx';

interface TopicManagerProps {
  onSelectTopicCallback?: (topic: TopicDTO) => void;
}

export const TopicManager: React.FC<TopicManagerProps> = ({ onSelectTopicCallback }) => {
  const {
    selectedClass,
    topicsState,
    topics,
    selectedTopicId,
    setSelectedTopicId,
    refreshTopics,
    createTopic,
    updateTopic,
    deleteTopic,
  } = useDomain();

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState<CreateTopicInput>({
    title: '',
    description: '',
    status: 'published',
    orderIndex: 0,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingTopic, setEditingTopic] = useState<TopicDTO | null>(null);
  const [editData, setEditData] = useState<UpdateTopicInput>({});
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.title.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const newTopic = await createTopic({
        title: createData.title.trim(),
        description: createData.description?.trim() || null,
        status: createData.status || 'published',
        orderIndex: Number(createData.orderIndex) || (topics.length + 1),
      });
      setIsCreateOpen(false);
      setCreateData({ title: '', description: '', status: 'published', orderIndex: 0 });
      if (onSelectTopicCallback) {
        onSelectTopicCallback(newTopic);
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create topic.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;

    setUpdating(true);
    setEditError(null);
    try {
      await updateTopic(editingTopic.id, {
        title: editData.title?.trim(),
        description: editData.description !== undefined ? editData.description?.trim() || null : undefined,
        status: editData.status,
        orderIndex: editData.orderIndex !== undefined ? Number(editData.orderIndex) : undefined,
      });
      setEditingTopic(null);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update topic.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (topicId: string, topicTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete topic "${topicTitle}"? All documents in this topic will be removed.`)) {
      return;
    }

    setDeletingId(topicId);
    try {
      await deleteTopic(topicId);
    } catch (err: any) {
      alert(`Delete failed: ${err?.message || 'Server error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (topic: TopicDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTopic(topic);
    setEditData({
      title: topic.title,
      description: topic.description || '',
      status: topic.status,
      orderIndex: topic.orderIndex,
    });
    setEditError(null);
  };

  if (!selectedClass) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
        <p className="text-xs font-semibold text-slate-500">
          Please select a class from the top menu to view and manage its curriculum topics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">PostgreSQL Topics</h3>
            <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              {selectedClass.name} ({selectedClass.code})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Organized syllabus modules backed by PostgreSQL with role-based access control.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateData({
              title: '',
              description: '',
              status: 'published',
              orderIndex: topics.length + 1,
            });
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Topic</span>
        </button>
      </div>

      {/* Topics List with DataStatusState */}
      <DataStatusState
        loading={topicsState.loading}
        loadingMessage="Loading topics from PostgreSQL..."
        error={topicsState.error}
        statusCode={topicsState.status}
        onRetry={refreshTopics}
        isEmpty={!topicsState.loading && !topicsState.error && topics.length === 0}
        emptyTitle="No Topics in this Class"
        emptyDescription="Create your first curriculum topic to begin adding documents and lecture notes."
        emptyActionLabel="Create First Topic"
        onEmptyAction={() => setIsCreateOpen(true)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topics.map((topic) => {
            const isSelected = selectedTopicId === topic.id;
            return (
              <div
                key={topic.id}
                onClick={() => {
                  setSelectedTopicId(topic.id);
                  if (onSelectTopicCallback) onSelectTopicCallback(topic);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {topic.orderIndex}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {topic.title}
                      </h4>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                        topic.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : topic.status === 'draft'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {topic.status === 'published' ? 'Published' : topic.status === 'draft' ? 'Draft' : 'Archived'}
                    </span>
                  </div>

                  {topic.description && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {topic.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isSelected ? 'Active Topic' : 'Click to select'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEditModal(topic, e)}
                      title="Edit Topic"
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(topic.id, topic.title);
                      }}
                      disabled={deletingId === topic.id}
                      title="Delete Topic"
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === topic.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DataStatusState>

      {/* CREATE TOPIC MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Folder className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Create Topic for {selectedClass.name}</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topic Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., DNA Replication & Transcription"
                  value={createData.title}
                  onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={createData.status}
                    onChange={(e) => setCreateData({ ...createData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="published">Published (Students can see)</option>
                    <option value="draft">Draft (Teacher only)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={createData.orderIndex}
                    onChange={(e) => setCreateData({ ...createData, orderIndex: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Objectives (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline key concepts, required reading, or syllabus milestones..."
                  value={createData.description || ''}
                  onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Topic...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Topic</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TOPIC MODAL */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit Topic</h3>
              </div>
              <button
                onClick={() => setEditingTopic(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topic Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editData.status || 'published'}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="published">Published (Students can see)</option>
                    <option value="draft">Draft (Teacher only)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editData.orderIndex || 1}
                    onChange={(e) => setEditData({ ...editData, orderIndex: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Objectives
                </label>
                <textarea
                  rows={3}
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
