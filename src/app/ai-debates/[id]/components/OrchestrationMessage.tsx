import React from 'react';
import { BrainCircuit, TrendingUp, AlertTriangle, CheckCircle, Scale } from 'lucide-react';
import { useI18n } from '@/contexts';

interface OrchestrationMessageProps {
  msg: any;
}

export const OrchestrationMessage: React.FC<OrchestrationMessageProps> = ({ msg }) => {
  const { t } = useI18n();
  
  if (!msg.content) return null;
  
  let content: any = {};
  try {
      content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
      if (!content || typeof content !== 'object') return null;
  } catch (e) {
      return null;
  }

  // --- Render Alignment Message ---
  if (content.type === 'alignment') {
      const getStatusColor = (s: string) => {
          if (s === 'Converging' || s === 'Resolved') return 'emerald';
          if (s === 'Diverging') return 'amber';
          return 'zinc';
      };
      const color = getStatusColor(content.status);
      const score = content.score || 50;

      return (
        <div className="flex justify-center w-full my-6 animate-in fade-in zoom-in-95 duration-500">
            <div className={`relative max-w-sm w-full bg-white dark:bg-zinc-900 border border-${color}-200 dark:border-${color}-900/50 rounded-xl p-4 shadow-sm flex flex-col items-center gap-3 overflow-hidden`}>
                <div className={`absolute inset-0 bg-${color}-50/50 dark:bg-${color}-900/10 -z-10`} />
                
                <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-2">
                        <Scale size={16} className={`text-${color}-500`} />
                        <span className={`text-xs font-bold uppercase tracking-wider text-${color}-600 dark:text-${color}-400`}>
                            Consensus Check
                        </span>
                    </div>
                    <span className={`text-xs font-bold text-${color}-600 dark:text-${color}-400`}>{content.status}</span>
                </div>

                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full bg-${color}-500 transition-all duration-1000 ease-out`} 
                        style={{ width: `${score}%` }} 
                    />
                </div>

                <div className={`text-xs text-${color}-700 dark:text-${color}-300 text-center italic`}>
                    "{content.reason}"
                </div>
            </div>
        </div>
      );
  }

  // --- Render Orchestration Message ---
  return (
    <div className="flex justify-center w-full my-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="relative max-w-xl w-full">
        {/* Connection Line */}
        <div className="absolute left-1/2 -top-4 bottom-0 w-px bg-indigo-100 dark:bg-indigo-900/30 -z-10" />
        
        <div className="bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-3 shadow-sm flex gap-3 items-start relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-xl" />
          
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            <BrainCircuit size={14} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                System Decision
              </span>
              <div className="h-px flex-1 bg-indigo-50 dark:bg-indigo-900/30" />
            </div>
            
            <div className="text-xs text-zinc-600 dark:text-zinc-300 font-medium mb-1">
              Selecting <span className="text-indigo-600 dark:text-indigo-400 font-bold">{content.target_speaker}</span>
            </div>
            
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 italic leading-relaxed">
              "{content.reason}"
            </div>

            {content.thought && (
                <div className="mt-2 pt-2 border-t border-indigo-50 dark:border-indigo-900/20 text-[10px] text-zinc-400 font-mono flex gap-2">
                    <span className="shrink-0 opacity-50">Analysis:</span>
                    <span>{content.thought}</span>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

