
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import i18n from '@/locales';
// import { toPng } from 'html-to-image';
// import html2canvas from 'html2canvas';

export const handleExportPDFMsg = (msg: any) => {
    try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            throw new Error('Popup blocked');
        }
        
        let content = msg.content;
        try {
            // Attempt to parse JSON content if it exists
            const jsonContent = JSON.parse(msg.content);
            // Prioritize public speech, fallback to other fields or raw content
            content = jsonContent.public_speech || jsonContent.speech || jsonContent.content || msg.content;
        } catch (e) {
            // Content is not JSON, use as is
        }

        const contentHtml = renderToStaticMarkup(
            <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {content}
                </ReactMarkdown>
            </div>
        );
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Message Export</title>
                    <style>
                        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #334155; line-height: 1.6; } 
                        .markdown-body p { margin-bottom: 1em; } 
                        .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 1em; } 
                        .markdown-body code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; } 
                        .markdown-body pre { background: #1e293b; color: #f8fafc; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; } 
                        .markdown-body pre code { background: transparent; padding: 0; color: inherit; } 
                        .markdown-body blockquote { border-left: 4px solid #cbd5e1; padding-left: 1em; color: #64748b; margin: 1em 0; }
                    </style>
                </head>
                <body>
                    ${contentHtml}
                    <script>
                        window.onload = () => { 
                            setTimeout(() => {
                                window.print();
                                // Optional: window.close(); 
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    } catch (err) {
        console.error('PDF Export failed:', err);
        alert(i18n.t('common.ai.debatesPage.detail.printWindowError'));
    }
};

export const handleExportPDFChat = async (debate: any) => {
    // Standard Print-to-PDF approach (Native Browser)
    // This is much lighter and reliable than html2canvas/jspdf for long chats
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const messagesHtml = debate.messages.map((msg: any) => {
        const isSystem = msg.agent_name === 'System';
        const avatar = debate.participants?.find((p: any) => p.name === msg.agent_name)?.avatar || '👤';
        
        let content = msg.content;
        try {
            const jsonContent = JSON.parse(msg.content);
            content = jsonContent.public_speech || jsonContent.speech || jsonContent.content || msg.content;
        } catch (e) {}

        // Always render markdown content
        const contentHtml = renderToStaticMarkup(
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {content}
            </ReactMarkdown>
        );
        return `<div class="message ${isSystem ? 'system' : 'agent'}">${!isSystem ? `<div class="avatar">${avatar}</div><div class="bubble-container"><div class="meta"><span class="name">${msg.agent_name}</span><span class="role">${msg.role}</span></div><div class="bubble">${contentHtml}</div></div>` : `<div class="system-bubble">${contentHtml}</div>`}</div>`;
    }).join('');
    
    printWindow.document.write(`<html><head><title>Debate Log - ${debate.topic}</title><style>body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1e293b; background: #fff; } @media print { @page { margin: 20mm; size: A4; } body { padding: 0; } } h1 { font-size: 24px; margin-bottom: 10px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; } .meta-header { font-size: 14px; color: #64748b; margin-bottom: 30px; } .message { display: flex; margin-bottom: 24px; page-break-inside: avoid; } .message.system { justify-content: center; margin: 30px 0; display: flex; width: 100%; } .avatar { width: 40px; height: 40px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 16px; flex-shrink: 0; border: 1px solid #e2e8f0; } .bubble-container { flex: 1; max-width: 100%; } .meta { margin-bottom: 4px; display: flex; align-items: baseline; gap: 8px; } .name { font-weight: 700; font-size: 14px; color: #334155; } .role { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; } .bubble { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; font-size: 14px; line-height: 1.6; color: #334155; box-shadow: 0 1px 2px rgba(0,0,0,0.05); } .system-bubble { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px 30px; font-size: 14px; color: #475569; text-align: left; display: block; width: 100%; box-sizing: border-box; } .system-bubble h1, .system-bubble h2, .system-bubble h3 { margin-top: 1em; margin-bottom: 0.5em; font-weight: 600; color: #1e293b; } .system-bubble p { margin-bottom: 0.8em; } .bubble p { margin-bottom: 10px; } .bubble p:last-child { margin-bottom: 0; } .bubble ul, .bubble ol { margin-bottom: 10px; padding-left: 20px; } .bubble code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #0f172a; }</style></head><body><h1>${debate.topic}</h1><div class="meta-header">Mode: ${debate.mode} | Generated: ${new Date().toLocaleString()}</div>${messagesHtml}<script>window.onload = () => { window.print(); }</script></body></html>`);
    printWindow.document.close();
};

export const handleExportScreenshot = async (elementId: string, fileName: string) => {
    // Dynamic import for heavy libraries
    try {
        const { toPng } = await import('html-to-image');
        const node = document.getElementById(elementId);
        if (!node) return;

        const dataUrl = await toPng(node);
        const { saveAs } = await import('file-saver');
        saveAs(dataUrl, `${fileName}.png`);
    } catch (error) {
        console.error('Screenshot export failed:', error);
    }
};
