
import React from 'react';
import { XCircle, Lock, Unlock, Code2 } from 'lucide-react';
import { SchemaViewer } from './SchemaViewer';
import type { ApiEndpoint } from '../hooks/useApiMgmt';

interface ApiDetailModalProps {
  api: ApiEndpoint;
  onClose: () => void;
  authType: string;
  t: any;
}

export const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    POST: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800',
    PUT: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    DELETE: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    PATCH: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${colors[method] || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
      {method}
    </span>
  );
};

export const ApiDetailModal: React.FC<ApiDetailModalProps> = ({ api, onClose, authType, t }) => {
  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
    >
        <div 
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
        >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-3">
                    <MethodBadge method={api.method} />
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-mono">{api.path}</h3>
                </div>
                <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <XCircle size={24} />
                </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
                <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('api.detail.desc')}</h4>
                    <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">{api.description}</p>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t('api.detail.auth')}</h4>
                    {authType !== 'none' ? (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2 mb-2">
                                <Lock size={16} /> {t('api.detail.authReq')}
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                {t('api.detail.authHeaders')}
                            </p>
                            <ul className="mt-2 space-y-1 text-xs font-mono text-amber-900 dark:text-amber-100">
                                {authType === 'appKey' ? (
                                  <>
                                    <li>x-app-key: &lt;YOUR_APP_KEY&gt;</li>
                                    <li>x-app-secret: &lt;YOUR_APP_SECRET&gt;</li>
                                  </>
                                ) : (
                                  <li>Authorization: Bearer &lt;ACCESS_TOKEN&gt;</li>
                                )}
                            </ul>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-amber-800/30 rounded-lg p-4">
                            <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium flex items-center gap-2">
                                <Unlock size={16} /> {t('api.detail.publicEp')}
                            </p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                                {t('api.detail.publicDesc')}
                            </p>
                        </div>
                    )}
                </div>

                <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Request Parameters</h4>
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                        <SchemaViewer schema={api.requestSchema} type="request" />
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Response Schema</h4>
                    <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                        <SchemaViewer schema={api.responseSchema} type="response" />
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{t('api.detail.example')}</h4>
                    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 overflow-x-auto relative group">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                className="p-1.5 text-zinc-400 hover:text-white bg-white/10 rounded"
                                onClick={() => navigator.clipboard.writeText(`curl -X ${api.method} https://api.super-indie.com${api.path} ...`)}
                            >
                                <Code2 size={14} />
                            </button>
                        </div>
                        <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
{`curl -X ${api.method} https://api.super-indie.com${api.path} \\
${authType === 'appKey' ? '  -H "x-app-key: YOUR_APP_KEY" \\\n  -H "x-app-secret: YOUR_APP_SECRET" \\' : authType === 'bearer' ? '  -H "Authorization: Bearer ACCESS_TOKEN" \\' : ''}
  -H "Content-Type: application/json"`}
                        </pre>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-indigo-500/20"
                >
                    {t('api.detail.close')}
                </button>
            </div>
        </div>
    </div>
  );
};
