
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';

export const ParameterTable = ({ title, params }: { title: string, params: any[] }) => {
    const { t } = useTranslation();
    return (
        <div>
            <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{title}</h5>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">
                        <tr>
                            <th className="px-4 py-2 font-medium w-1/4">{t('api.table.name')}</th>
                            <th className="px-4 py-2 font-medium w-1/6">{t('api.table.type')}</th>
                            <th className="px-4 py-2 font-medium w-1/6">{t('api.table.required')}</th>
                            <th className="px-4 py-2 font-medium">{t('api.table.description')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {params.map((p: any, idx: number) => (
                            <tr key={idx} className="bg-white dark:bg-zinc-900">
                                <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                                    {p.name}
                                </td>
                                <td className="px-4 py-2 text-zinc-500">
                                    <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono">
                                        {p.type}
                                    </span>
                                </td>
                                <td className="px-4 py-2">
                                    {p.required ? (
                                        <span className="text-rose-500 text-xs font-bold">{t('api.table.yes')}</span>
                                    ) : (
                                        <span className="text-zinc-400 text-xs">{t('api.table.no')}</span>
                                    )}
                                </td>
                                <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                                    {p.description || '-'}
                                    {p.default !== undefined && (
                                        <div className="text-xs text-zinc-400 mt-0.5">Default: <code className="text-zinc-500">{String(p.default)}</code></div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const JsonSchemaViewer = ({ schema }: { schema: any }) => {
    if (!schema) return null;
    
    if (schema.type === 'object' && schema.properties) {
        return (
            <div className="font-mono text-sm">
                <div className="text-zinc-400 mb-2">{'{'}</div>
                <div className="pl-4 space-y-2">
                    {Object.entries(schema.properties).map(([key, prop]: [string, any]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                            <div className="flex items-center gap-2 min-w-[150px]">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">"{key}"</span>
                                <span className="text-zinc-400">:</span>
                                <span className="text-amber-600 dark:text-amber-500 text-xs bg-amber-50 dark:bg-amber-900/20 px-1 rounded">
                                    {prop.type}
                                </span>
                                {schema.required?.includes(key) && (
                                    <span className="text-rose-500 text-[10px] uppercase font-bold" title="Required">*</span>
                                )}
                            </div>
                            <div className="text-zinc-500 dark:text-zinc-400 text-xs flex-1">
                                {prop.description && <span>// {prop.description}</span>}
                                {prop.format && <span className="ml-2 text-zinc-400">({prop.format})</span>}
                                {prop.enum && <span className="ml-2 text-zinc-400">[enum: {prop.enum.join(', ')}]</span>}
                            </div>
                            {prop.type === 'object' && prop.properties && (
                                <div className="w-full mt-1 border-l-2 border-zinc-100 dark:border-zinc-800 pl-3">
                                    <JsonSchemaViewer schema={prop} />
                                </div>
                            )}
                            {prop.type === 'array' && prop.items?.type === 'object' && (
                                <div className="w-full mt-1 border-l-2 border-zinc-100 dark:border-zinc-800 pl-3">
                                    <div className="text-zinc-400 text-xs mb-1">[ Array Items: ]</div>
                                    <JsonSchemaViewer schema={prop.items} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="text-zinc-400 mt-2">{'}'}</div>
            </div>
        );
    }
    
    if (schema.type === 'array' && schema.items) {
        return (
            <div className="font-mono text-sm">
                <span className="text-zinc-400">[ </span>
                <span className="text-amber-600 dark:text-amber-500">{schema.items.type}</span>
                <span className="text-zinc-400"> ]</span>
            </div>
        );
    }

    return <div className="font-mono text-sm text-zinc-500">{JSON.stringify(schema)}</div>;
};

export const SchemaViewer = ({ schema, type }: { schema: any, type: 'request' | 'response' }) => {
  const { t } = useTranslation();
  if (!schema) return <div className="text-xs text-zinc-400 italic">{t('api.empty')}</div>;

  if (type === 'response' && !schema.type && !schema.properties && Object.keys(schema).some(k => !isNaN(Number(k)))) {
      return (
          <div className="space-y-4">
              {Object.entries(schema).map(([code, config]: [string, any]) => (
                  <div key={code} className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                              code.startsWith('2') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              code.startsWith('3') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                              {code}
                          </span>
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{config.description}</span>
                      </div>
                      {config.schema && (
                          <div className="p-4 bg-white dark:bg-zinc-900">
                              <JsonSchemaViewer schema={config.schema} />
                          </div>
                      )}
                  </div>
              ))}
          </div>
      );
  }

  const hasStructuredReq = schema.headers || schema.query || schema.body;
  if (type === 'request' && hasStructuredReq) {
       return (
           <div className="space-y-6">
               {schema.headers && schema.headers.length > 0 && (
                   <ParameterTable title={t('api.table.headers')} params={schema.headers} />
               )}
               {schema.query && schema.query.length > 0 && (
                   <ParameterTable title={t('api.table.query')} params={schema.query} />
               )}
               {schema.body && (
                  <div>
                      <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('api.table.body')}</h5>
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-white dark:bg-zinc-900">
                          <JsonSchemaViewer schema={schema.body} />
                      </div>
                  </div>
              )}
          </div>
      );
  }

  if (type === 'response' && (schema.type || schema.properties)) {
      return (
          <div>
              <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('api.table.response')}</h5>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-white dark:bg-zinc-900">
                  <JsonSchemaViewer schema={schema} />
              </div>
          </div>
      );
  }

  if (schema.markdown) {
      return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{schema.markdown}</ReactMarkdown>
          </div>
      );
  }

  return (
      <pre className="text-xs font-mono text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
          {JSON.stringify(schema, null, 2)}
      </pre>
  );
};
