import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Play, Mail, Send, X } from 'lucide-react';
import { EmailConfig } from '../../../../../types/integration';
import { useToast } from '../../../../../contexts';

interface Props {
  initialData: Partial<EmailConfig>;
  initialEnabled: boolean;
  onSave: (data: EmailConfig, enabled: boolean) => void;
  onTest: (data: EmailConfig) => void;
  isSaving: boolean;
}

export const EmailConfigForm: React.FC<Props> = ({ initialData, initialEnabled, onSave, onTest, isSaving }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<EmailConfig>>({
    host: 'smtp.example.com',
    port: 587,
    user: '',
    pass: '',
    senderName: 'Admin System',
    secure: false,
    ...initialData
  });
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [showPass, setShowPass] = useState(false);
  
  // Test Email Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email from Admin System');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, ...initialData }));
    setIsEnabled(initialEnabled);
  }, [initialData, initialEnabled]);

  const handleChange = (field: keyof EmailConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendTestEmail = () => {
    if (!testEmail) return showToast('请输入收件人邮箱', 'error');
    setIsSending(true);
    // Mock send
    setTimeout(() => {
        setIsSending(false);
        setShowTestModal(false);
        showToast(`测试邮件已发送至 ${testEmail}`, 'success');
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <Mail className="text-indigo-600" size={24} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">邮件发送配置</h2>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {isEnabled ? '已启用' : '已禁用'}
            </span>
            <button
                onClick={() => setIsEnabled(!isEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                    isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
            </button>
        </div>
      </div>

      <div className="space-y-6 bg-white dark:bg-slate-900 rounded-xl">
        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">SMTP 服务器 (Host)</label>
                <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => handleChange('host', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">端口 (Port)</label>
                <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => handleChange('port', parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">账户 (User)</label>
                <input
                    type="text"
                    value={formData.user}
                    onChange={(e) => handleChange('user', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">密码 (Password)</label>
                <div className="relative">
                    <input
                        type={showPass ? "text" : "password"}
                        value={formData.pass}
                        onChange={(e) => handleChange('pass', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-12"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>
        </div>

        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">发送者名称</label>
            <input
                type="text"
                value={formData.senderName}
                onChange={(e) => handleChange('senderName', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
            <button
                onClick={() => onTest(formData as EmailConfig)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
                <Play size={18} />
                测试连接
            </button>
            <button
                onClick={() => setShowTestModal(true)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2"
            >
                <Send size={18} />
                发送测试邮件
            </button>
            <button
                onClick={() => onSave(formData as EmailConfig, isEnabled)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Save size={18} />
                )}
                保存配置
            </button>
        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">发送测试邮件</h3>
                    <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">收件人</label>
                        <input 
                            type="email" 
                            value={testEmail}
                            onChange={e => setTestEmail(e.target.value)}
                            placeholder="recipient@example.com"
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">主题</label>
                        <input 
                            type="text" 
                            value={testSubject}
                            onChange={e => setTestSubject(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="p-6 pt-0 flex justify-end gap-3">
                    <button onClick={() => setShowTestModal(false)} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">取消</button>
                    <button 
                        onClick={handleSendTestEmail}
                        disabled={isSending}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70 flex items-center gap-2"
                    >
                        {isSending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        发送
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
