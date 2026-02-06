import React, { useState, useEffect, useRef, useMemo } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Maximize2, Minimize2, Code, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import CodeBlock from './CodeBlock';

// Initialize mermaid globally once
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  // Don't log errors to console to avoid noise, handle them in catch block
  logLevel: 'error', 
});

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  
  // Use a stable ID for this diagram instance
  const id = useMemo(() => `mermaid-${Math.random().toString(36).substr(2, 9)}`, []);

  useEffect(() => {
    isMounted.current = true;
    
    const renderChart = async () => {
      if (!chart) return;
      
      try {
        // Attempt to parse first to catch syntax errors early (optional, render handles it too)
        // await mermaid.parse(chart);

        // Render SVG
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        
        if (isMounted.current) {
            // Post-process SVG to ensure compatibility with html-to-image
            let processedSvg = renderedSvg;
            if (!processedSvg.includes('xmlns="http://www.w3.org/2000/svg"')) {
                processedSvg = processedSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            
            setSvg(processedSvg);
            setError(null);
        }
      } catch (err: any) {
        console.warn('Mermaid render warning:', err); // Use warn instead of error
        if (isMounted.current) {
            setError('Diagram syntax error or render failure');
            // Fallback to code view on error is often better UX
            // setViewMode('code'); 
        }
      }
    };

    // Small delay to allow UI to settle before heavy rendering
    const timer = setTimeout(renderChart, 100);

    return () => {
        isMounted.current = false;
        clearTimeout(timer);
    };
  }, [chart, id]);

  const handleCopyImage = async () => {
      if (!containerRef.current) return;
      try {
          const isDark = document.documentElement.classList.contains('dark');
          
          // Use html-to-image for better SVG support
          const dataUrl = await toPng(containerRef.current, {
              backgroundColor: isDark ? '#0f172a' : '#ffffff', // Set explicit background
              cacheBust: true,
              style: {
                  transform: 'scale(1)', // Reset any transforms
              }
          });
          
          const blob = await (await fetch(dataUrl)).blob();
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      } catch (e) {
          console.error('Failed to copy image', e);
      }
  };

  if (error) {
      return (
          <div className="flex flex-col gap-2 my-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-mono border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <span className="font-bold">Rendering Error:</span> {error}
            </div>
            <CodeBlock language="mermaid" value={chart} />
          </div>
      );
  }

  return (
    <div className={`relative group my-4 rounded-xl overflow-hidden transition-all ${isExpanded ? 'fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col p-8' : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
        
        {/* Toolbar - Justified layout */}
        <div className={`absolute top-3 left-3 right-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 ${isExpanded ? 'opacity-100' : ''}`}>
            {/* Left Group */}
            <div className="flex gap-2">
                <button
                    onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')}
                    className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-xl hover:scale-110"
                    title={viewMode === 'preview' ? "查看源码" : "预览图表"}
                >
                    {viewMode === 'preview' ? <Code size={16} /> : <ImageIcon size={16} />}
                </button>
                
                {viewMode === 'preview' && (
                    <button
                        onClick={handleCopyImage}
                        className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-xl hover:scale-110"
                        title="复制为图片"
                    >
                        {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                )}
            </div>

            {/* Right Group */}
            <div className="flex gap-2">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-xl hover:scale-110"
                    title={isExpanded ? "收起" : "全屏查看"}
                >
                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
            </div>
        </div>

        {/* Content */}
        <div 
            className={`flex-1 overflow-auto no-scrollbar ${isExpanded ? 'flex items-center justify-center' : ''}`}
            data-mermaid-chart={chart}
        >
            {viewMode === 'preview' ? (
                <div 
                    ref={containerRef}
                    className="mermaid-container flex items-center justify-center p-8 bg-white dark:bg-slate-950 min-h-[120px] w-full"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            ) : (
                <div className="mermaid-code-view">
                    <CodeBlock language="mermaid" value={chart} />
                </div>
            )}
        </div>
        
        <style>{`
            #${id} {
                max-width: 100%;
                height: auto;
                background-color: transparent;
            }
        `}</style>
    </div>
  );
};

export default MermaidDiagram;
