import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FlaskConical, Clock, Zap, Play, Search, RefreshCw, Trash2, Microscope, FileJson, TrendingUp } from 'lucide-react';
import { useToast, usePageHeader } from '../../../contexts';
import { supabase } from '../../../lib/supabase';
import { ConfirmModal } from '../../../components/ConfirmModal';

interface LabSession {
  id: string;
  title: string;
  mode: 'architect_blueprint' | 'market_simulation' | 'factory_optimization';
  status: string;
  created_at: string;
  config: any;
}

export default function AILabPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setPageHeader } = usePageHeader();
  
  useEffect(() => {
    setPageHeader('AI 实验室', '深度智能体实验平台 (Hassabis Lab)');
  }, [setPageHeader]);

  const [sessions, setSessions] = useState<LabSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<LabSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMode, setNewMode] = useState<'architect_blueprint' | 'market_simulation' | 'factory_optimization'>('architect_blueprint');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/ai/lab/sessions', {
          headers: {
              'Authorization': `Bearer ${session.access_token}`
          }
      });
      
      // Handle HTML error responses (like 404 or 500 from proxy/server)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
          throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
          if (response.status === 404) {
             setSessions([]);
             setFilteredSessions([]);
             return;
          }
          throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data || []);
      setFilteredSessions(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    let res = sessions;
    if (searchTerm) {
      res = res.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredSessions(res);
  }, [sessions, searchTerm]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDescription.trim()) return;
    setIsCreating(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch('/api/ai/lab/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: newTitle,
                mode: newMode,
                description: newDescription,
                entropy: 0.5
            })
        });

        // Handle HTML error responses
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
            throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
        }

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to create');
        }

        const newSession = await response.json();
        showToast('实验已启动', 'success');
        setShowCreateModal(false);
        // Navigate to detail
        navigate(`/ai-lab/${newSession.id}`);
    } catch (error: any) {
        console.error(error);
        showToast(`创建失败: ${error.message}`, 'error');
    } finally {
        setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    // Delete logic via Supabase directly or API
    // For MVP, assume RLS allows direct delete
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('ai_lab_sessions')
        .delete()
        .eq('id', pendingDeleteId);

      if (error) throw error;
      setSessions(prev => prev.filter(s => s.id !== pendingDeleteId));
      showToast('已删除', 'success');
    } catch (error: any) {
      showToast(error.message || '删除失败', 'error');
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const getModeIcon = (mode: string) => {
      switch (mode) {
          case 'architect_blueprint': return <FileJson size={18} className="text-indigo-500" />;
          case 'market_simulation': return <TrendingUp size={18} className="text-emerald-500" />;
          case 'factory_optimization': return <Zap size={18} className="text-amber-500" />;
          default: return <FlaskConical size={18} className="text-slate-500" />;
      }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
        case 'architect_blueprint': return 'AlphaCode 蓝图';
        case 'market_simulation': return '虚拟市场博弈';
        case 'factory_optimization': return '工厂基因优化';
        default: return mode;
    }
};

  const getModeTip = (mode: string) => {
    switch (mode) {
        case 'architect_blueprint':
            return (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-sm">
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                        <Microscope size={16} /> 最佳实践案例
                    </h4>
                    <p className="text-indigo-900 dark:text-indigo-200 mb-2">
                        <strong>场景：</strong> 设计一个高并发的“秒杀系统”模块。
                    </p>
                    <p className="text-indigo-900 dark:text-indigo-200 mb-2">
                         <strong>目标描述参考：</strong> “请设计一个支持每秒1万并发请求的秒杀系统模块。需要包含 Redis 库存扣减逻辑、防止超卖的数据库锁机制，以及削峰填谷的消息队列设计。请产出完整的数据库表结构和 API 接口定义。”
                    </p>
                    <ul className="list-disc list-inside text-indigo-800 dark:text-indigo-300 space-y-1">
                        <li>AI 将生成包含 Redis 库存扣减、MQ 削峰填谷的完整架构图。</li>
                        <li>自动产出 SQL 建表语句和 OpenAPI 3.0 接口定义。</li>
                        <li>安全审计员 Agent 会自动指出潜在的超卖风险。</li>
                        <li><strong><span className="text-rose-600 dark:text-rose-400">New!</span> 评论家 (Critic)</strong> 会自动审查逻辑漏洞并要求回溯修正。</li>
                    </ul>
                </div>
            );
        case 'market_simulation':
            return (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl text-sm">
                    <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                        <Microscope size={16} /> 最佳实践案例
                    </h4>
                    <p className="text-emerald-900 dark:text-emerald-200 mb-2">
                        <strong>场景：</strong> 模拟“会员订阅费涨价 20%”的用户反馈。
                    </p>
                    <p className="text-emerald-900 dark:text-emerald-200 mb-2">
                        <strong>目标描述参考：</strong> “我们计划下个月将高级会员订阅费从 99元/年 涨价到 120元/年。请模拟用户在社交媒体和社区中的真实反馈，并针对潜在的退订潮提出挽留策略和增长黑客方案。”
                    </p>
                    <ul className="list-disc list-inside text-emerald-800 dark:text-emerald-300 space-y-1">
                        <li>“挑剔用户” Agent 会模拟社交媒体上的负面情绪和退订潮。</li>
                        <li>“增长黑客” Agent 会提出应对策略（如：老用户锁定原价）。</li>
                        <li>最终产出包含风险评估与 GTM 策略的市场报告。</li>
                        <li><strong><span className="text-rose-600 dark:text-rose-400">New!</span> 评论家 (Critic)</strong> 会自动审查市场假设的合理性。</li>
                    </ul>
                </div>
            );
        case 'factory_optimization':
            return (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-sm">
                    <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                        <Microscope size={16} /> 最佳实践案例
                    </h4>
                    <p className="text-amber-900 dark:text-amber-200 mb-2">
                        <strong>场景：</strong> 优化“订单支付回调”的延迟问题。
                    </p>
                    <p className="text-amber-900 dark:text-amber-200 mb-2">
                        <strong>目标描述参考：</strong> “当前支付回调接口（Webhook）在高峰期平均延迟达到 5秒，导致用户无法立即看到订单状态更新。请分析瓶颈，并设计一套基于消息队列的异步处理方案，要求将感知延迟降低到 500ms 以内。”
                    </p>
                    <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 space-y-1">
                        <li>DevOps Agent 会分析当前 webhook 处理流程的瓶颈。</li>
                        <li>产品经理 Agent 会权衡“同步处理”与“异步队列”的用户体验影响。</li>
                        <li>产出优化后的时序图和代码重构建议。</li>
                        <li><strong><span className="text-rose-600 dark:text-rose-400">New!</span> 评论家 (Critic)</strong> 会自动审查技术方案的可行性。</li>
                    </ul>
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">
        <div className="flex flex-wrap items-center gap-3">
            {/* Stat Card */}
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 min-w-[150px]">
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <FlaskConical size={18} />
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">总实验数</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-white leading-none">{sessions.length}</div>
                 </div>
            </div>

            {/* Refresh Button */}
            <button 
                onClick={fetchSessions}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors h-[52px] w-[52px] flex items-center justify-center"
            >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* Create Button */}
            <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 h-[52px] bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
            >
                <Plus size={20} />
                创建新实验
            </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="搜索实验标题..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {isLoading ? (
              <div className="col-span-full py-20 flex justify-center">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
          ) : filteredSessions.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Microscope size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">暂无实验数据</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                      开始您的第一个 AI 深度实验，探索系统架构或市场策略。
                  </p>
                  <button onClick={() => setShowCreateModal(true)} className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                      立即创建
                  </button>
              </div>
          ) : (
              filteredSessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => navigate(`/ai-lab/${session.id}`)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group flex flex-col min-h-[220px]"
                  >
                      <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2 items-center">
                              <span className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                                {getModeIcon(session.mode)}
                              </span>
                              <span className="text-xs font-medium text-slate-500">
                                {getModeLabel(session.mode)}
                              </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(session.id);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors opacity-0 group-hover:opacity-100"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                      </div>
                      
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors h-12">
                          {session.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 h-8">
                        {session.config.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-slate-400" />
                              {new Date(session.created_at).toLocaleDateString()}
                          </div>
                          <div className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              session.status === 'active' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                              {session.status}
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">创建 AI 实验室会话</h3>
                  </div>
                  <div className="p-6 space-y-5 overflow-y-auto flex-1">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">实验标题</label>
                          <input 
                              type="text"
                              value={newTitle}
                              onChange={e => setNewTitle(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="例如：新支付模块架构设计"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">实验模式</label>
                          <div className="grid grid-cols-1 gap-2">
                              <button 
                                onClick={() => setNewMode('architect_blueprint')}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                    newMode === 'architect_blueprint' 
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' 
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                      <FileJson size={20} className="text-indigo-500" />
                                  </div>
                                  <div>
                                      <div className="font-medium text-slate-900 dark:text-white">AlphaCode 蓝图</div>
                                      <div className="text-xs text-slate-500">生成系统架构、API 规范与 SQL 脚本</div>
                                  </div>
                              </button>

                              <button 
                                onClick={() => setNewMode('market_simulation')}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                    newMode === 'market_simulation' 
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' 
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                      <TrendingUp size={20} className="text-emerald-500" />
                                  </div>
                                  <div>
                                      <div className="font-medium text-slate-900 dark:text-white">虚拟市场博弈</div>
                                      <div className="text-xs text-slate-500">模拟用户反馈、推广对抗与增长黑客</div>
                                  </div>
                              </button>
                              
                              <button 
                                onClick={() => setNewMode('factory_optimization')}
                                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                    newMode === 'factory_optimization' 
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500' 
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                      <Zap size={20} className="text-amber-500" />
                                  </div>
                                  <div>
                                      <div className="font-medium text-slate-900 dark:text-white">工厂基因优化</div>
                                      <div className="text-xs text-slate-500">上下文感知的流程复用与运维优化</div>
                                  </div>
                              </button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">实验目标描述</label>
                          <textarea 
                              value={newDescription}
                              onChange={e => setNewDescription(e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 mb-4"
                              placeholder="请详细描述您希望智能体解决的问题或设计的模块..."
                          />
                          
                          {/* Dynamic Tips */}
                          {getModeTip(newMode)}
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
                      <button 
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                          取消
                      </button>
                      <button 
                        onClick={handleCreate}
                        disabled={isCreating || !newTitle.trim() || !newDescription.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-all"
                      >
                          {isCreating ? <span className="animate-spin">⏳</span> : <Play size={16} />}
                          启动实验
                      </button>
                  </div>
              </div>
          </div>
      )}
      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="确认删除"
        message="您确定要删除这个实验会话吗？相关的所有消息和工件也将被删除。"
        confirmText={isDeleting ? "删除中..." : "确认删除"}
        cancelText="取消"
        preventAutoClose={true}
        onConfirm={handleDelete}
        onClose={() => {
          if (!isDeleting) setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
