import React from 'react';
import { Key, Table as TableIcon, Type } from 'lucide-react';
import type { SchemaInfo } from '../types';
import { useI18n } from '../../../../contexts';

interface SchemaViewProps {
  schema: SchemaInfo;
  isLoading: boolean;
}

export const SchemaView: React.FC<SchemaViewProps> = ({ schema, isLoading }) => {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!schema) return null;

  // Helper function to detect and colorize comments
  const renderComment = (comment: string | null) => {
    if (!comment) return '-';
    // Check if comment contains JSON-like or SQL comment patterns (optional, but requested for green color)
    return (
        <span className="text-slate-400">
            {comment}
        </span>
    );
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <TableIcon size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{schema.table.name}</h1>
                <p className="mt-1">
                    {renderComment(schema.table.comment)}
                </p>
            </div>
        </div>
      </div>

      {/* Columns */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                    <tr>
                        <th className="px-6 py-3">{t('database.fields.name')}</th>
                        <th className="px-6 py-3">{t('database.fields.type')}</th>
                        <th className="px-6 py-3">{t('database.fields.length')}</th>
                        <th className="px-6 py-3">{t('database.fields.nullable')}</th>
                        <th className="px-6 py-3">{t('database.fields.primaryKey')}</th>
                        <th className="px-6 py-3">{t('database.fields.comment')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {schema.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="px-6 py-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                                {col.name}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                                    {col.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                                {col.length || '-'}
                            </td>
                            <td className="px-6 py-4">
                                {col.nullable ? (
                                    <span className="text-slate-400">Yes</span>
                                ) : (
                                    <span className="text-rose-500 font-medium text-xs">No</span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {col.is_pk && <Key size={14} className="text-amber-500" />}
                            </td>
                            <td className="px-6 py-4">
                                {renderComment(col.comment)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Indexes */}
      {schema.indexes.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Type size={20} className="text-slate-400" />
                {t('database.fields.indexes')}
            </h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-3">{t('database.fields.indexName')}</th>
                            <th className="px-6 py-3">{t('database.fields.unique')}</th>
                            <th className="px-6 py-3">{t('database.fields.definition')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {schema.indexes.map((idx, i) => (
                            <tr key={`${idx.name}-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                                    {idx.name}
                                </td>
                                <td className="px-6 py-4">
                                    {idx.is_unique ? (
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-medium">Unique</span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-mono text-xs break-all">
                                    {idx.definition}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>
          </div>
      )}

      {/* Foreign Keys */}
      {schema.foreignKeys.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key size={20} className="text-slate-400 rotate-45" />
                {t('database.fields.foreignKeys')}
            </h3>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-3">{t('database.fields.constraintName')}</th>
                            <th className="px-6 py-3">{t('database.fields.localColumn')}</th>
                            <th className="px-6 py-3">{t('database.fields.refTable')}</th>
                            <th className="px-6 py-3">{t('database.fields.refColumn')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {schema.foreignKeys.map((fk, i) => (
                            <tr key={`${fk.name}-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">
                                    {fk.name}
                                </td>
                                <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">
                                    {fk.column}
                                </td>
                                <td className="px-6 py-4 font-mono">
                                    {fk.ref_table}
                                </td>
                                <td className="px-6 py-4 font-mono text-indigo-600 dark:text-indigo-400">
                                    {fk.ref_column}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};
