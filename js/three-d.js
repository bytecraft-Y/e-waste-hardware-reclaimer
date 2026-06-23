// E-Waste Hardware Reclaimer - 3D Interactive Elements Engine
// Pure JS/CSS 3D effects — no external libraries

document.addEventListener('DOMContentLoaded', () => {

  // ═══════════════════════════════════════════════════════════════
  // 1. FLOATING CIRCUIT PARTICLE BACKGROUND
  // ═══════════════════════════════════════════════════════════════
  const createParticleCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 0; pointer-events: none; opacity: 0.6;
    `;
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let width, height, particles, connections;
    const PARTICLE_COUNT = 60;
    const CONNECTION_DIST = 140;
    const COLORS = [
      'rgba(6, 182, 212, ',   // cyan
      'rgba(16, 185, 129, ',  // green
      'rgba(59, 130, 246, ',  // blue
      'rgba(168, 85, 247, ',  // purple
    ];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 2 + 0.5;
        this.colorIdx = Math.floor(Math.random() * COLORS.length);
        this.pulse = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.01 + Math.random() * 0.02;
        // Some particles are "nodes" that glow stronger
        this.isNode = Math.random() < 0.2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.pulse += this.pulseSpeed;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
      draw() {
        const alpha = 0.3 + Math.sin(this.pulse) * 0.15;
        const color = COLORS[this.colorIdx];
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = color + alpha + ')';
        ctx.fill();

        if (this.isNode) {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = color + '0.04)';
          ctx.fill();
        }
      }
    }

    const init = () => {
      resize();
      particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            // Draw right-angle circuit traces instead of straight lines
            const midX = particles[i].x;
            const midY = particles[j].y;
            ctx.lineTo(midX, midY);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => { p.update(); p.draw(); });
      drawConnections();
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    init();
    animate();
  };


  // ═══════════════════════════════════════════════════════════════
  // 2. 3D ROTATING PCB CHIP HERO ELEMENT
  // ═══════════════════════════════════════════════════════════════
  const createHeroChip = () => {
    const header = document.querySelector('header');
    if (!header) return;

    const chipContainer = document.createElement('div');
    chipContainer.className = 'hero-chip-3d';
    chipContainer.innerHTML = `
      <div class="chip-scene">
        <div class="chip-cube">
          <div class="chip-face chip-front">
            <div class="chip-die"></div>
            <div class="chip-label">E-WR</div>
          </div>
          <div class="chip-face chip-back">
            <div class="chip-pins-grid"></div>
          </div>
          <div class="chip-face chip-top"></div>
          <div class="chip-face chip-bottom"></div>
          <div class="chip-face chip-left"></div>
          <div class="chip-face chip-right"></div>
        </div>
      </div>
      <div class="chip-ring chip-ring-1"></div>
      <div class="chip-ring chip-ring-2"></div>
      <div class="chip-ring chip-ring-3"></div>
    `;

    header.appendChild(chipContainer);

    // Create the pin grid on the back face
    const pinsGrid = chipContainer.querySelector('.chip-pins-grid');
    for (let i = 0; i < 36; i++) {
      const pin = document.createElement('div');
      pin.className = 'chip-pin';
      pinsGrid.appendChild(pin);
    }

    // Interactive tilt on mouse move over header
    header.addEventListener('mousemove', (e) => {
      const rect = chipContainer.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      const cube = chipContainer.querySelector('.chip-cube');
      cube.style.transform = `rotateY(${dx * 25 + 35}deg) rotateX(${-dy * 25 - 15}deg)`;
    });

    header.addEventListener('mouseleave', () => {
      const cube = chipContainer.querySelector('.chip-cube');
      cube.style.transform = '';
    });
  };


  // ═══════════════════════════════════════════════════════════════
  // 3. PARALLAX TILT ON GLASS PANELS & COMPONENT CARDS
  // ═══════════════════════════════════════════════════════════════
  const initTiltEffect = () => {
    const applyTilt = (el, intensity = 8) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform = `perspective(800px) rotateX(${-y * intensity}deg) rotateY(${x * intensity}deg) scale3d(1.01, 1.01, 1.01)`;
        // Dynamic shine
        el.style.setProperty('--shine-x', `${(x + 0.5) * 100}%`);
        el.style.setProperty('--shine-y', `${(y + 0.5) * 100}%`);
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    };

    // Apply to glass panels
    document.querySelectorAll('.glass-panel').forEach(panel => {
      applyTilt(panel, 4);
    });

    // Apply to stat items with deeper effect
    document.querySelectorAll('.stat-item').forEach(stat => {
      applyTilt(stat, 10);
    });

    // Observe for dynamically added component cards
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mut => {
        mut.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.classList && node.classList.contains('component-card')) {
              applyTilt(node, 12);
            }
            // Also scan children
            node.querySelectorAll && node.querySelectorAll('.component-card').forEach(card => {
              applyTilt(card, 12);
            });
            node.querySelectorAll && node.querySelectorAll('.recipe-card').forEach(card => {
              applyTilt(card, 8);
            });
          }
        });
      });
    });

    const resultsGrid = document.querySelector('.results-grid');
    if (resultsGrid) observer.observe(resultsGrid, { childList: true, subtree: true });

    const recipesGrid = document.getElementById('recipes-grid');
    if (recipesGrid) observer.observe(recipesGrid, { childList: true, subtree: true });
  };


  // ═══════════════════════════════════════════════════════════════
  // 4. 3D FLOATING STAT COUNTERS WITH DEPTH EFFECT
  // ═══════════════════════════════════════════════════════════════
  const initStatDepthEffect = () => {
    document.querySelectorAll('.stat-item').forEach(item => {
      const numEl = item.querySelector('.stat-num');
      const lblEl = item.querySelector('.stat-lbl');
      if (numEl) numEl.style.transform = 'translateZ(30px)';
      if (lblEl) lblEl.style.transform = 'translateZ(15px)';
      item.style.transformStyle = 'preserve-3d';
    });
  };


  // ═══════════════════════════════════════════════════════════════
  // 5. SCROLL-TRIGGERED 3D ENTRANCE ANIMATIONS
  // ═══════════════════════════════════════════════════════════════
  const initScrollAnimations = () => {
    const elements = document.querySelectorAll(
      '.glass-panel, .stat-item, .column-header, #sandbox-section'
    );

    elements.forEach(el => {
      el.classList.add('scroll-3d-hidden');
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger the animations
          setTimeout(() => {
            entry.target.classList.remove('scroll-3d-hidden');
            entry.target.classList.add('scroll-3d-visible');
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    elements.forEach(el => observer.observe(el));
  };


  // ═══════════════════════════════════════════════════════════════
  // 6. GLOWING CURSOR TRAIL EFFECT
  // ═══════════════════════════════════════════════════════════════
  const initCursorGlow = () => {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const animateGlow = () => {
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      glow.style.left = `${glowX}px`;
      glow.style.top = `${glowY}px`;
      requestAnimationFrame(animateGlow);
    };
    animateGlow();
  };


  // ═══════════════════════════════════════════════════════════════
  // BOOT ALL 3D EFFECTS
  // ═══════════════════════════════════════════════════════════════
  createParticleCanvas();
  createHeroChip();
  initTiltEffect();
  initStatDepthEffect();
  initScrollAnimations();
  initCursorGlow();
});
