
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '../../../lib/http';
import { useToast, usePageHeader, useI18n } from '../../../contexts';

interface WebhookData {
    id: string;
    url: string;
    events: string[];
    is_active: boolean;
    secret: string;
    created_at: string;
    description?: string;
}

export default function WebhookPage() {
    const { showToast } = useToast();
    const { setPageHeader } = usePageHeader();
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPageHeader(t('commerce.webhooks.title'), t('commerce.webhooks.subtitle'));
    }, [setPageHeader, t]);
    const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [createdSecret, setCreatedSecret] = useState<string | null>(null);
    
    // Form State
    const [formData, setFormData] = useState({
        url: '',
        events: [] as string[],
        description: ''
    });

    const availableEvents = [
        'ORDER.PAID',
        'ORDER.PAYMENT_FAILED',
        'SUBSCRIPTION.UPDATED',
        'SUBSCRIPTION.CANCELED',
        'REFUND.PROCESSED'
    ];

    const fetchWebhooks = async () => {
        setLoading(true);
        try {
            const response = await authenticatedFetch('/api/admin/webhooks', {
                headers: { 'x-app-id': 'AdminSys_app' }
            });
            const res = await response.json();
            if (res.success) {
                setWebhooks(res.data);
            } else {
                showToast(res.error || t('commerce.webhooks.loadError'), 'error');
            }
        } catch (error) {
            showToast(t('commerce.webhooks.loadError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await authenticatedFetch('/api/admin/webhooks', {
                method: 'POST',
                headers: { 'x-app-id': 'AdminSys_app' },
                body: JSON.stringify(formData),
            });
            const res = await response.json();
            if (res.success) {
                showToast(t('commerce.webhooks.success'), 'success');
                setCreatedSecret(res.data.secret);
                fetchWebhooks();
            } else {
                showToast(res.error || t('commerce.webhooks.createError'), 'error');
            }
        } catch (error) {
            showToast(t('commerce.webhooks.createError'), 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('commerce.webhooks.confirmDeleteMsg'))) return;
        
        try {
            const response = await authenticatedFetch(`/api/admin/webhooks/${id}`, { 
                method: 'DELETE',
                headers: { 'x-app-id': 'AdminSys_app' }
            });
            const res = await response.json();
            if (res.success) {
                showToast(t('commerce.webhooks.deleted'), 'success');
                fetchWebhooks();
            } else {
                showToast(res.error || t('commerce.webhooks.deleteError'), 'error');
            }
        } catch (error) {
            showToast(t('commerce.webhooks.deleteError'), 'error');
        }
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setCreatedSecret(null);
        setFormData({ url: '', events: [], description: '' });
    };

    const toggleEvent = (event: string) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(event) 
                ? prev.events.filter(e => e !== event)
                : [...prev.events, event]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchWebhooks}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => setIsModalVisible(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                        <Plus size={16} />
                        {t('commerce.webhooks.add')}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.webhooks.url')}</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.webhooks.events')}</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.webhooks.status')}</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.webhooks.desc')}</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('commerce.webhooks.created')}</th>
                                <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{t('common.delete')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {webhooks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">{t('commerce.webhooks.noWebhooks') || 'No webhooks configured'}</td>
                                </tr>
                            ) : (
                                webhooks.map(webhook => (
                                    <tr key={webhook.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={webhook.url}>
                                            {webhook.url}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {webhook.events.map(e => (
                                                    <span key={e} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                        {e}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                webhook.is_active 
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                            }`}>
                                                {webhook.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                                            {webhook.description || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {new Date(webhook.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => handleDelete(webhook.id)}
                                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {createdSecret ? 'Webhook Created' : 'Add Webhook Endpoint'}
                            </h3>
                            <button onClick={handleModalClose} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        {createdSecret ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <p className="text-emerald-800 font-medium mb-2">✅ {t('common.success')}</p>
                                    <p className="text-sm text-emerald-700 mb-3">
                                        {t('commerce.webhooks.secretCopy')}
                                    </p>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={createdSecret} 
                                            className="flex-1 px-3 py-2 bg-white rounded border border-emerald-300 text-sm font-mono"
                                        />
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(createdSecret);
                                                showToast(t('database.dataView.copied'), 'success');
                                            }}
                                            className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={handleModalClose}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('commerce.webhooks.url')}</label>
                                    <input 
                                        type="url" 
                                        required
                                        placeholder="https://api.example.com/webhooks"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.url}
                                        onChange={e => setFormData({...formData, url: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('commerce.webhooks.events')}</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                        {availableEvents.map(event => (
                                            <label key={event} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.events.includes(event)}
                                                    onChange={() => toggleEvent(event)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{event}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('commerce.webhooks.desc')}</label>
                                    <textarea 
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button 
                                        type="button"
                                        onClick={handleModalClose}
                                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                                    >
                                        {t('commerce.webhooks.add')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
