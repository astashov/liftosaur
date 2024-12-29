/* eslint-disable no-bitwise */

import React, { JSX } from "react";
import { useRef, useEffect } from "react";

const confetti = {
  maxCount: 150,
  speed: 2,
  frameInterval: 15,
  alpha: 1.0,
  gradient: true,
};

interface IParticle {
  color: string;
  color2: string;
  x: number;
  y: number;
  diameter: number;
  tilt: number;
  tiltAngleIncrement: number;
  tiltAngle: number;
}

export function Confetti(): JSX.Element {
  const runnerRef = useRef<ConfettiRunner | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const runner = new ConfettiRunner(canvasRef.current!.getContext("2d")!);
    runnerRef.current = runner;
    runner.start(2000, 100, 150);
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 z-20 w-full h-full pointer-events-none" />;
}

class ConfettiRunner {
  private readonly colors: string[] = [
    "rgba(30,144,255,",
    "rgba(107,142,35,",
    "rgba(255,215,0,",
    "rgba(255,192,203,",
    "rgba(106,90,205,",
    "rgba(173,216,230,",
    "rgba(238,130,238,",
    "rgba(152,251,152,",
    "rgba(70,130,180,",
    "rgba(244,164,96,",
    "rgba(210,105,30,",
    "rgba(220,20,60,",
  ];
  private streamingConfetti: boolean = false;
  private pause: boolean = false;
  private lastFrameTime: number = Date.now();
  private particles: IParticle[] = [];
  private waveAngle: number = 0;
  private context: CanvasRenderingContext2D;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  private createParticle(width: number, height: number): IParticle {
    return {
      color: this.colors[(Math.random() * this.colors.length) | 0] + (confetti.alpha.toString() + ")"),
      color2: this.colors[(Math.random() * this.colors.length) | 0] + (confetti.alpha.toString() + ")"),
      x: Math.random() * width,
      y: Math.random() * height - height,
      diameter: Math.random() * 10 + 5,
      tilt: Math.random() * 10 - 10,
      tiltAngleIncrement: Math.random() * 0.07 + 0.05,
      tiltAngle: Math.random() * Math.PI,
    };
  }

  private runAnimation(): void {
    if (this.pause) {
      return;
    } else if (this.particles.length === 0) {
      this.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    } else {
      const now = Date.now();
      const delta = now - this.lastFrameTime;
      if (delta > confetti.frameInterval) {
        this.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.updateParticles();
        this.drawParticles();
        this.lastFrameTime = now - (delta % confetti.frameInterval);
      }
      window.requestAnimationFrame(() => this.runAnimation());
    }
  }

  public start(timeout: number, min: number, max: number): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    let count = confetti.maxCount;
    if (min) {
      if (max) {
        if (min === max) {
          count = this.particles.length + max;
        } else {
          if (min > max) {
            const temp = min;
            min = max;
            max = temp;
          }
          count = this.particles.length + ((Math.random() * (max - min) + min) | 0);
        }
      } else {
        count = this.particles.length + min;
      }
    } else if (max) {
      count = this.particles.length + max;
    }
    while (this.particles.length < count) {
      this.particles.push(this.createParticle(width, height));
    }
    this.streamingConfetti = true;
    this.pause = false;
    this.runAnimation();
    if (timeout) {
      window.setTimeout(() => this.stop(), timeout);
    }
  }

  public stop(): void {
    this.streamingConfetti = false;
  }

  public clear(): void {
    stop();
    this.pause = false;
    this.particles = [];
  }

  private drawParticles(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      this.context.beginPath();
      this.context.lineWidth = particle.diameter;
      const x2 = particle.x + particle.tilt;
      const x = x2 + particle.diameter / 2;
      const y2 = particle.y + (particle.tilt + particle.diameter / 2) / 3;
      if (confetti.gradient) {
        const gradient = this.context.createLinearGradient(x, particle.y, x2, y2);
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1.0, particle.color2);
        this.context.strokeStyle = gradient;
      } else {
        this.context.strokeStyle = particle.color;
      }
      this.context.moveTo(x, particle.y);
      this.context.lineTo(x2, y2);
      this.context.stroke();
    }
  }

  private updateParticles(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.waveAngle += 0.01;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (!this.streamingConfetti && particle.y < -15) {
        particle.y = height + 100;
      } else {
        particle.tiltAngle += particle.tiltAngleIncrement;
        particle.x += Math.sin(this.waveAngle) - 0.5;
        particle.y += (Math.cos(this.waveAngle) + particle.diameter + confetti.speed) * 0.5;
        particle.tilt = Math.sin(particle.tiltAngle) * 15;
      }
      if (particle.x > width + 20 || particle.x < -20 || particle.y > height) {
        if (this.streamingConfetti && this.particles.length <= confetti.maxCount) {
          this.particles[i] = this.createParticle(width, height);
        } else {
          this.particles.splice(i, 1);
          i = i - 1;
        }
      }
    }
  }
}
