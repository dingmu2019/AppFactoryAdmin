import React from 'react';
import { CheckCircle } from 'lucide-react';

interface PublicDebateHeaderProps {
  debate: any;
  onExportPDF: () => void;
}

export const PublicDebateHeader: React.FC<PublicDebateHeaderProps> = ({ debate, onExportPDF }) => {
  return (
    <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="font-bold text-zinc-900 dark:text-white truncate max-w-md text-lg">{debate.topic}</h2>
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
            <span className="capitalize">{String(debate.mode || '').replace('_', ' ')}</span>
            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
            <span className="flex items-center gap-1">
              <CheckCircle size={12} className="text-green-500" />
              Completed
            </span>
            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
            <span>{new Date(debate.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onExportPDF}
          className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          Export PDF
        </button>
      </div>
    </div>
  );
};

