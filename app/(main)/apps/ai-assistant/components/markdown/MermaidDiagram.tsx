import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral', // or 'dark' based on context, but 'neutral' works well for both usually or we can detect
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif'
    });

    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render(idRef.current, chart);
        setSvg(svg);
        setError(null);
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError('Failed to render chart');
        // Mermaid might leave error text in DOM, clear it
        const errorElement = document.querySelector(`#${idRef.current}`);
        if (errorElement) errorElement.remove();
      }
    };

    renderChart();
  }, [chart]);

  const handleCopyImage = async () => {
      if (!containerRef.current) return;
      try {
          // Temporarily set background to white for screenshot
          const originalBg = containerRef.current.style.backgroundColor;
          containerRef.current.style.backgroundColor = '#ffffff';
          
          const canvas = await html2canvas(containerRef.current, {
              backgroundColor: '#ffffff',
              scale: 2
          });
          
          containerRef.current.style.backgroundColor = originalBg;

          canvas.toBlob(blob => {
              if (blob) {
                  navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
              }
          });
      } catch (e) {
          console.error('Failed to copy image', e);
      }
  };

  if (error) {
      return (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-lg text-xs font-mono border border-rose-200">
              {error}
              <pre className="mt-2 text-[10px] text-slate-500 overflow-x-auto">{chart}</pre>
          </div>
      );
  }

  return (
    <div className={`relative group my-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all ${isExpanded ? 'fixed inset-4 z-50 shadow-2xl flex flex-col' : ''}`}>
        
        {/* Toolbar */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
                onClick={handleCopyImage}
                className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm"
                title="Copy as Image"
            >
                {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors shadow-sm"
                title={isExpanded ? "Collapse" : "Expand"}
            >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
        </div>

        {/* Chart */}
        <div 
            ref={containerRef}
            className={`mermaid-container flex items-center justify-center p-6 bg-white dark:bg-slate-950 overflow-auto ${isExpanded ? 'flex-1' : ''}`}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
        
        {/* Scoped Style for Dark Mode Compatibility override if needed */}
        <style>{`
            #${idRef.current} {
                max-width: 100%;
                height: auto;
            }
            .dark .mermaid-container svg {
                /* Optional: Invert or adjust colors for dark mode if using neutral theme */
                /* filter: invert(1) hue-rotate(180deg); */ 
            }
        `}</style>
    </div>
  );
};

export default MermaidDiagram;
