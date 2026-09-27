/* ==========================================================================
   RMK Autoservice — cinematic interactions
   GSAP + ScrollTrigger + SplitText + Lenis (vendored), CinemaGL, RMKSound
   ========================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  const intro = $('.intro');
  // A click on the opening titles may come before the scripts are ready
  let skipIntro = false;
  intro?.addEventListener('click', () => { skipIntro = true; }, { once: true });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const isNarrow = () => window.innerWidth < 900;
  const HERO_SRC = 'assets/img/hero.webp';

  // Small static bits that don't need GSAP
  const today = new Date();
  $$('[data-today]').forEach((el) => {
    el.textContent = today.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  });
  $$('[data-year]').forEach((el) => { el.textContent = today.getFullYear(); });

  // If the libraries didn't load, leave a clean static page behind.
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('is-motion');
    intro?.remove();
    initMenu(null);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ------------------------------------------------------------------------
     Smooth scroll + a shared, smoothed scroll velocity
     ------------------------------------------------------------------------ */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  let velocity = 0; // px per frame, smoothed
  gsap.ticker.add(() => {
    const v = lenis ? lenis.velocity || 0 : 0;
    velocity += (v - velocity) * 0.14;
    if (Math.abs(velocity) < 0.001) velocity = 0;
    window.RMKSound?.velocity(velocity);
  });

  const scrollTo = (target, opts = {}) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 4), ...opts });
    else {
      const el = typeof target === 'number' ? null : $(target);
      window.scrollTo({ top: el ? el.getBoundingClientRect().top + window.scrollY : target, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2 || !$(id)) return;
      e.preventDefault();
      closeMenu?.();
      if (a.hasAttribute('data-rewind')) return rewind();
      // The hero title only exists at the end of the opening shot
      if (id === '#top') scrollTo(0);
      else scrollTo(id);
      history.replaceState(null, '', id === '#top' ? location.pathname : id);
    });
  });

  /* ------------------------------------------------------------------------
     Menu
     ------------------------------------------------------------------------ */
  let closeMenu = initMenu(lenis);

  function initMenu(lenisRef) {
    const toggle = $('.menu-toggle');
    const menu = $('#menu');
    if (!toggle || !menu) return null;
    const links = $$('a', menu);

    const open = () => {
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      $('.menu-toggle__label', toggle).textContent = 'Sluit';
      lenisRef?.stop();
      if (window.gsap && !reduceMotion) {
        gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'expo.inOut' });
        gsap.fromTo(links, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'expo.out', delay: 0.3 });
      }
      links[0]?.focus({ preventScroll: true });
    };
    const close = () => {
      if (menu.hidden) return;
      toggle.setAttribute('aria-expanded', 'false');
      $('.menu-toggle__label', toggle).textContent = 'Menu';
      lenisRef?.start();
      if (window.gsap && !reduceMotion) {
        gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.6, ease: 'expo.inOut', onComplete: () => { menu.hidden = true; } });
      } else menu.hidden = true;
    };

    toggle.addEventListener('click', () => (menu.hidden ? open() : close()));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) { close(); toggle.focus(); }
    });
    if (!window.gsap) links.forEach((a) => a.addEventListener('click', close));
    return close;
  }

  /* ------------------------------------------------------------------------
     HUD: timecode, progress, scene indicator, hide on scroll
     ------------------------------------------------------------------------ */
  const hud = $('[data-hud]');
  const tcEl = $('[data-tc]');
  const progressEl = $('[data-progress]');
  const sceneNum = $('[data-scene-num]');
  const sceneName = $('[data-scene-name]');
  const FILM_SECONDS = 154; // the whole page plays like a 2.5 minute reel
  const pad = (n) => String(n).padStart(2, '0');
  const setProgress = gsap.quickSetter(progressEl, 'scaleX');

  const writeTimecode = (p) => {
    const t = Math.max(0, p) * FILM_SECONDS;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const f = Math.floor((t % 1) * 24);
    tcEl.textContent = `00:${pad(m)}:${pad(s)}:${pad(f)}`;
  };

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      writeTimecode(self.progress);
      setProgress(self.progress);
    },
  });

  let lastY = 0;
  const menuOpen = () => $('.menu-toggle')?.getAttribute('aria-expanded') === 'true';
  const onScrollDir = (y) => {
    hud.classList.toggle('is-scrolled', y > 40);
    if (menuOpen()) return;
    hud.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 0.6);
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScrollDir(scroll));
  else window.addEventListener('scroll', () => onScrollDir(window.scrollY), { passive: true });
  hud.addEventListener('focusin', () => hud.classList.remove('is-hidden'));

  // Scramble text when the scene changes
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/';
  const scramble = (el, text) => {
    if (!el || el.dataset.value === text) return;
    el.dataset.value = text;
    if (reduceMotion) { el.textContent = text; return; }
    const obj = { p: 0 };
    gsap.to(obj, {
      p: 1,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => {
        const n = Math.floor(obj.p * text.length);
        let out = text.slice(0, n);
        for (let i = n; i < text.length; i++) out += text[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.textContent = out;
      },
    });
  };

  // Created after the pinned scenes so their positions include the pin spacing
  const navLinks = $$('.nav a');
  const trackScenes = () => {
    $$('[data-scene]').forEach((scene) => {
      ScrollTrigger.create({
        trigger: scene,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (!self.isActive) return;
          scramble(sceneNum, `SC ${scene.dataset.scene}`);
          scramble(sceneName, scene.dataset.sceneName);
          const id = scene.id ? `#${scene.id}` : null;
          navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));
        },
      });
    });
  };

  // Rewind: scroll back to the top while the REC label turns into ◀◀ REW
  function rewind() {
    const rec = $('[data-rec]');
    document.body.classList.add('is-rewinding');
    rec.textContent = '◀◀ REW';
    const done = () => {
      document.body.classList.remove('is-rewinding');
      rec.textContent = 'REC';
    };
    if (lenis) lenis.scrollTo(0, { duration: 2.8, easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), onComplete: done });
    else { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(done, 900); }
    history.replaceState(null, '', location.pathname);
  }

  /* ------------------------------------------------------------------------
     Sound toggle (WebAudio, off by default)
     ------------------------------------------------------------------------ */
  const soundBtn = $('.sound-toggle');
  if (soundBtn && window.RMKSound) {
    soundBtn.addEventListener('click', () => {
      const on = window.RMKSound.set(!window.RMKSound.on);
      soundBtn.setAttribute('aria-pressed', String(on));
      $('b', soundBtn).textContent = on ? 'aan' : 'uit';
    });
  } else soundBtn?.remove();

  /* ------------------------------------------------------------------------
     Cursor + magnetic buttons (desktop only)
     ------------------------------------------------------------------------ */
  const pointer = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = e.clientY / window.innerHeight;
  }, { passive: true });

  if (finePointer && !reduceMotion) {
    const cursor = $('.cursor');
    const label = $('.cursor__label');
    root.classList.add('has-cursor');
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
    gsap.set(cursor, { x: window.innerWidth / 2, y: window.innerHeight / 2 });

    window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => gsap.to(cursor, { opacity: 0, duration: 0.2 }));
    document.addEventListener('pointerenter', () => gsap.to(cursor, { opacity: 1, duration: 0.2 }));

    $$('a, button, [data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        const text = el.dataset.cursor;
        if (text) { label.textContent = text; cursor.classList.add('is-label'); }
        else cursor.classList.add('is-hover');
      });
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover', 'is-label'));
    });

    $$('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.3);
        my((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Cameras (WebGL) and sparks
     ------------------------------------------------------------------------ */
  const glOK = !reduceMotion && window.CinemaGL && window.CinemaGL.supported();
  const heroPos = () => (isNarrow() ? [0.64, 0.5] : [0.6, 0.48]);

  const heroCam = glOK ? window.CinemaGL.create($('.hero__gl'), {
    src: HERO_SRC,
    state: { pos: heroPos(), flarePos: [0.635, 0.505], flare: 0.6, zoom: 1.28, blur: 1, aberr: 0.35, reveal: 0 },
  }) : null;

  const closeCam = glOK ? window.CinemaGL.create($('.closeup__gl'), {
    src: HERO_SRC,
    state: { pos: [0.61, 0.51], flarePos: [0.635, 0.505], flare: 0.2, zoom: 1, blur: 0.9, aberr: 0.5 },
  }) : null;

  // Pointer drives a gentle camera pan and the flare's reaction
  gsap.ticker.add(() => {
    const vel = gsap.utils.clamp(-0.6, 0.6, velocity / 70);
    [heroCam, closeCam].forEach((cam) => {
      if (!cam) return;
      const s = cam.state;
      s.vel += (vel - s.vel) * 0.2;
      s.mouse[0] += (pointer.x - s.mouse[0]) * 0.08;
      s.mouse[1] += (pointer.y - s.mouse[1]) * 0.08;
      s.pan[0] += ((pointer.x - 0.5) * -0.014 - s.pan[0]) * 0.05;
      s.pan[1] += ((pointer.y - 0.5) * -0.01 - s.pan[1]) * 0.05;
    });
  });
  window.addEventListener('resize', () => { if (heroCam) heroCam.state.pos = heroPos(); });

  // Welding sparks from the torch in the background of the photo
  function sparks(canvas, emitter) {
    const ctx = canvas.getContext('2d');
    const P = [];
    let W = 1, H = 1, dpr = 1, visible = true, acc = 0, last = performance.now();
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; }).observe(canvas);
    resize();

    const spawn = (x, y, t) => {
      const blue = Math.random() < 0.12;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.25;
      const sp = H * (0.35 + Math.random() * 1.1);
      P.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 0.35 + Math.random() * 1.1, w: 0.6 + Math.random() * 1.4, blue });
    };

    gsap.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      const t = now / 1000;
      const [ex, ey] = emitter();
      const burst = Math.max(0, Math.sin(t * 5.3) * Math.sin(t * 1.9 + 1.2));
      acc += (25 + 260 * burst * burst) * dt;
      while (acc > 1) { acc -= 1; if (P.length < 280) spawn(ex + (Math.random() - 0.5) * 8, ey + (Math.random() - 0.5) * 8, t); }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const g = H * 1.5;
      const mx = pointer.x * window.innerWidth - canvas.getBoundingClientRect().left;
      const my = pointer.y * window.innerHeight - canvas.getBoundingClientRect().top;
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        p.life += dt;
        if (p.life > p.max) { P.splice(i, 1); continue; }
        p.vx *= 0.986;
        p.vy = p.vy * 0.986 + g * dt;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (1 - d2 / 14000) * 2400 * dt; p.vx += dx * f * 0.02; p.vy += dy * f * 0.02; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const heat = 1 - p.life / p.max;
        const a = Math.min(1, heat * 1.6);
        ctx.strokeStyle = p.blue
          ? `rgba(170, 205, 255, ${a})`
          : `rgba(255, ${Math.round(120 + 120 * heat)}, ${Math.round(40 + 150 * heat * heat)}, ${a})`;
        ctx.lineWidth = p.w * (0.6 + heat);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
        ctx.stroke();
      }
    });
  }

  // Where the torch sits on screen (same cover math as the CSS fallback image)
  const torch = [0.772, 0.325];
  const heroStage = $('.hero__stage');
  const torchOnScreen = () => {
    if (heroCam) return heroCam.imageToCanvas(torch[0], torch[1]);
    const W = heroStage.clientWidth, H = heroStage.clientHeight;
    const s = Math.max(W, H); // square image, object-fit: cover
    const [px, py] = heroPos();
    return [torch[0] * s + (W - s) * px, torch[1] * s + (H - s) * py];
  };
  if (!reduceMotion) sparks($('.hero__sparks'), torchOnScreen);

  /* ------------------------------------------------------------------------
     Hero title sequence: the footage plays inside "RMK", scroll dollies in
     ------------------------------------------------------------------------ */
  // Drawn on a 2D canvas: black card, "RMK" punched out with destination-out
  const maskCanvas = $('.hero__mask');
  const mctx = maskCanvas.getContext('2d');
  const mask = { p: 0, ox: 0, oy: 0, W: 1, H: 1, fs: 100, base: 0, dpr: 1, hole: 1, outline: 1 };
  const MAX_ZOOM = 90;

  const applyMask = () => {
    const { W, H, dpr } = mask;
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.globalCompositeOperation = 'source-over';
    mctx.globalAlpha = 1;
    mctx.clearRect(0, 0, W, H);
    if (mask.p >= 0.985) return;
    mctx.fillStyle = '#050506';
    mctx.fillRect(0, 0, W, H);

    const s = Math.pow(MAX_ZOOM, mask.p);
    // dolly in on the chosen stroke while drifting it to the centre of frame
    const drift = Math.min(1, mask.p * 1.4);
    const tx = mask.ox + (W / 2 - mask.ox) * drift;
    const ty = mask.oy + (H / 2 - mask.oy) * drift;
    mctx.save();
    mctx.translate(tx, ty);
    mctx.scale(s, s);
    mctx.translate(-mask.ox, -mask.oy);
    mctx.font = `${mask.fs}px Anton`;
    mctx.textAlign = 'center';
    mctx.globalCompositeOperation = 'destination-out';
    mctx.globalAlpha = mask.hole;
    mctx.fillText('RMK', W / 2, mask.base);
    mctx.globalCompositeOperation = 'source-over';
    mctx.globalAlpha = 0.32 * mask.outline;
    mctx.lineWidth = 1 / s;
    mctx.strokeStyle = '#ece8e1';
    mctx.strokeText('RMK', W / 2, mask.base);
    mctx.restore();
  };

  const layoutMask = () => {
    const W = heroStage.clientWidth, H = heroStage.clientHeight;
    mask.W = W; mask.H = H;
    mask.dpr = Math.min(window.devicePixelRatio || 1, 2);
    maskCanvas.width = Math.round(W * mask.dpr);
    maskCanvas.height = Math.round(H * mask.dpr);

    const c = document.createElement('canvas');
    const x = c.getContext('2d', { willReadFrequently: true });
    x.font = '100px Anton';
    const m = x.measureText('RMK');
    const w100 = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) || 170;
    const cap100 = m.actualBoundingBoxAscent || 88;
    const fs = Math.min((W * (W < 700 ? 0.88 : 0.72)) / (w100 / 100), (H * 0.6) / (cap100 / 100));
    mask.fs = fs;
    mask.base = H / 2 + (cap100 * fs) / 200;

    // Find a solid stroke to fly into: the longest vertical run near the centre
    const k = 0.25;
    const cw = Math.ceil(W * k), ch = Math.ceil(H * k);
    c.width = cw; c.height = ch;
    x.font = `${fs * k}px Anton`;
    x.textAlign = 'center';
    x.fillStyle = '#000';
    x.fillText('RMK', cw / 2, mask.base * k);
    const data = x.getImageData(0, 0, cw, ch).data;
    const capPx = (cap100 * fs * k) / 100;
    const textW = (w100 * fs * k) / 100;
    let best = { score: -Infinity, x: cw / 2, y: ch / 2 };
    for (let px = Math.floor(cw / 2 - textW / 2); px <= cw / 2 + textW / 2; px++) {
      let run = 0, runStart = 0;
      for (let py = 0; py <= ch; py++) {
        const solid = py < ch && data[(py * cw + px) * 4 + 3] > 200;
        if (solid) { if (!run) runStart = py; run++; }
        else if (run) {
          const score = run / capPx - (1.1 * Math.abs(px - cw / 2)) / textW;
          if (score > best.score) best = { score, x: px, y: runStart + run / 2 };
          run = 0;
        }
      }
    }
    mask.ox = best.x / k;
    mask.oy = best.y / k;
    applyMask();
  };

  const heroChars = () => {
    const el = $('[data-split]');
    if (!el || !window.SplitText) return [];
    return SplitText.create(el, { type: 'words,chars', mask: 'chars' }).chars;
  };

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */
  const start = () => {
    if (reduceMotion) {
      intro?.remove();
      trackScenes();
      return;
    }

    layoutMask();
    window.addEventListener('resize', () => { layoutMask(); });
    const chars = heroChars();
    gsap.set(chars, { yPercent: 115 });
    gsap.set(['.hero__pre', '.hero__slug', '.hero__lead', '.hero__ctas > *'], { opacity: 0 });

    // After the curtains: focus pull on the footage inside the letters
    const heroIn = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    if (heroCam) {
      heroIn.to(heroCam.state, { reveal: 1, duration: 1.4, ease: 'power2.out' }, 0)
        .to(heroCam.state, { blur: 0, aberr: 0.06, duration: 2.6 }, 0.1);
    } else {
      heroIn.fromTo('.hero__media img', { filter: 'blur(16px) brightness(0.35)' }, { filter: 'blur(0px) brightness(1)', duration: 2.6, clearProps: 'filter' }, 0);
    }
    mask.hole = 0;
    mask.outline = 0;
    applyMask();
    heroIn.to(mask, { hole: 1, outline: 1, duration: 1.8, ease: 'power2.out', onUpdate: applyMask }, 0)
      .from('.hero__opener > *', { y: 14, opacity: 0, duration: 1.2, stagger: 0.12 }, 0.6)
      .from('.hud > *', { y: -16, opacity: 0, duration: 1, stagger: 0.08 }, 0.6)
      .from('.hud-bottom > *, .viewfinder', { opacity: 0, duration: 1, stagger: 0.08 }, 0.9);

    playIntro(heroIn);
    buildHero(chars);
    buildScrollScenes();
    trackScenes();
    ScrollTrigger.refresh();
  };

  function playIntro(heroIn) {
    let seen = false;
    try { seen = sessionStorage.getItem('rmk-intro') === '1'; } catch (e) { /* storage blocked */ }

    if (!intro || seen) {
      intro?.remove();
      heroIn.play(0);
      return;
    }
    try { sessionStorage.setItem('rmk-intro', '1'); } catch (e) { /* storage blocked */ }

    lenis?.stop();
    window.scrollTo(0, 0);

    const count = $('.intro__count', intro);
    const sweep = $('.intro__sweep', intro);
    const tl = gsap.timeline({
      onComplete: () => {
        intro.remove();
        lenis?.start();
        ScrollTrigger.refresh();
      },
    });

    // Film leader countdown 3 · 2 · 1
    [3, 2, 1].forEach((n, i) => {
      tl.call(() => { count.textContent = n; }, null, i * 0.5)
        .fromTo(sweep, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.5, ease: 'none' }, i * 0.5)
        .fromTo(count, { opacity: 0.4, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.18, ease: 'power2.out' }, i * 0.5);
    });
    tl.to('.intro__leader', { opacity: 0, scale: 1.15, duration: 0.25, ease: 'power2.in' }, 1.5)
      .to('.intro__skip', { opacity: 0, duration: 0.2 }, 1.5)
      .fromTo('.intro__title', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 1.75)
      // Logo blooms in, then the neon ring flickers on
      .fromTo('.intro__logo', { scale: 0.86, opacity: 0, filter: 'blur(14px) brightness(2.2)' }, { scale: 1, opacity: 1, filter: 'blur(0px) brightness(1)', duration: 1.1, ease: 'expo.out' }, 1.75)
      .to('.intro__logo', { keyframes: { opacity: [1, 0.3, 1, 0.55, 1] }, duration: 0.4, ease: 'none' }, 2.1)
      .from('.intro__presents', { opacity: 0, y: 10, duration: 0.6, ease: 'expo.out' }, 2.2)
      .to('.intro__title', { opacity: 0, scale: 1.04, duration: 0.4, ease: 'power2.in' }, 3.1)
      .addLabel('open', 3.35)
      .to('.intro__half--top', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 'open')
      .to('.intro__half--bottom', { yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, 'open')
      .call(() => heroIn.play(0), null, 'open+=0.2');

    const skip = () => { if (tl.time() < tl.labels.open) tl.seek('open'); };
    if (skipIntro) skip();
    else intro.addEventListener('click', skip, { once: true });
  }

  function buildHero(chars) {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * 2.2)}`,
        pin: '.hero__stage',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to(mask, { p: 1, duration: 1, ease: 'power1.in', onUpdate: applyMask }, 0)
      .to('.hero__opener', { opacity: 0, y: -30, duration: 0.2 }, 0)
      .to('.hero__mask', { opacity: 0, duration: 0.08 }, 0.92);

    // Counter-zoom on the footage makes the dolly feel physical
    if (heroCam) tl.to(heroCam.state, { zoom: 1, duration: 1, ease: 'power2.out' }, 0);
    else tl.fromTo('.hero__media img', { scale: 1.28 }, { scale: 1, duration: 1, ease: 'power2.out' }, 0);

    tl.to(chars, { yPercent: 0, stagger: 0.02, duration: 0.35, ease: 'power3.out' }, 1.0)
      .fromTo('.hero__pre', { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.3, ease: 'power3.out' }, 1.05)
      .fromTo(['.hero__slug', '.hero__lead', '.hero__ctas > *'], { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.3, ease: 'power3.out' }, 1.15)
      .to({}, { duration: 0.4 });

    // Once the shot is done, the scene drifts off under closing letterbox bars
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'bottom bottom', end: 'bottom top', scrub: true } })
      .to(['.hero__media', '.hero__sparks'], { yPercent: 22, ease: 'none' }, 0)
      .to('.hero__inner', { yPercent: -16, opacity: 0.15, ease: 'none' }, 0)
      .to('.bars i', { height: '24vh', ease: 'none' }, 0);
  }

  function buildScrollScenes() {
    const mm = gsap.matchMedia();

    /* Endless bands pushed along by scroll velocity; titles lean with speed */
    const loops = [
      ...$$('.marquee__track').map((track, i) =>
        gsap.fromTo(track, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: i % 2 ? 44 : 36, ease: 'none', repeat: -1 })),
      gsap.to('.cta-roll__track', { xPercent: -50, duration: 22, ease: 'none', repeat: -1 }),
    ];
    const skewers = $$('.marquee__row, .display, .cta-roll__track').map((el) => gsap.quickTo(el, 'skewY', { duration: 0.6, ease: 'power3' }));
    gsap.ticker.add(() => {
      const boost = Math.min(8, Math.abs(velocity) * 0.2);
      loops.forEach((l) => l.timeScale(1 + boost));
      const skew = gsap.utils.clamp(-3.5, 3.5, velocity * 0.12);
      skewers.forEach((q) => q(skew));
    });

    /* Section titles rise line by line out of a mask */
    $$('.display').forEach((el) => {
      if (!window.SplitText) return;
      const split = SplitText.create(el, { type: 'lines,words', mask: 'lines' });
      gsap.from(split.words, {
        yPercent: 110,
        rotate: 4,
        duration: 1.3,
        stagger: 0.08,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    /* Establishing shot: the letterbox opens to full frame, the still drifts inside */
    if ($('.band')) {
      gsap.fromTo('.band__frame', { clipPath: () => (isNarrow() ? 'inset(24% 4% 24% 4%)' : 'inset(28% 8% 28% 8%)') }, {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'power2.out',
        scrollTrigger: { trigger: '.band', start: 'top 90%', end: 'top 10%', scrub: 0.6, invalidateOnRefresh: true },
      });
      gsap.fromTo('.band__frame img', { yPercent: -6, scale: 1.12 }, {
        yPercent: 6,
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true },
      });
      gsap.from('.band__hud > span', {
        opacity: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.band', start: 'top 40%' },
      });
    }

    /* Story: words light up as they are "read"; the chrome medal turns */
    const storyText = $('[data-words]');
    if (storyText && window.SplitText) {
      const split = SplitText.create(storyText, { type: 'words' });
      gsap.fromTo(split.words, { opacity: 0.14 }, {
        opacity: 1,
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: { trigger: storyText, start: 'top 82%', end: 'bottom 50%', scrub: true },
      });
    }
    gsap.fromTo('.story__emblem-inner', { rotateY: -32, rotateX: 10, '--shine': '140%' }, {
      rotateY: 26,
      rotateX: -8,
      '--shine': '-40%',
      ease: 'none',
      scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    if (finePointer) {
      const tilt = $('.story__emblem-tilt');
      const rx = gsap.quickTo(tilt, 'rotateX', { duration: 0.8, ease: 'power3' });
      const ry = gsap.quickTo(tilt, 'rotateY', { duration: 0.8, ease: 'power3' });
      $('.story__emblem').addEventListener('pointermove', (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 24);
        rx(((e.clientY - r.top) / r.height - 0.5) * -18);
      });
      $('.story__emblem').addEventListener('pointerleave', () => { rx(0); ry(0); });
    }
    gsap.from('.values li', {
      y: 40,
      opacity: 0,
      duration: 1.1,
      stagger: 0.12,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.values', start: 'top 85%' },
    });

    /* Work: darkroom negatives that develop as they reach the gate */
    const negs = $$('.frame__pan img').map((img) => {
      const neg = img.cloneNode();
      neg.classList.add('is-neg');
      neg.alt = '';
      img.after(neg);
      return neg;
    });
    const takeEl = $('[data-take]');
    const frames = $$('.frame:not(.frame--cta)');

    mm.add('(min-width: 900px)', () => {
      const track = $('.strip__track');
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      const scroller = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: '.work__pin',
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: () => {
            // the take nearest the centre of the gate
            const mid = window.innerWidth / 2;
            let best = 0, bestD = Infinity;
            frames.forEach((f, i) => {
              const r = f.getBoundingClientRect();
              const d = Math.abs(r.left + r.width / 2 - mid);
              if (d < bestD) { bestD = d; best = i; }
            });
            const v = pad(best + 1);
            if (takeEl.textContent !== v) takeEl.textContent = v;
          },
        },
      });
      scroller.to(track, { x: () => -distance() }, 0)
        .to('.work__ghost', { x: () => -distance() * 0.45 }, 0);

      $$('.frame__pan', track).forEach((pan) => {
        gsap.fromTo(pan, { xPercent: -6 }, {
          xPercent: 6,
          ease: 'none',
          scrollTrigger: { trigger: pan.closest('.frame'), containerAnimation: scroller, start: 'left right', end: 'right left', scrub: true },
        });
      });
      negs.forEach((neg) => {
        gsap.fromTo(neg, { opacity: 1 }, {
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: neg.closest('.frame'), containerAnimation: scroller, start: 'left 100%', end: 'center 45%', scrub: true },
        });
      });

      // Frames lean into the direction of travel
      const allFrames = $$('.frame', track);
      const skewTo = gsap.quickTo(allFrames, 'skewX', { duration: 0.5, ease: 'power3' });
      const st = scroller.scrollTrigger;
      const tick = () => skewTo(gsap.utils.clamp(-6, 6, st.getVelocity() / -300));
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    });

    mm.add('(max-width: 899px)', () => {
      const strip = $('.strip');
      gsap.from('.frame', {
        x: 60,
        opacity: 0,
        duration: 1.1,
        stagger: 0.08,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.strip', start: 'top 85%' },
      });
      negs.forEach((neg) => {
        gsap.fromTo(neg, { opacity: 1 }, {
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: neg.closest('.frame'), scroller: strip, horizontal: true, start: 'left 100%', end: 'center 50%', scrub: true },
        });
      });
      // the first take develops as the strip scrolls into view
      gsap.to(negs[0], { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.strip', start: 'top 90%', end: 'top 40%', scrub: true } });
    });

    /* Close-up: words split apart, the frame opens, the lens racks focus and pushes in */
    const cu = { W: 1, H: 1, fw: 1, fh: 1 };
    const measureCu = () => {
      const pin = $('.closeup__pin');
      cu.W = pin.clientWidth;
      cu.H = pin.clientHeight;
      const cs = getComputedStyle(pin);
      const tmp = document.createElement('div');
      tmp.style.cssText = `position:absolute;width:${cs.getPropertyValue('--fw')};height:${cs.getPropertyValue('--fh')}`;
      pin.appendChild(tmp);
      cu.fw = tmp.offsetWidth;
      cu.fh = tmp.offsetHeight;
      tmp.remove();
    };
    measureCu();
    const focusEl = $('[data-focus]');
    const focusDist = { m: 4 };
    const cuTl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.closeup',
        start: 'top top',
        end: '+=230%',
        pin: '.closeup__pin',
        scrub: 0.8,
        invalidateOnRefresh: true,
        onRefreshInit: measureCu,
      },
    });
    cuTl.fromTo('.closeup__frame',
      { clipPath: () => `inset(${(cu.H - cu.fh) / 2}px ${(cu.W - cu.fw) / 2}px ${(cu.H - cu.fh) / 2}px ${(cu.W - cu.fw) / 2}px)` },
      { clipPath: 'inset(0px 0px 0px 0px)', duration: 1, ease: 'power2.inOut' }, 0)
      .to('.closeup__w--l', { x: () => (isNarrow() ? 0 : -cu.W * 0.55), y: () => (isNarrow() ? -cu.H * 0.45 : 0), duration: 0.9, ease: 'power2.in' }, 0)
      .to('.closeup__w--r', { x: () => (isNarrow() ? 0 : cu.W * 0.55), y: () => (isNarrow() ? cu.H * 0.45 : 0), duration: 0.9, ease: 'power2.in' }, 0)
      .fromTo('.focus', { width: () => cu.fw * 0.8, height: () => cu.fh * 0.8, opacity: 0.25 }, { width: 150, height: 96, opacity: 1, duration: 0.8, ease: 'power2.inOut' }, 0.1)
      .fromTo('.closeup__hud > span', { opacity: 0 }, { opacity: 1, duration: 0.15, stagger: 0.04 }, 0.15)
      .to(focusDist, { m: 0.8, duration: 0.7, onUpdate: () => { focusEl.textContent = focusDist.m.toFixed(1); } }, 0)
      .fromTo('.closeup__w--c', { opacity: 0, y: 60, scale: 1.2 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' }, 0.78)
      .to({}, { duration: 0.3 });
    if (closeCam) {
      cuTl.to(closeCam.state, { zoom: 1.75, duration: 1, ease: 'power1.inOut' }, 0)
        .to(closeCam.state, { blur: 0, aberr: 0.06, duration: 0.6, ease: 'power2.out' }, 0)
        .to(closeCam.state, { flare: 1.15, duration: 0.8, ease: 'power2.in' }, 0.2);
    } else {
      cuTl.fromTo('.closeup__frame img', { scale: 1.05, filter: 'blur(6px)' }, { scale: 1.6, filter: 'blur(0px)', duration: 1, ease: 'power1.inOut' }, 0);
    }

    /* Process: storyboard cards stack up; each one sinks as the next arrives */
    const boards = $$('.board');
    boards.forEach((board, i) => {
      const card = $('.board__card', board);
      const paths = $$('.board__sketch path, .board__sketch circle', board);
      paths.forEach((p) => {
        const len = p.getTotalLength ? p.getTotalLength() : 200;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.timeline({ scrollTrigger: { trigger: board, start: 'top 80%' } })
        .from(card, { y: 80, rotateX: -8, opacity: 0, duration: 1.2, ease: 'expo.out', transformPerspective: 1200 })
        .from($$('.board__copy > *', board), { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, 0.2)
        .to(paths, { strokeDashoffset: 0, duration: 1.4, stagger: 0.15, ease: 'power2.inOut' }, 0.3);

      const next = boards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: () => (isNarrow() ? 0.94 : 0.9),
        '--dim': 0.65,
        ease: 'none',
        scrollTrigger: {
          trigger: next,
          start: 'top bottom',
          end: () => `top ${parseFloat(getComputedStyle(next).top) || 0}px`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });

    /* Action: the clapperboard snaps shut — ACTIE! */
    const stick = $('.clapper__stick--top');
    const clap = () => gsap.timeline()
      .to(stick, { rotate: -22, duration: 0.25, ease: 'power2.out' })
      .to(stick, { rotate: 0, duration: 0.16, ease: 'power4.in' })
      .call(() => window.RMKSound?.clap())
      .to('.flash', { opacity: 0.35, duration: 0.04 })
      .to('.flash', { opacity: 0, duration: 0.5, ease: 'power2.out' })
      .fromTo('.clapper', { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }, '<')
      .to(stick, { rotate: -16, duration: 0.9, ease: 'expo.out', delay: 0.6 });

    ScrollTrigger.create({ trigger: '.clapper', start: 'top 70%', once: true, onEnter: clap });
    $('.clapper')?.addEventListener('click', clap);

    gsap.from(['.action__lead', '.action__ctas > *', '.contact > div'], {
      y: 30,
      opacity: 0,
      duration: 1,
      stagger: 0.07,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.action__copy', start: 'top 70%' },
    });

    /* Credits: the roll rises, the wordmark fills up */
    gsap.from('.credits dl > div', {
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.08,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.credits dl', start: 'top 85%' },
    });
    gsap.fromTo('.credits__mark span', { '--fill': '0%' }, {
      '--fill': '100%',
      ease: 'none',
      scrollTrigger: { trigger: '.credits__mark', start: 'top 95%', end: 'bottom bottom', scrub: true },
    });
  }

  // Wait for the fonts so SplitText and the RMK mask measure the real glyphs
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(start);
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
