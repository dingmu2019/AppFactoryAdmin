
import React from 'react';
import { Tooltip } from '../../../../components/Tooltip';
import { AgentAvatar } from '../../../../components/AgentAvatar';
import type { Agent } from '../types';

interface SidebarProps {
  agents: Agent[];
  activeAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ agents, activeAgent, onSelectAgent }) => {
  return (
    <div className="w-44 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-900/20 backdrop-blur-xl flex flex-col py-6 overflow-visible">
      <div className="flex-1 w-full px-3 space-y-2 overflow-y-auto no-scrollbar overflow-x-visible">
        {agents.map(agent => (
          <Tooltip key={agent.id} content={`${agent.name} - ${agent.role}`} side="right">
            <div className="px-1">
              <button
                onClick={() => onSelectAgent(agent)}
                className={`w-full rounded-xl transition-all duration-300 relative group p-2 ${
                  activeAgent?.id === agent.id 
                    ? 'bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-indigo-500/20 text-indigo-600 dark:text-indigo-300' 
                    : 'hover:bg-white/80 dark:hover:bg-zinc-800/50 text-zinc-400 grayscale hover:grayscale-0'
                }`}
              >
                <div className="w-10 h-10 mx-auto flex items-center justify-center">
                  <AgentAvatar name={agent.avatar} size={28} />
                </div>
                <div className={`mt-2 text-xs font-semibold truncate text-center ${
                  activeAgent?.id === agent.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-300'
                }`}>
                  {agent.name}
                </div>
                {activeAgent?.id === agent.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full" />
                )}
              </button>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
