
'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '@/lib/http';
import { useToast, usePageHeader, useI18n } from '@/contexts';
import { ConfirmModal } from '@/components/ConfirmModal';

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
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    useEffect(() => {
        setPageHeader(t('commerce.webhooks.title'), t('commerce.webhooks.subtitle'));
    }, [setPageHeader, t]);
    const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
    const [appId, setAppId] = useState<string>('');
    const [apps, setApps] = useState<any[]>([]);
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

    useEffect(() => {
        // Fetch apps
        authenticatedFetch('/api/admin/apps').then(res => res.json()).then(data => {
            if (Array.isArray(data) && data.length > 0) {
                setApps(data);
                setAppId(data[0].id);
            }
        });
    }, []);

    const fetchWebhooks = async () => {
        if (!appId) return;
        setLoading(true);
        try {
            const response = await authenticatedFetch(`/api/admin/webhooks?appId=${appId}`);
            const res = await response.json();
            if (Array.isArray(res)) {
                setWebhooks(res);
            } else {
                showToast(res.error || t('commerce.webhooks.loadError'), 'error');
            }
        } catch (error: any) {
            showToast(`${t('commerce.webhooks.loadError')}: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWebhooks();
    }, [appId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await authenticatedFetch('/api/admin/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, app_id: appId }),
            });
            const res = await response.json();
            if (res.success) {
                showToast(t('commerce.webhooks.success'), 'success');
                setCreatedSecret(res.data.secret);
                fetchWebhooks();
            } else {
                showToast(res.error || t('commerce.webhooks.createError'), 'error');
            }
        } catch (error: any) {
            showToast(`${t('commerce.webhooks.createError')}: ${error.message}`, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        setPendingDeleteId(id);
        setConfirmDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            const response = await authenticatedFetch(`/api/admin/webhooks/${pendingDeleteId}`, { 
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
        } catch (error: any) {
            showToast(`${t('commerce.webhooks.deleteError')}: ${error.message}`, 'error');
        } finally {
            setPendingDeleteId(null);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-zinc-500 uppercase">{t('commerce.webhooks.applicationContext')}</span>
                    <select 
                        value={appId} 
                        onChange={(e) => setAppId(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="" disabled>{t('commerce.webhooks.selectApp')}</option>
                        {apps.map(app => (
                            <option key={app.id} value={app.id}>{app.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchWebhooks}
                        className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
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

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">{t('commerce.webhooks.url')}</th>
                                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">{t('commerce.webhooks.events')}</th>
                                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">{t('commerce.webhooks.status')}</th>
                                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">{t('commerce.webhooks.desc')}</th>
                                <th className="text-left px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">{t('commerce.webhooks.created')}</th>
                                <th className="text-right px-4 py-3 font-semibold text-zinc-700 dark:text-zinc-200">{t('common.delete')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {webhooks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">{t('commerce.webhooks.noWebhooks')}</td>
                                </tr>
                            ) : (
                                webhooks.map(webhook => (
                                    <tr key={webhook.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                                        <td className="px-4 py-3 font-mono text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate" title={webhook.url}>
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
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-[150px] truncate">
                                            {webhook.description || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
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
                    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                                {createdSecret ? t('commerce.webhooks.created') : t('commerce.webhooks.addWebhook')}
                            </h3>
                            <button onClick={handleModalClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
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
                                        className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('commerce.webhooks.url')}</label>
                                    <input 
                                        type="url" 
                                        required
                                        placeholder="https://api.example.com/webhooks"
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.url}
                                        onChange={e => setFormData({...formData, url: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('commerce.webhooks.events')}</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
                                        {availableEvents.map(event => (
                                            <label key={event} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.events.includes(event)}
                                                    onChange={() => toggleEvent(event)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-zinc-700 dark:text-zinc-300">{event}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('commerce.webhooks.desc')}</label>
                                    <textarea 
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button 
                                        type="button"
                                        onClick={handleModalClose}
                                        className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg"
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

            <ConfirmModal
                isOpen={confirmDeleteOpen}
                onClose={() => {
                    setConfirmDeleteOpen(false);
                    setPendingDeleteId(null);
                }}
                onConfirm={confirmDelete}
                title={t('common.confirmDelete')}
                message={t('commerce.webhooks.confirmDeleteMsg')}
                cancelText={t('common.cancel')}
                confirmText={t('common.delete')}
            />
        </div>
    );
}
