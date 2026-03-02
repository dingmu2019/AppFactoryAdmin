
// import { toPng } from 'html-to-image';
// import html2canvas from 'html2canvas';

export const normalizeCssColor = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (color: string) => {
    const trimmed = (color || '').trim();
    if (!trimmed) return trimmed;
    if (!ctx) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      ctx = canvas.getContext('2d');
    }
    if (!ctx) return trimmed;
    try {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = trimmed;
      return String(ctx.fillStyle);
    } catch {
      return trimmed;
    }
  };
})();

export const replaceOklchInCss = (value: string) => {
  const raw = (value || '').trim();
  if (!raw || !raw.includes('oklch')) return raw;
  return raw.replace(/oklch\([^)]*\)/g, (m) => normalizeCssColor(m));
};

export const sanitizeOklchStyles = (root: Element, doc: Document) => {
  const view = doc.defaultView || window;
  const nodes = [root, ...Array.from(root.querySelectorAll('*'))];
  const props = [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-color',
    'outline-color',
    'text-decoration-color',
    'column-rule-color',
    'caret-color',
    'fill',
    'stroke',
    'stop-color',
    'flood-color',
    'lighting-color',
    'background-image',
    'box-shadow',
    'text-shadow',
  ];

  for (const el of nodes) {
    const style = view.getComputedStyle(el);
    if (!style) continue;

    for (const prop of props) {
      const val = style.getPropertyValue(prop);
      if (!val || !val.includes('oklch')) continue;

      let nextVal = replaceOklchInCss(val);
      if (prop === 'background-image' && nextVal.includes('oklch')) {
        nextVal = 'none';
      }
      (el as HTMLElement).style.setProperty(prop, nextVal);
    }
  }
};

export const downloadPng = (dataUrl: string, filename: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
