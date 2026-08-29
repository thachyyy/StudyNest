import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
  FileCode,
  Layers,
  Calendar,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { useDomain } from '../../context/DomainContext.tsx';
import { DocumentDTO, CreateDocumentInput, UpdateDocumentInput } from '../../types/domain.ts';
import { DataStatusState } from '../common/DataStatusState.tsx';

interface DocumentManagerProps {
  onSelectDocumentCallback?: (doc: DocumentDTO) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ onSelectDocumentCallback }) => {
  const {
    selectedTopic,
    documentsState,
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    refreshDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
  } = useDomain();

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState<CreateDocumentInput>({
    title: '',
    contentType: 'lecture_notes',
    content: '',
    sourceUrl: '',
    status: 'ready',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingDoc, setEditingDoc] = useState<DocumentDTO | null>(null);
  const [editData, setEditData] = useState<UpdateDocumentInput>({});
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Viewer Modal
  const [viewingDoc, setViewingDoc] = useState<DocumentDTO | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.title.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const newDoc = await createDocument({
        title: createData.title.trim(),
        contentType: createData.contentType || 'lecture_notes',
        content: createData.content?.trim() || null,
        sourceUrl: createData.sourceUrl?.trim() || null,
        fileSize: createData.content ? createData.content.length : 0,
        status: createData.status || 'ready',
      });
      setIsCreateOpen(false);
      setCreateData({ title: '', contentType: 'lecture_notes', content: '', sourceUrl: '', status: 'ready' });
      if (onSelectDocumentCallback) {
        onSelectDocumentCallback(newDoc);
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create document.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    setUpdating(true);
    setEditError(null);
    try {
      await updateDocument(editingDoc.id, {
        title: editData.title?.trim(),
        contentType: editData.contentType,
        content: editData.content !== undefined ? editData.content?.trim() || null : undefined,
        sourceUrl: editData.sourceUrl !== undefined ? editData.sourceUrl?.trim() || null : undefined,
        fileSize: editData.content !== undefined ? (editData.content ? editData.content.length : 0) : undefined,
        status: editData.status,
      });
      setEditingDoc(null);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update document.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete document "${docTitle}"?`)) {
      return;
    }

    setDeletingId(docId);
    try {
      await deleteDocument(docId);
    } catch (err: any) {
      alert(`Delete failed: ${err?.message || 'Server error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (doc: DocumentDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDoc(doc);
    setEditData({
      title: doc.title,
      contentType: doc.contentType,
      content: doc.content || '',
      sourceUrl: doc.sourceUrl || '',
      status: doc.status,
    });
    setEditError(null);
  };

  const formatContentType = (type: string) => {
    switch (type) {
      case 'lecture_notes':
        return 'Lecture Notes';
      case 'syllabus':
        return 'Syllabus';
      case 'exercise':
        return 'Exercises & Problems';
      case 'reference':
        return 'Reference Material';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  if (!selectedTopic) {
    return (
      <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200">
        <p className="text-xs font-semibold text-slate-500">
          Select a topic above to view and attach curriculum documents & lecture notes.
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
            <h3 className="text-base font-bold text-slate-900">Topic Documents</h3>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              Topic: {selectedTopic.title}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            PostgreSQL-backed document metadata and study readings.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateData({
              title: '',
              contentType: 'lecture_notes',
              content: '',
              sourceUrl: '',
              status: 'ready',
            });
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </button>
      </div>

      {/* Document List with DataStatusState */}
      <DataStatusState
        loading={documentsState.loading}
        loadingMessage="Loading documents from PostgreSQL..."
        error={documentsState.error}
        statusCode={documentsState.status}
        onRetry={refreshDocuments}
        isEmpty={!documentsState.loading && !documentsState.error && documents.length === 0}
        emptyTitle="No documents yet"
        emptyDescription="Add lecture notes, reading excerpts, or reference metadata for students."
        emptyActionLabel="Add First Document"
        onEmptyAction={() => setIsCreateOpen(true)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documents.map((doc) => {
            const isSelected = selectedDocumentId === doc.id;
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
                onClick={() => {
                  setSelectedDocumentId(doc.id);
                  if (onSelectDocumentCallback) onSelectDocumentCallback(doc);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-100 text-slate-700 rounded-xl shrink-0">
                        <FileText className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {doc.title}
                        </h4>
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

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                        doc.status === 'ready'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : doc.status === 'processing'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  {doc.content && (
                    <p className="text-[11px] text-slate-600 mt-2.5 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {doc.content}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span>{doc.fileSize ? `${doc.fileSize} bytes` : 'Metadata only'}</span>
                      {formattedDate && <span>• {formattedDate}</span>}
                    </div>

                    {doc.content && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingDoc(doc);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer ml-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read Content</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEditModal(doc, e)}
                      title="Edit Document Metadata"
                      className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id, doc.title);
                      }}
                      disabled={deletingId === doc.id}
                      title="Delete Document"
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === doc.id ? (
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

      {/* CREATE DOCUMENT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Add Document Metadata</h3>
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
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., DNA Polymerase & Helicase Overview"
                  value={createData.title}
                  onChange={(e) => setCreateData({ ...createData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={createData.contentType}
                    onChange={(e) => setCreateData({ ...createData, contentType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="lecture_notes">Lecture Notes</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="exercise">Exercise / Problems</option>
                    <option value="reference">Reference Material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={createData.status}
                    onChange={(e) => setCreateData({ ...createData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ready">Ready (Available to students)</option>
                    <option value="draft">Draft</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Text Content / Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste lecture notes, study excerpts, or key concept bullet points..."
                  value={createData.content || ''}
                  onChange={(e) => setCreateData({ ...createData, content: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Document...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT DOCUMENT MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit Document</h3>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
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
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={editData.contentType || 'lecture_notes'}
                    onChange={(e) => setEditData({ ...editData, contentType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="lecture_notes">Lecture Notes</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="exercise">Exercise / Problems</option>
                    <option value="reference">Reference Material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editData.status || 'ready'}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ready">Ready</option>
                    <option value="draft">Draft</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Text Content / Notes
                </label>
                <textarea
                  rows={4}
                  value={editData.content || ''}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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

      {/* DOCUMENT VIEWER MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  {formatContentType(viewingDoc.contentType)}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{viewingDoc.title}</h3>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                {viewingDoc.content || 'No text content attached to this document.'}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Status: <strong className="text-slate-700">{viewingDoc.status}</strong></span>
              <button
                onClick={() => setViewingDoc(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
