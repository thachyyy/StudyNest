import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.ts';
import {
  checkClassAccess,
  checkClassModification,
  checkTopicAccess,
  checkTopicModification,
  checkDocumentAccess,
  checkDocumentModification,
} from '../services/authorization.ts';

export interface ResourceAuthRequest extends AuthRequest {
  authorizedResource?: any;
}

/**
 * Middleware to verify class read or write authorization.
 */
export const requireClassPermission = (
  mode: 'read' | 'write' = 'read',
  paramKey: string = 'classId'
) => {
  return async (req: ResourceAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const classId = req.params[paramKey] || req.body?.[paramKey] || (req.query?.[paramKey] as string);
    if (!classId) {
      return res.status(400).json({ error: `Bad Request: Missing ${paramKey} parameter` });
    }

    const result =
      mode === 'write'
        ? await checkClassModification(req.user.id, req.user.role, classId)
        : await checkClassAccess(req.user.id, req.user.role, classId);

    if (!result.allowed) {
      return res.status(result.status).json({ error: result.reason });
    }

    req.authorizedResource = result.resource;
    next();
  };
};

/**
 * Middleware to verify topic read or write authorization.
 */
export const requireTopicPermission = (
  mode: 'read' | 'write' = 'read',
  paramKey: string = 'topicId'
) => {
  return async (req: ResourceAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const topicId = req.params[paramKey] || req.body?.[paramKey] || (req.query?.[paramKey] as string);
    if (!topicId) {
      return res.status(400).json({ error: `Bad Request: Missing ${paramKey} parameter` });
    }

    const result =
      mode === 'write'
        ? await checkTopicModification(req.user.id, req.user.role, topicId)
        : await checkTopicAccess(req.user.id, req.user.role, topicId);

    if (!result.allowed) {
      return res.status(result.status).json({ error: result.reason });
    }

    req.authorizedResource = result.resource;
    next();
  };
};

/**
 * Middleware to verify document read or write authorization.
 */
export const requireDocumentPermission = (
  mode: 'read' | 'write' = 'read',
  paramKey: string = 'documentId'
) => {
  return async (req: ResourceAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const documentId = req.params[paramKey] || req.body?.[paramKey] || (req.query?.[paramKey] as string);
    if (!documentId) {
      return res.status(400).json({ error: `Bad Request: Missing ${paramKey} parameter` });
    }

    const result =
      mode === 'write'
        ? await checkDocumentModification(req.user.id, req.user.role, documentId)
        : await checkDocumentAccess(req.user.id, req.user.role, documentId);

    if (!result.allowed) {
      return res.status(result.status).json({ error: result.reason });
    }

    req.authorizedResource = result.resource;
    next();
  };
};
