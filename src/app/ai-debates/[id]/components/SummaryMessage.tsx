
import React from 'react';
import { FileText, CheckCircle, Copy, Download } from 'lucide-react';
import { useI18n } from '@/contexts';

interface SummaryMessageProps {
  msg: any;
  debate: any;
  onCopy: (text: string) => void;
  onExport: () => void;
}

const stripInternalMarkers = (text: string) => {
  return (text || '').replace(/<!--\s*share_token:\s*[a-f0-9-]+\s*-->/gi, '').trim();
};

const renderInline = (text: string) => {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    const raw = match[0];
    const inner = raw.startsWith('**') ? raw.slice(2, -2) : raw.slice(2, -2);
    parts.push(
      <strong key={`${start}-${raw.length}`} className="font-bold text-indigo-600 dark:text-indigo-400">
        {inner}
      </strong>
    );
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
};

const renderSummaryAsDiv = (content: string) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: { type: string; lines: string[] }[] = [];
  let i = 0;

  const pushBlock = (type: string, blockLines: string[]) => {
    if (blockLines.length === 0) return;
    blocks.push({ type, lines: blockLines });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      const level = line.startsWith('###') ? 'h3' : line.startsWith('##') ? 'h2' : 'h1';
      pushBlock(level, [line.replace(/^#{1,3}\s+/, '').trim()]);
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) {
      pushBlock('hr', ['']);
      i += 1;
      continue;
    }

    if (/^>\s+/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s+/, ''));
        i += 1;
      }
      pushBlock('blockquote', quoteLines);
      continue;
    }

    if (/^(\-|\*)\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^(\-|\*)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^(\-|\*)\s+/, ''));
        i += 1;
      }
      pushBlock('ul', items);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      pushBlock('ol', items);
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^#{1,3}\s+/.test(lines[i]) && !/^(-{3,}|\*{3,})\s*$/.test(lines[i].trim()) && !/^>\s+/.test(lines[i]) && !/^(\-|\*)\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i += 1;
    }
    pushBlock('p', [paraLines.join(' ').trim()]);
  }

  return (
    <div>
      {blocks.map((b, idx) => {
        if (b.type === 'h1') {
          return (
            <h1 key={idx} className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 pb-3 border-b border-zinc-100 dark:border-zinc-800 tracking-tight">
              {renderInline(b.lines[0])}
            </h1>
          );
        }
        if (b.type === 'h2') {
          return (
            <h2 key={idx} className="text-lg font-bold mt-8 mb-4 flex items-center gap-2 text-zinc-900 dark:text-white">
              {renderInline(b.lines[0])}
            </h2>
          );
        }
        if (b.type === 'h3') {
          return (
            <h3 key={idx} className="text-base font-bold mt-6 mb-3 text-zinc-800 dark:text-zinc-200">
              {renderInline(b.lines[0])}
            </h3>
          );
        }
        if (b.type === 'blockquote') {
          return (
            <blockquote key={idx} className="not-italic bg-zinc-50 dark:bg-zinc-800/30 border-l-4 border-indigo-500 pl-4 py-3 pr-4 rounded-r text-zinc-600 dark:text-zinc-400 my-6 leading-relaxed">
              {b.lines.map((l, li) => (
                <p key={li} className="leading-7 mb-4 last:mb-0">
                  {renderInline(l)}
                </p>
              ))}
            </blockquote>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-2 marker:text-indigo-500 my-4">
              {b.lines.map((l, li) => (
                <li key={li} className="pl-1 leading-7">
                  {renderInline(l)}
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-2 marker:text-indigo-500 my-4">
              {b.lines.map((l, li) => (
                <li key={li} className="pl-1 leading-7">
                  {renderInline(l)}
                </li>
              ))}
            </ol>
          );
        }
        if (b.type === 'hr') {
          return <hr key={idx} className="my-6 border-zinc-100 dark:border-zinc-800" />;
        }
        return (
          <p key={idx} className="leading-7 mb-4 text-zinc-600 dark:text-zinc-300">
            {renderInline(b.lines[0])}
          </p>
        );
      })}
    </div>
  );
};

export const SummaryMessage: React.FC<SummaryMessageProps> = ({
  msg,
  debate,
  onCopy,
  onExport,
}) => {
  const { t } = useI18n();
  const rawContent = debate.summary || msg.content.replace('**Summary Report**', '');
  const summaryContent = stripInternalMarkers(String(rawContent || ''));
  const statusText = debate.status; // Simple fallback

  return (
    <div className="flex justify-center my-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] dark:opacity-[0.05]">
            <FileText size={120} />
          </div>
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <FileText size={20} />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {t('common.ai.debatesPage.detail.summary')}
                </h3>
             </div>
             <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 pl-11">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">
                    <CheckCircle size={12} />
                    {statusText}
                </span>
                <span>•</span>
                <span>{t('common.ai.debatesPage.detail.interactions', { count: Math.max(0, (debate.messages?.length || 0) - 1) })}</span>
                <span>•</span>
                <span>{t('common.ai.debatesPage.detail.durationMinutes', { minutes: Math.ceil(debate.duration_limit || 0) })}</span>
             </div>
          </div>
        </div>
        
        <div className="p-8">
          <div id="debate-summary-markdown" className="text-left [&_*]:text-left">
            {renderSummaryAsDiv(summaryContent)}
          </div>
          
          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
            <button onClick={() => onCopy(summaryContent)} className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium">
              <Copy size={16} /> {t('common.ai.debatesPage.detail.copySummary')}
            </button>
            <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-lg shadow-indigo-500/20 active:scale-95">
              <Download size={16} /> {t('common.ai.assistant.exportPDF')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
