"use client";

import { useEffect, useRef } from "react";

interface NeuronVisualizerProps {
  analyser: AnalyserNode | null;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.baseSize = Math.random() * 2 + 1;
    this.size = this.baseSize;
  }

  update(width: number, height: number, audioIntensity: number) {
    // Move particle faster on beats
    this.x += this.vx * (1 + audioIntensity * 5);
    this.y += this.vy * (1 + audioIntensity * 5);

    // Bounce off edges
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    // React to audio (more dramatic size changes)
    this.size = this.baseSize + (audioIntensity * 15);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(45, 212, 191, 0.8)"; // Teal color
    ctx.fill();
  }
}

export default function NeuronVisualizer({ analyser }: NeuronVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const numParticles = 80;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    window.addEventListener("resize", resize);
    resize();

    // Setup for audio data
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      
      // Clear canvas with deep dark transparent color matching #3B4252
      ctx.fillStyle = "rgba(59, 66, 82, 0.2)"; // #3B4252 equivalent
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get audio data if available
      let audioIntensity = 0;
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        // Calculate average volume for low frequencies (bass)
        let sum = 0;
        const bassCount = Math.floor(bufferLength / 4); // look at first 25% of frequencies
        for (let i = 0; i < bassCount; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bassCount;
        // Exaggerate beats by squaring the normalized value
        audioIntensity = Math.pow(avg / 255, 2);
      }

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(canvas.width, canvas.height, audioIntensity);
        particles[i].draw(ctx);
        
        // Connect nearby particles (Synapses)
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            const opacity = (1 - distance / 150) * (0.1 + audioIntensity * 0.9);
            // Teal/cyan glow matching the theme instead of purple
            ctx.strokeStyle = `rgba(45, 212, 191, ${opacity})`; 
            ctx.lineWidth = 1 + (audioIntensity * 3);
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyser]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full object-cover z-0"
    />
  );
}
