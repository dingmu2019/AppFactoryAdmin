-- 80_optimize_debate_search.sql
-- 为 agent_debates 表的话题字段添加 GIN 索引，优化 MemoryService 的全文搜索性能

-- 1. 创建基于话题的 GIN 索引 (支持 websearch)
CREATE INDEX IF NOT EXISTS idx_agent_debates_topic_search ON agent_debates USING GIN (to_tsvector('english', topic));

-- 2. (可选) 如果未来支持中文搜索，可以添加针对中文的索引
-- CREATE INDEX IF NOT EXISTS idx_agent_debates_topic_zh_search ON agent_debates USING GIN (to_tsvector('chinese', topic));

-- 3. 添加针对 last_heartbeat_at 的索引，优化心跳检查和清理任务
CREATE INDEX IF NOT EXISTS idx_agent_debates_heartbeat ON agent_debates(last_heartbeat_at);
