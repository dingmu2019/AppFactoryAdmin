import { useState } from 'react';
import type { ComponentType } from 'react';
import { Copy, Check, Code, MessageSquarePlus } from 'lucide-react';
import type { SchemaInfo } from '../types';
import { useToast, useI18n } from '../../../../contexts';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SqlScriptViewProps {
  schema: SchemaInfo;
}

export const SqlScriptView = ({ schema }: SqlScriptViewProps) => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const Highlighter = SyntaxHighlighter as unknown as ComponentType<any>;

  const generateSql = () => {
    if (!schema) return '';
    const { table, columns, indexes, foreignKeys } = schema;
    
    let sql = `-- Table: ${table.name}\n`;
    if (table.comment) sql += `-- Description: ${table.comment}\n`;
    sql += `\nCREATE TABLE IF NOT EXISTS public.${table.name} (\n`;
    
    const colDefs = columns.map(col => {
      let def = `    ${col.name} ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      // Note: We don't have default values in our current API, so skipping DEFAULT for now
      return def;
    });

    // Primary Key
    const pks = columns.filter(c => c.is_pk).map(c => c.name);
    if (pks.length > 0) {
      colDefs.push(`    CONSTRAINT ${table.name}_pkey PRIMARY KEY (${pks.join(', ')})`);
    }

    sql += colDefs.join(',\n');
    sql += `\n);\n\n`;

    // Comments
    if (table.comment) {
      sql += `COMMENT ON TABLE public.${table.name} IS '${table.comment.replace(/'/g, "''")}';\n`;
    }
    columns.forEach(col => {
      if (col.comment) {
        sql += `COMMENT ON COLUMN public.${table.name}.${col.name} IS '${col.comment.replace(/'/g, "''")}';\n`;
      }
    });

    // Indexes
    if (indexes.length > 0) {
      sql += `\n-- Indexes\n`;
      indexes.forEach(idx => {
          // Note: pg_get_indexdef returns the full create statement usually
          // But our API returns just the definition part inside brackets? 
          // Actually, let's assume 'definition' is the full 'CREATE INDEX ...' from API for simplicity
          // Wait, our API route used pg_get_indexdef(ix.indexrelid) which returns FULL statement.
          sql += `${idx.definition};\n`;
      });
    }

    // Foreign Keys
    if (foreignKeys.length > 0) {
       sql += `\n-- Foreign Keys\n`;
       foreignKeys.forEach(fk => {
           sql += `ALTER TABLE public.${table.name} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES public.${fk.ref_table}(${fk.ref_column});\n`;
       });
    }

    return sql;
  };

  const generateMissingCommentsSql = () => {
    if (!schema) return '';
    const { table, columns } = schema;
    let sql = `-- Auto-generated missing comments for table: ${table.name}\n`;
    let count = 0;

    if (!table.comment) {
        sql += `COMMENT ON TABLE public.${table.name} IS 'TODO: Add table description';\n`;
        count++;
    }

    columns.forEach(col => {
        if (!col.comment) {
             sql += `COMMENT ON COLUMN public.${table.name}.${col.name} IS 'TODO: Add column description';\n`;
             count++;
        }
    });

    if (count === 0) return '-- All comments are present. Great job!';
    return sql;
  };

  const [showMissingComments, setShowMissingComments] = useState(false);
  const sqlContent = showMissingComments ? generateMissingCommentsSql() : generateSql();

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlContent);
    setCopied(true);
    showToast(t('database.sqlView.copiedMsg'), 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <Code size={20} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                {showMissingComments ? t('database.sqlView.missingCommentsTitle') : t('database.sqlView.title')}
            </h3>
        </div>
        <div className="flex gap-2">
            <button
                onClick={() => setShowMissingComments(!showMissingComments)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium border ${
                    showMissingComments 
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200 dark:border-amber-800' 
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 hover:text-indigo-600 border-zinc-200 dark:border-zinc-700'
                }`}
                title={t('database.sqlView.toggleMissingTitle')}
            >
                <MessageSquarePlus size={16} />
                {showMissingComments ? t('database.sqlView.toggleToFull') : t('database.sqlView.toggleToMissing')}
            </button>
            <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t('database.sqlView.copied') : t('database.sqlView.copy')}
            </button>
        </div>
      </div>

      <div className="flex-1 bg-[#1e1e1e] rounded-lg overflow-hidden border border-zinc-800 shadow-inner relative group font-mono text-sm leading-relaxed">
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <span className="text-xs text-zinc-500 font-mono bg-[#1e1e1e]/80 backdrop-blur px-2 py-1 rounded border border-zinc-700">PostgreSQL</span>
        </div>
        <div className="overflow-auto h-full">
          <Highlighter
            language="sql"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              background: 'transparent'
            }}
            wrapLines={true}
            showLineNumbers={true}
            lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
          >
            {sqlContent}
          </Highlighter>
        </div>
      </div>
    </div>
  );
};
