import React from 'react';
import { Loader2, AlertCircle, ShieldAlert, Lock, FolderX, RefreshCw, Plus } from 'lucide-react';

interface DataStatusStateProps {
  loading?: boolean;
  loadingMessage?: string;
  error?: string | null;
  statusCode?: number | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  children?: React.ReactNode;
}

export const DataStatusState: React.FC<DataStatusStateProps> = ({
  loading = false,
  loadingMessage = 'Loading data...',
  error = null,
  statusCode = null,
  onRetry,
  isEmpty = false,
  emptyTitle = 'No items found',
  emptyDescription = 'There is no data available for this section yet.',
  emptyActionLabel,
  onEmptyAction,
  children,
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs min-h-[180px]">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-700">{loadingMessage}</p>
        <p className="text-[11px] text-slate-400 mt-1">Connecting to PostgreSQL domain services...</p>
      </div>
    );
  }

  if (error) {
    const is401 = statusCode === 401;
    const is403 = statusCode === 403;
    const is404 = statusCode === 404;

    return (
      <div className={`p-6 rounded-2xl border ${is401 ? 'bg-blue-50/70 border-blue-200 text-blue-900' : is403 ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-rose-50/70 border-rose-200 text-rose-900'} shadow-2xs`}>
        <div className="flex items-start gap-3">
          {is401 ? (
            <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          ) : is403 ? (
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider">
                {is401 ? '401 Authentication Required' : is403 ? '403 Access Forbidden' : is404 ? '404 Not Found' : `Error (${statusCode || 'Network'})`}
              </h4>
            </div>
            <p className="text-xs mt-1 text-slate-700 leading-relaxed font-medium">
              {is401 ? 'Please sign in with Google or select a demo account from the top menu to access this curriculum resource.' : error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Request</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-300 min-h-[180px]">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
          <FolderX className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-800">{emptyTitle}</h4>
        <p className="text-xs text-slate-500 max-w-sm mt-1">{emptyDescription}</p>
        {emptyActionLabel && onEmptyAction && (
          <button
            onClick={onEmptyAction}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{emptyActionLabel}</span>
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
