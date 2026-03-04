
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import i18n from '@/locales';
import { sanitizeOklchStyles, downloadPng } from '@/app/apps/ai-assistant/utils/exportUtils';

/**
 * 统一解析消息内容，支持提取 System2 深度思考 (internal_monologue)
 */
const parseMessageContent = (msgContent: string) => {
    let content = msgContent;
    let internalMonologue = null;
    
    try {
        let jsonStr = msgContent.trim();
        
        // 移除 Markdown 代码块标记
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // 处理可能的中文前缀
        if (jsonStr.includes('内部独白')) {
            jsonStr = jsonStr.replace(/^[•\s]*内部独白\s*/, '');
        }

        const json = JSON.parse(jsonStr);
        // 支持多种 key 格式
        content = json.public_speech || json.speech || json.content || msgContent;
        internalMonologue = json.internal_monologue || json.thought || json.analysis || null;
    } catch (e) {
        // 回退方案：尝试解析旧版 HTML 格式
        if (typeof msgContent === 'string' && msgContent.includes('<details')) {
            const match = msgContent.match(/<details[\s\S]*?<\/summary>([\s\S]*?)<\/details>([\s\S]*)/);
            if (match && match[2]) {
                internalMonologue = match[1].trim();
                content = match[2].trim();
            }
        }
    }
    return { content, internalMonologue };
};

/**
 * 渲染 System2 深度思考的 HTML 片段
 */
const renderSystem2Html = (monologue: string | null) => {
    if (!monologue) return '';
    
    const label = i18n.t('common.ai.assistant.internalMonologue');
    const contentHtml = renderToStaticMarkup(
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {monologue}
        </ReactMarkdown>
    );

    return `
        <div class="system2-thought">
            <span class="system2-label">${label}</span>
            <div class="system2-content">
                ${contentHtml}
            </div>
        </div>
    `;
};

// 共享的 CSS 样式
const SHARED_CSS = `
    body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; background: #fff; max-width: 900px; margin: 0 auto; } 
    .markdown-body p { margin-bottom: 1em; } 
    .markdown-body ul, .markdown-body ol { padding-left: 2em; margin-bottom: 1em; } 
    .markdown-body code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #4f46e5; } 
    .markdown-body pre { background: #0f172a; color: #f8fafc; padding: 1.5em; border-radius: 12px; overflow-x: auto; margin-bottom: 1.5em; font-size: 0.85em; } 
    .markdown-body pre code { background: transparent; padding: 0; color: inherit; } 
    .markdown-body blockquote { border-left: 4px solid #6366f1; padding-left: 1.5em; color: #475569; background: #f8fafc; margin: 1.5em 0; padding-top: 0.5em; padding-bottom: 0.5em; border-radius: 0 8px 8px 0; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #0f172a; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 700; }
    .markdown-body h1 { border-bottom: 2px solid #f1f5f9; padding-bottom: 0.3em; }

    /* System2 深度思考样式 */
    .system2-thought {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #6366f1;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .system2-label {
        font-weight: 800;
        font-size: 11px;
        color: #6366f1;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: block;
        margin-bottom: 8px;
        opacity: 0.8;
    }
    .system2-content {
        font-size: 13px;
        color: #64748b;
        font-style: italic;
        line-height: 1.5;
    }
    .system2-content p { margin-bottom: 0.5em; }
    .system2-content p:last-child { margin-bottom: 0; }

    @media print {
        @page { margin: 20mm; size: A4; }
        body { padding: 0; }
    }
`;

export const handleExportPDFMsg = (msg: any) => {
    try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            throw new Error('Popup blocked');
        }
        
        const { content, internalMonologue } = parseMessageContent(msg.content);
        const system2Html = renderSystem2Html(internalMonologue);

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
                    <title>Exported Message - ${msg.agent_name || 'AI'}</title>
                    <style>${SHARED_CSS}</style>
                </head>
                <body>
                    <div style="margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                        <h2 style="margin: 0; font-size: 18px;">${msg.agent_name || 'AI Assistant'}</h2>
                        <span style="font-size: 12px; color: #94a3b8;">${msg.role || ''} • ${new Date().toLocaleString()}</span>
                    </div>
                    ${system2Html}
                    ${contentHtml}
                    <script>
                        window.onload = () => { 
                            setTimeout(() => {
                                window.print();
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const messagesHtml = debate.messages.map((msg: any) => {
        const isSystem = msg.agent_name === 'System';
        const avatar = debate.participants?.find((p: any) => p.name === msg.agent_name)?.avatar || '👤';
        
        const { content, internalMonologue } = parseMessageContent(msg.content);
        const system2Html = renderSystem2Html(internalMonologue);

        const contentHtml = renderToStaticMarkup(
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {content}
            </ReactMarkdown>
        );

        return `
            <div class="message ${isSystem ? 'system' : 'agent'}">
                ${!isSystem ? `
                    <div class="avatar">${avatar}</div>
                    <div class="bubble-container">
                        <div class="meta">
                            <span class="name">${msg.agent_name}</span>
                            <span class="role">${msg.role}</span>
                        </div>
                        <div class="bubble">
                            ${system2Html}
                            <div class="markdown-body">${contentHtml}</div>
                        </div>
                    </div>
                ` : `
                    <div class="system-bubble">
                        <div class="markdown-body">${contentHtml}</div>
                    </div>
                `}
            </div>
        `;
    }).join('');
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Debate Log - ${debate.topic}</title>
                <style>
                    ${SHARED_CSS}
                    .message { display: flex; margin-bottom: 32px; page-break-inside: avoid; }
                    .message.system { justify-content: center; margin: 40px 0; }
                    .avatar { width: 44px; height: 44px; border-radius: 50%; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-right: 16px; flex-shrink: 0; border: 1px solid #e2e8f0; }
                    .bubble-container { flex: 1; max-width: calc(100% - 60px); }
                    .meta { margin-bottom: 6px; display: flex; align-items: baseline; gap: 10px; }
                    .name { font-weight: 800; font-size: 15px; color: #0f172a; }
                    .role { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
                    .bubble { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                    .system-bubble { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px 40px; font-size: 14px; color: #475569; width: 100%; box-sizing: border-box; }
                </style>
            </head>
            <body>
                <div style="margin-bottom: 40px; border-bottom: 2px solid #0f172a; padding-bottom: 20px;">
                    <h1 style="margin: 0 0 10px 0; font-size: 28px;">${debate.topic}</h1>
                    <div style="display: flex; gap: 20px; font-size: 13px; color: #64748b;">
                        <span>${i18n.t('common.ai.debatesPage.detail.participants')}: ${debate.participants?.length || 0}</span>
                        <span>${new Date(debate.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                ${messagesHtml}
                <script>
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                        }, 800);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
};

export const handleExportScreenshot = async (elementId: string, fileName: string) => {
    try {
        const { toPng } = await import('html-to-image');
        const element = document.getElementById(elementId);
        if (!element) return;

        // Follow AI Assistant logic: find the bubble inside the message item
        // In debates, the message content is usually inside a div with rounded-lg p-5
        const bubble = element.classList.contains('rounded-lg') ? element : element.querySelector('.rounded-lg') as HTMLElement;
        if (!bubble) return;

        const clone = bubble.cloneNode(true) as HTMLElement;
        const msgId = elementId.replace('message-', '');
        clone.setAttribute('data-h2c-root', msgId);
        
        // Setup fixed clone for high quality capture
        clone.style.position = 'fixed';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.width = bubble.offsetWidth + 'px';
        clone.style.zIndex = '-9999';
        clone.style.opacity = '1';
        clone.style.visibility = 'visible';
        clone.style.transform = 'none';
        clone.style.transition = 'none';
        clone.style.borderRadius = '12px';
        clone.style.boxSizing = 'border-box';
        clone.style.padding = '24px';
        clone.style.paddingBottom = '32px';

        const isDark = document.documentElement.classList.contains('dark');
        const bubbleStyle = window.getComputedStyle(bubble);
        const bubbleBg = bubbleStyle.backgroundColor && bubbleStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' 
            ? bubbleStyle.backgroundColor 
            : (isDark ? '#0f172a' : '#ffffff');
        
        clone.style.backgroundColor = bubbleBg;
        clone.style.color = bubbleStyle.color || (isDark ? '#f1f5f9' : '#0f172a');
        
        document.body.appendChild(clone);
        
        // Handle OKLCH colors for Tailwind v4 compatibility
        sanitizeOklchStyles(clone, document);

        // Process Mermaid diagrams if they exist (similar to AI Assistant)
        const originalMermaids = bubble.querySelectorAll('.mermaid-container');
        const clonedMermaids = clone.querySelectorAll('.mermaid-container');
        for (let i = 0; i < originalMermaids.length; i++) {
            const original = originalMermaids[i] as HTMLElement;
            const cloned = clonedMermaids[i] as HTMLElement;
            if (original && cloned) {
                try {
                    const originalStyle = window.getComputedStyle(original);
                    const mermaidBg = originalStyle.backgroundColor && originalStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? originalStyle.backgroundColor : (isDark ? '#0f172a' : '#ffffff');
                    const mermaidDataUrl = await toPng(original, { cacheBust: true, pixelRatio: 2, backgroundColor: mermaidBg, style: { transform: 'none', transition: 'none' } });
                    cloned.innerHTML = `<img src="${mermaidDataUrl}" style="width: 100%; height: auto; display: block; border-radius: 8px;" />`;
                    cloned.style.background = mermaidBg; cloned.style.padding = '0';
                } catch (e) { console.warn('Failed to capture mermaid', e); }
            }
        }

        // Wait for rendering
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

        const width = Math.ceil(clone.scrollWidth);
        const height = Math.ceil(clone.scrollHeight);
        
        const dataUrl = await toPng(clone, { 
            cacheBust: true, 
            pixelRatio: 2, 
            backgroundColor: bubbleBg,
            width,
            height,
            canvasWidth: width,
            canvasHeight: height,
            style: {
                transform: 'none',
                transition: 'none',
                borderRadius: '12px'
            },
            filter: (node) => !(node instanceof HTMLElement && (node.tagName === 'BUTTON' || (node.classList.contains('absolute') && node.classList.contains('-bottom-8'))))
        });
        
        document.body.removeChild(clone);

        // Try to copy to clipboard, fallback to download
        try {
            if (navigator.clipboard && window.isSecureContext) {
                const blob = await (await fetch(dataUrl)).blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                return { success: true, method: 'clipboard' };
            } else {
                downloadPng(dataUrl, `${fileName}.png`);
                return { success: true, method: 'download' };
            }
        } catch (e) {
            downloadPng(dataUrl, `${fileName}.png`);
            return { success: true, method: 'download' };
        }
    } catch (error) {
        console.error('Screenshot export failed:', error);
        throw error;
    }
};
