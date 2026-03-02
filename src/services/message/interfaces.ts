
export interface MessageResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
  rawResponse?: any;
}

export interface SendMessageOptions {
  recipient: string; // Email, Phone Number, or User ID
  subject?: string; // For Email
  content: string;  // Text body or HTML
  templateId?: string; // Template ID if using templates
  templateData?: Record<string, any>; // Variables for template
  attachments?: any[];
}

export interface IMessageAdapter {
  /**
   * Initialize adapter with config
   */
  initialize(config: any): void;

  /**
   * Send a message
   */
  sendMessage(options: SendMessageOptions): Promise<MessageResult>;
}
