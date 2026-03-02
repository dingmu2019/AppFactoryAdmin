import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts';

export const StarryBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars: { x: number; y: number; radius: number; vx: number; vy: number; alpha: number; dAlpha: number }[] = [];
    const numStars = 100;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        alpha: Math.random(),
        dAlpha: (Math.random() - 0.5) * 0.02
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Gradient Background based on theme
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      if (isDark) {
          gradient.addColorStop(0, '#0f172a'); // Slate 900
          gradient.addColorStop(1, '#020617'); // Slate 950
      } else {
          gradient.addColorStop(0, '#f8fafc'); // Slate 50
          gradient.addColorStop(1, '#e2e8f0'); // Slate 200
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw Stars
      stars.forEach(star => {
        star.x += star.vx;
        star.y += star.vy;
        star.alpha += star.dAlpha;

        if (star.alpha <= 0 || star.alpha >= 1) {
          star.dAlpha = -star.dAlpha;
        }

        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;
        if (star.y < 0) star.y = height;
        if (star.y > height) star.y = 0;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDark 
            ? `rgba(255, 255, 255, ${star.alpha})` 
            : `rgba(99, 102, 241, ${star.alpha})`; // Indigo for light mode
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
};
