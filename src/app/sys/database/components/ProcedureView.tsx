import React from 'react';
import type { ComponentType } from 'react';
import { Terminal, Code2, Play, Info } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import type { ProcedureInfo } from '../types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ProcedureViewProps {
  procedure: ProcedureInfo | null;
  isLoading: boolean;
}

export const ProcedureView: React.FC<ProcedureViewProps> = ({ procedure, isLoading }) => {
  const { t } = useI18n();
  const Highlighter = SyntaxHighlighter as unknown as ComponentType<any>;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400">
        <Terminal size={48} className="mb-4 opacity-20" />
        <p>{t('database.selectProcedureHint')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/20 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                procedure.kind === 'PROCEDURE' 
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' 
                  : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
              }`}>
                {procedure.kind}
              </span>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">{procedure.name}</h2>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {procedure.comment || t('database.noComment')}
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-md">
            <Play size={16} />
            {t('database.runProcedure')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
            <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center shadow-sm">
              <Code2 size={20} className="text-indigo-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{t('database.resultType')}</div>
              <div className="text-sm font-mono text-zinc-700 dark:text-zinc-300">{procedure.result_type}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
            <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-lg flex items-center justify-center shadow-sm">
              <Info size={20} className="text-indigo-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">{t('database.schema')}</div>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{procedure.schema}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Arguments */}
      {procedure.arguments && (
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 uppercase tracking-wider">{t('database.arguments')}</h3>
          <div className="p-3 bg-zinc-900 rounded-lg font-mono text-xs text-indigo-300 overflow-x-auto whitespace-pre">
            {procedure.arguments}
          </div>
        </div>
      )}

      {/* Definition */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 uppercase tracking-wider">{t('database.definition')}</h3>
        <div className="flex-1 bg-[#1e1e1e] rounded-lg overflow-hidden border border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
             <div className="text-[10px] text-zinc-400 font-mono">PL/pgSQL</div>
             <button 
               onClick={() => procedure.definition && navigator.clipboard.writeText(procedure.definition)}
               className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium"
             >
               {t('common.copy')}
             </button>
          </div>
          <div className="flex-1 overflow-auto">
            <Highlighter
              language="sql"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                background: 'transparent'
              }}
              wrapLines={true}
              showLineNumbers={true}
              lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
            >
              {procedure.definition || ''}
            </Highlighter>
          </div>
        </div>
      </div>
    </div>
  );
};
