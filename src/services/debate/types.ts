export interface DebateConfig {
  topic: string;
  mode: 'free_discussion' | 'debate';
  duration: number; // minutes
  entropy: number; // 0.0 - 1.0
  user_id: string;
  app_id?: string;
  enable_environment_awareness?: boolean;
  scroll_mode?: 'auto' | 'manual';
}

export interface AgentProfile {
  name: string;
  role: string;
  stance: string;
  avatar: string;
}

export interface DebateControl {
  status: 'running' | 'stopping' | 'stopped';
  timer?: NodeJS.Timeout;
}
