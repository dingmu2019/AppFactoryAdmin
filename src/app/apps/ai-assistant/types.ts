
export type Agent = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  system_prompt: string;
};

export type Prompt = {
  id: string;
  label: string;
  content: string;
};

export type Attachment = {
  id: string;
  file?: File;
  preview?: string;
  content?: string;
  type: 'image' | 'text' | 'file';
  url?: string;
  name?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  feedback?: 'like' | 'dislike';
};
