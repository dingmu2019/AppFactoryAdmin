import { useState, useEffect } from 'react';
import { Webhook, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2, XCircle, Activity, Clock } from 'lucide-react';
import { Button } from "../../../../components/ui/button";
import { authenticatedFetch } from '../../../../lib/http';
import { toast } from "sonner";
// import { useI18n } from '../../../../contexts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { format } from 'date-fns';
import { ConfirmModal } from '@/components/ConfirmModal';

interface WebhookConfigProps {
  t: any;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
}

interface WebhookEvent {
  id: string;
  event_type: string;
  status: number;
  created_at: string;
  next_retry_at: string;
  attempt_count: number;
}

export const WebhookConfig: React.FC<WebhookConfigProps> = ({ t: _t }) => {
    // Ideally we should select an App first, but for Admin view we might list all or default to a system app
    // For now, let's assume we are viewing context of a specific App, or we hardcode a demo App ID
    // In a real scenario, this page would likely be under "App Details" or have an App Selector.
    // Let's use a placeholder App ID or fetch the first available App.
    const [appId, setAppId] = useState<string>(''); 
    const [apps, setApps] = useState<any[]>([]);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [events, setEvents] = useState<WebhookEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch apps to populate selector
        authenticatedFetch('/api/admin/apps').then(res => res.json()).then(data => {
            if (Array.isArray(data) && data.length > 0) {
                setApps(data);
                setAppId(data[0].id);
            }
        }).catch(err => console.error('Failed to fetch apps', err));
    }, []);

    useEffect(() => {
        if (appId) {
            fetchWebhooks();
            fetchEvents();
        } else {
            setWebhooks([]);
            setEvents([]);
        }
    }, [appId]);

    const fetchWebhooks = async () => {
        if (!appId) return;
        const res = await authenticatedFetch(`/api/admin/webhooks?appId=${appId}`);
        if (res.ok) setWebhooks(await res.json());
    };

    const fetchEvents = async () => {
        if (!appId) return;
        const res = await authenticatedFetch(`/api/admin/webhooks/events?appId=${appId}&pageSize=10`);
        if (res.ok) {
            const json = await res.json();
            setEvents(json.data || []);
        }
    };

    const handleCreate = async () => {
        if (!newUrl) return;
        setLoading(true);
        try {
            const res = await authenticatedFetch('/api/admin/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: appId,
                    url: newUrl,
                    events: ['order.paid', 'user.signup'], // Default events
                    is_active: true
                })
            });
            if (res.ok) {
                toast.success(_t('common.createSuccess'));
                setNewUrl('');
                setIsCreating(false);
                fetchWebhooks();
            } else {
                toast.error(_t('common.createFailed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setPendingDeleteId(id);
        setConfirmDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            const res = await authenticatedFetch(`/api/admin/webhooks/${pendingDeleteId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());
            toast.success(_t('common.deleteSuccess'));
            fetchWebhooks();
        } catch (e: any) {
            toast.error(e?.message || _t('common.deleteFailed'));
        } finally {
            setPendingDeleteId(null);
        }
    };

    const handleRetry = async (id: string) => {
        const res = await authenticatedFetch(`/api/admin/webhooks/events/${id}/retry`, { method: 'POST' });
        if (res.ok) {
            toast.success(_t('api.webhook.retryTriggered'));
            fetchEvents();
        }
    };

    return (
        <div className="space-y-6">
            {/* App Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Activity size={18} />
                    </div>
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{_t('api.webhook.selectApp')}</span>
                </div>
                <select 
                    value={appId} 
                    onChange={(e) => setAppId(e.target.value)}
                    className="flex-1 max-w-xs px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                    <option value="" disabled>{_t('api.webhook.selectAppPlaceholder')}</option>
                    {apps.map(app => (
                        <option key={app.id} value={app.id}>{app.name} ({app.id.slice(0, 8)}...)</option>
                    ))}
                </select>
                {!appId && (
                    <span className="text-xs text-rose-500 font-medium animate-pulse flex items-center gap-1">
                        <AlertCircle size={14} />
                        {_t('api.webhook.noAppWarning')}
                    </span>
                )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Configuration Section */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm h-full">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Activity className="h-5 w-5 text-indigo-500" />
                                {_t('api.webhook.endpoints')}
                            </CardTitle>
                            <Button size="sm" variant="outline" onClick={() => setIsCreating(!isCreating)}>
                                <Plus className="h-4 w-4 mr-2" /> {_t('api.webhook.add')}
                            </Button>
                        </div>
                        <CardDescription>{_t('commerce.webhooks.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isCreating && (
                            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">{_t('api.webhook.endpointUrl')}</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="url" 
                                        value={newUrl}
                                        onChange={e => setNewUrl(e.target.value)}
                                        placeholder="https://api.myapp.com/webhooks"
                                        className="flex-1 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <Button onClick={handleCreate} disabled={loading}>{_t('common.save')}</Button>
                                </div>
                            </div>
                        )}

                        {webhooks.length === 0 && !isCreating ? (
                            <div className="text-center py-8 text-zinc-500 text-sm italic">{_t('api.webhook.noWebhooks')}</div>
                        ) : (
                            <div className="space-y-3">
                                {webhooks.map(wh => (
                                    <div key={wh.id} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-sm font-bold text-zinc-700 dark:text-zinc-300 break-all">{wh.url}</div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDelete(wh.id)} className="text-zinc-400 hover:text-rose-500"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${wh.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                                {wh.is_active ? _t('common.active') : _t('common.inactive')}
                                            </div>
                                            <div>{_t('api.webhook.events')}: {wh.events.length}</div>
                                            <div className="font-mono">{_t('api.webhook.secret')}: ••••{wh.secret.slice(-4)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Logs Section */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm h-full flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="h-5 w-5 text-amber-500" />
                                {_t('api.webhook.deliveries')}
                            </CardTitle>
                            <Button size="icon" variant="ghost" onClick={fetchEvents}><RefreshCw className="h-4 w-4" /></Button>
                        </div>
                        <CardDescription>{_t('api.webhook.deliveriesDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
                        <div className="space-y-0">
                            {events.map((evt, idx) => (
                                <div key={evt.id} className={`flex items-center justify-between p-3 ${idx !== events.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''} hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors`}>
                                    <div className="flex items-center gap-3">
                                        {evt.status >= 200 && evt.status < 300 ? (
                                            <CheckCircle2 className="text-emerald-500" size={18} />
                                        ) : evt.status === 0 ? (
                                            <Clock className="text-zinc-400" size={18} />
                                        ) : (
                                            <XCircle className="text-rose-500" size={18} />
                                        )}
                                        <div>
                                            <div className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">{evt.event_type}</div>
                                            <div className="text-[10px] text-zinc-400">{format(new Date(evt.created_at), 'HH:mm:ss')} • {evt.attempt_count} attempts</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            evt.status >= 200 && evt.status < 300 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                                            evt.status === 0 ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' : 
                                            'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                        }`}>
                                            {evt.status === 0 ? 'PENDING' : evt.status}
                                        </span>
                                        {evt.status !== 200 && evt.status !== 0 && (
                                            <button onClick={() => handleRetry(evt.id)} className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">{_t('api.webhook.retry')}</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && (
                                <div className="text-center py-8 text-zinc-400 text-sm">{_t('api.webhook.noEvents')}</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ConfirmModal
                isOpen={confirmDeleteOpen}
                onClose={() => {
                    setConfirmDeleteOpen(false);
                    setPendingDeleteId(null);
                }}
                onConfirm={confirmDelete}
                title={_t('common.confirmDelete')}
                message={_t('common.confirmDeleteMsg')}
                cancelText={_t('common.cancel')}
                confirmText={_t('common.delete')}
            />
        </div>
    );
};
