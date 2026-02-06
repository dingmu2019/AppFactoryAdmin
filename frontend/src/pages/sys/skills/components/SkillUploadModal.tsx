import React, { useState, useRef } from 'react';
import { Upload, X, FileArchive, AlertCircle, Loader2 } from 'lucide-react';
import { useI18n } from '../../../../contexts';
import { supabase } from '../../../../lib/supabase';

interface SkillUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const SkillUploadModal: React.FC<SkillUploadModalProps> = ({ onClose, onSuccess }) => {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.zip')) {
      setError('Only .zip files are allowed');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit');
      return;
    }
    setFile(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/admin/skills/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t('skills.errors.uploadFailed'));
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || t('skills.errors.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('skills.uploadModal.title')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all
              ${isDragging 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                : error
                  ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/10'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }
            `}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".zip" 
              className="hidden" 
              onChange={handleFileChange}
            />
            
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                  <FileArchive size={32} />
                </div>
                <p className="font-medium text-slate-900 dark:text-white mb-1">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-4 text-xs text-rose-500 hover:underline"
                >
                  {t('skills.uploadModal.remove')}
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <p className="font-medium text-slate-900 dark:text-white mb-2">
                  {t('skills.uploadModal.dragDrop')}
                </p>
                <p className="text-sm text-slate-500">
                  {t('skills.uploadModal.fileLimit')}
                </p>
                <p className="text-xs text-slate-400 mt-4">
                  {t('skills.uploadModal.manifestHint')} <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">manifest.json</code>
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {t('skills.uploadModal.cancel')}
          </button>
          <button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('skills.uploadModal.uploading')}
              </>
            ) : (
              t('skills.uploadModal.upload')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
