import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClassDTO,
  TopicDTO,
  DocumentDTO,
  CreateClassInput,
  UpdateClassInput,
  CreateTopicInput,
  UpdateTopicInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  DataState,
} from '../types/domain.ts';
import { classService } from '../services/classService.ts';
import { topicService } from '../services/topicService.ts';
import { documentService } from '../services/documentService.ts';
import { ApiError } from '../services/apiClient.ts';
import { useFirebase } from './FirebaseContext.tsx';

interface DomainContextType {
  // Classes
  classesState: DataState<ClassDTO[]>;
  classes: ClassDTO[];
  selectedClassId: string | null;
  selectedClass: ClassDTO | null;
  setSelectedClassId: (classId: string | null) => void;
  refreshClasses: () => Promise<void>;
  createClass: (input: CreateClassInput) => Promise<ClassDTO>;
  updateClass: (classId: string, input: UpdateClassInput) => Promise<ClassDTO>;
  deleteClass: (classId: string) => Promise<void>;

  // Topics
  topicsState: DataState<TopicDTO[]>;
  topics: TopicDTO[];
  selectedTopicId: string | null;
  selectedTopic: TopicDTO | null;
  setSelectedTopicId: (topicId: string | null) => void;
  refreshTopics: () => Promise<void>;
  createTopic: (input: CreateTopicInput) => Promise<TopicDTO>;
  updateTopic: (topicId: string, input: UpdateTopicInput) => Promise<TopicDTO>;
  deleteTopic: (topicId: string) => Promise<void>;

  // Documents
  documentsState: DataState<DocumentDTO[]>;
  documents: DocumentDTO[];
  selectedDocumentId: string | null;
  selectedDocument: DocumentDTO | null;
  setSelectedDocumentId: (docId: string | null) => void;
  refreshDocuments: () => Promise<void>;
  createDocument: (input: CreateDocumentInput) => Promise<DocumentDTO>;
  uploadDocument: (file: File | Blob, metadata?: { title?: string; contentType?: string }) => Promise<DocumentDTO>;
  updateDocument: (docId: string, input: UpdateDocumentInput) => Promise<DocumentDTO>;
  deleteDocument: (docId: string) => Promise<void>;
}

const DomainContext = createContext<DomainContextType | null>(null);

export const DomainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, authoritativeRole, authLoading } = useFirebase();

  // Classes State
  const [classesState, setClassesState] = useState<DataState<ClassDTO[]>>({
    data: [],
    loading: true,
    error: null,
    status: null,
  });
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Topics State
  const [topicsState, setTopicsState] = useState<DataState<TopicDTO[]>>({
    data: [],
    loading: false,
    error: null,
    status: null,
  });
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Documents State
  const [documentsState, setDocumentsState] = useState<DataState<DocumentDTO[]>>({
    data: [],
    loading: false,
    error: null,
    status: null,
  });
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // 1. Fetch Classes (GET /api/classes)
  const refreshClasses = useCallback(async () => {
    // 1. If auth is still initializing, wait
    if (authLoading) {
      setClassesState(prev => ({ ...prev, loading: true, error: null, status: null }));
      return;
    }

    // 2. Fetch classes from PostgreSQL via /api/classes
    setClassesState(prev => ({ ...prev, loading: true, error: null, status: null }));
    try {
      const fetchedClasses = await classService.getClasses();
      setClassesState({
        data: fetchedClasses,
        loading: false,
        error: null,
        status: 200,
      });

      // Maintain selection if still valid, otherwise default to first available
      setSelectedClassId(prevId => {
        if (prevId && fetchedClasses.some(c => c.id === prevId)) {
          return prevId;
        }
        return fetchedClasses.length > 0 ? fetchedClasses[0].id : null;
      });
    } catch (err: any) {
      const status = err instanceof ApiError ? err.status : (err?.status || 500);
      const message = err?.message || 'Failed to load classes from server.';
      setClassesState({
        data: [],
        loading: false,
        error: message,
        status,
      });
      setSelectedClassId(null);
      setSelectedTopicId(null);
      setTopicsState({ data: [], loading: false, error: null, status: null });
      setSelectedDocumentId(null);
      setDocumentsState({ data: [], loading: false, error: null, status: null });
    }
  }, [authLoading]);

  const handleSetSelectedClassId = useCallback((newClassId: string | null) => {
    setSelectedClassId(newClassId);
    // Immediately clear dependent topic and document selections to prevent stale data flash
    setSelectedTopicId(null);
    setTopicsState({ data: [], loading: Boolean(newClassId), error: null, status: null });
    setSelectedDocumentId(null);
    setDocumentsState({ data: [], loading: false, error: null, status: null });
  }, []);

  const handleSetSelectedTopicId = useCallback((newTopicId: string | null) => {
    setSelectedTopicId(newTopicId);
    // Immediately clear dependent document selection and set loading state if new topic selected
    setSelectedDocumentId(null);
    setDocumentsState({ data: [], loading: Boolean(newTopicId), error: null, status: null });
  }, []);

  // Sync classes when auth state or authoritative role changes
  useEffect(() => {
    if (authLoading) {
      setClassesState(prev => ({ ...prev, loading: true, error: null, status: null }));
      return;
    }

    refreshClasses();
  }, [currentUser, authoritativeRole, authLoading, refreshClasses]);

  // 2. Fetch Topics for Selected Class (GET /api/classes/:classId/topics)
  const refreshTopics = useCallback(async () => {
    if (authLoading || !selectedClassId) {
      setTopicsState({ data: [], loading: false, error: null, status: null });
      setSelectedTopicId(null);
      return;
    }

    setTopicsState(prev => ({ ...prev, loading: true, error: null, status: null }));
    // Immediately clear stale documents
    setDocumentsState({ data: [], loading: false, error: null, status: null });
    setSelectedDocumentId(null);

    try {
      const fetchedTopics = await topicService.getTopics(selectedClassId);
      setTopicsState({
        data: fetchedTopics,
        loading: false,
        error: null,
        status: 200,
      });

      setSelectedTopicId(prevId => {
        if (prevId && fetchedTopics.some(t => t.id === prevId)) {
          return prevId;
        }
        return fetchedTopics.length > 0 ? fetchedTopics[0].id : null;
      });
    } catch (err: any) {
      const status = err instanceof ApiError ? err.status : (err?.status || 500);
      const message = err?.message || 'Failed to load topics for this class.';
      setTopicsState({
        data: [],
        loading: false,
        error: message,
        status,
      });
      setSelectedTopicId(null);
    }
  }, [authLoading, selectedClassId]);

  // Load topics whenever selectedClassId or auth changes
  useEffect(() => {
    if (!authLoading && selectedClassId) {
      refreshTopics();
    } else if (!selectedClassId) {
      setTopicsState({ data: [], loading: false, error: null, status: null });
      setSelectedTopicId(null);
    }
  }, [authLoading, currentUser, selectedClassId, refreshTopics]);

  // 3. Fetch Documents for Selected Topic (GET /api/topics/:topicId/documents)
  const refreshDocuments = useCallback(async () => {
    if (authLoading || !selectedTopicId) {
      setDocumentsState({ data: [], loading: false, error: null, status: null });
      setSelectedDocumentId(null);
      return;
    }

    setDocumentsState(prev => ({ ...prev, loading: true, error: null, status: null }));
    try {
      const fetchedDocs = await documentService.getDocuments(selectedTopicId);
      setDocumentsState({
        data: fetchedDocs,
        loading: false,
        error: null,
        status: 200,
      });

      setSelectedDocumentId(prevId => {
        if (prevId && fetchedDocs.some(d => d.id === prevId)) {
          return prevId;
        }
        return fetchedDocs.length > 0 ? fetchedDocs[0].id : null;
      });
    } catch (err: any) {
      const status = err instanceof ApiError ? err.status : (err?.status || 500);
      const message = err?.message || 'Failed to load documents for this topic.';
      setDocumentsState({
        data: [],
        loading: false,
        error: message,
        status,
      });
      setSelectedDocumentId(null);
    }
  }, [authLoading, selectedTopicId]);

  // Load documents whenever selectedTopicId or auth changes
  useEffect(() => {
    if (!authLoading && selectedTopicId) {
      refreshDocuments();
    } else if (!selectedTopicId) {
      setDocumentsState({ data: [], loading: false, error: null, status: null });
      setSelectedDocumentId(null);
    }
  }, [authLoading, currentUser, selectedTopicId, refreshDocuments]);

  // Class Actions
  const createClass = useCallback(async (input: CreateClassInput): Promise<ClassDTO> => {
    const newClass = await classService.createClass(input);
    setClassesState(prev => ({
      ...prev,
      data: [...(prev.data || []), newClass],
    }));
    setSelectedClassId(newClass.id);
    return newClass;
  }, []);

  const updateClass = useCallback(async (classId: string, input: UpdateClassInput): Promise<ClassDTO> => {
    const updated = await classService.updateClass(classId, input);
    setClassesState(prev => ({
      ...prev,
      data: (prev.data || []).map(c => (c.id === classId ? updated : c)),
    }));
    return updated;
  }, []);

  const deleteClass = useCallback(async (classId: string): Promise<void> => {
    await classService.deleteClass(classId);
    setClassesState(prev => {
      const remaining = (prev.data || []).filter(c => c.id !== classId);
      return { ...prev, data: remaining };
    });
    setSelectedClassId(prevId => (prevId === classId ? null : prevId));
  }, []);

  // Topic Actions
  const createTopic = useCallback(async (input: CreateTopicInput): Promise<TopicDTO> => {
    if (!selectedClassId) {
      throw new Error('Please select an active class before creating a topic.');
    }
    const newTopic = await topicService.createTopic(selectedClassId, input);
    setTopicsState(prev => ({
      ...prev,
      data: [...(prev.data || []), newTopic],
    }));
    setSelectedTopicId(newTopic.id);
    return newTopic;
  }, [selectedClassId]);

  const updateTopic = useCallback(async (topicId: string, input: UpdateTopicInput): Promise<TopicDTO> => {
    const updated = await topicService.updateTopic(topicId, input);
    setTopicsState(prev => ({
      ...prev,
      data: (prev.data || []).map(t => (t.id === topicId ? updated : t)),
    }));
    return updated;
  }, []);

  const deleteTopic = useCallback(async (topicId: string): Promise<void> => {
    await topicService.deleteTopic(topicId);
    setTopicsState(prev => {
      const remaining = (prev.data || []).filter(t => t.id !== topicId);
      return { ...prev, data: remaining };
    });
    setSelectedTopicId(prevId => (prevId === topicId ? null : prevId));
  }, []);

  // Document Actions
  const createDocument = useCallback(async (input: CreateDocumentInput): Promise<DocumentDTO> => {
    if (!selectedTopicId) {
      throw new Error('Please select an active topic before adding a document.');
    }
    const newDoc = await documentService.createDocument(selectedTopicId, input);
    setDocumentsState(prev => ({
      ...prev,
      data: [...(prev.data || []), newDoc],
    }));
    setSelectedDocumentId(newDoc.id);
    return newDoc;
  }, [selectedTopicId]);

  const uploadDocument = useCallback(async (file: File | Blob, metadata?: { title?: string; contentType?: string }): Promise<DocumentDTO> => {
    if (!selectedTopicId) {
      throw new Error('Please select an active topic before uploading a document.');
    }
    const newDoc = await documentService.uploadDocument(selectedTopicId, file, metadata);
    setDocumentsState(prev => ({
      ...prev,
      data: [...(prev.data || []), newDoc],
    }));
    setSelectedDocumentId(newDoc.id);
    return newDoc;
  }, [selectedTopicId]);

  const updateDocument = useCallback(async (docId: string, input: UpdateDocumentInput): Promise<DocumentDTO> => {
    const updated = await documentService.updateDocument(docId, input);
    setDocumentsState(prev => ({
      ...prev,
      data: (prev.data || []).map(d => (d.id === docId ? updated : d)),
    }));
    return updated;
  }, []);

  const deleteDocument = useCallback(async (docId: string): Promise<void> => {
    await documentService.deleteDocument(docId);
    setDocumentsState(prev => {
      const remaining = (prev.data || []).filter(d => d.id !== docId);
      return { ...prev, data: remaining };
    });
    setSelectedDocumentId(prevId => (prevId === docId ? null : prevId));
  }, []);

  // Derived selected objects
  const classes = classesState.data || [];
  const selectedClass = useMemo(
    () => classes.find(c => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const topics = topicsState.data || [];
  const selectedTopic = useMemo(
    () => topics.find(t => t.id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );

  const documents = documentsState.data || [];
  const selectedDocument = useMemo(
    () => documents.find(d => d.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );

  return (
    <DomainContext.Provider
      value={{
        classesState,
        classes,
        selectedClassId,
        selectedClass,
        setSelectedClassId: handleSetSelectedClassId,
        refreshClasses,
        createClass,
        updateClass,
        deleteClass,

        topicsState,
        topics,
        selectedTopicId,
        selectedTopic,
        setSelectedTopicId: handleSetSelectedTopicId,
        refreshTopics,
        createTopic,
        updateTopic,
        deleteTopic,

        documentsState,
        documents,
        selectedDocumentId,
        selectedDocument,
        setSelectedDocumentId,
        refreshDocuments,
        createDocument,
        uploadDocument,
        updateDocument,
        deleteDocument,
      }}
    >
      {children}
    </DomainContext.Provider>
  );
};

export function useDomain() {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error('useDomain must be used within a DomainProvider');
  }
  return context;
}
