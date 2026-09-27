/* ==========================================================================
   RMK Autoservice — cinematic interactions
   GSAP + ScrollTrigger + SplitText + Lenis (vendored in assets/vendor)
   ========================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  const intro = $('.intro');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  // Small static bits that don't need GSAP
  const today = new Date();
  $$('[data-today]').forEach((el) => {
    el.textContent = today.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  });
  $$('[data-year]').forEach((el) => { el.textContent = today.getFullYear(); });

  // If the libraries didn't load, leave a clean static page behind.
  if (!window.gsap || !window.ScrollTrigger) {
    intro?.remove();
    initMenu(null);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ------------------------------------------------------------------------
     Smooth scroll
     ------------------------------------------------------------------------ */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

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
      scrollTo(id);
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
  const onScrollDir = (y) => {
    hud.classList.toggle('is-scrolled', y > 40);
    if (menuOpen()) return;
    hud.classList.toggle('is-hidden', y > lastY && y > window.innerHeight * 0.6);
    lastY = y;
  };
  const menuOpen = () => $('.menu-toggle')?.getAttribute('aria-expanded') === 'true';
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
    if (lenis) lenis.scrollTo(0, { duration: 2.4, easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2), onComplete: done });
    else { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(done, 900); }
    history.replaceState(null, '', location.pathname);
  }

  /* ------------------------------------------------------------------------
     Cursor + magnetic buttons (desktop only)
     ------------------------------------------------------------------------ */
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
     Scenes (motion only)
     ------------------------------------------------------------------------ */
  const heroChars = () => {
    const el = $('[data-split]');
    if (!el || !window.SplitText) return [];
    const split = SplitText.create(el, { type: 'words,chars', mask: 'chars' });
    return split.chars;
  };

  const start = () => {
    if (reduceMotion) {
      intro?.remove();
      trackScenes();
      return;
    }

    const chars = heroChars();
    gsap.set(chars, { yPercent: 115 });

    // Hero entrance: focus pull + title rising out of the mask
    const heroIn = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
      .fromTo('.hero__media img', { scale: 1.3, filter: 'blur(16px) brightness(0.35)' }, { scale: 1, filter: 'blur(0px) brightness(1)', duration: 2.6, clearProps: 'filter' }, 0)
      .to(chars, { yPercent: 0, duration: 1.3, stagger: 0.04 }, 0.2)
      .from('.hero__pre', { yPercent: 60, opacity: 0, duration: 1.2 }, 0.35)
      .from(['.hero__slug', '.hero__lead', '.hero__ctas > *', '.hero__scroll'], { y: 18, opacity: 0, duration: 1, stagger: 0.07 }, 0.7)
      .from('.hud > *', { y: -16, opacity: 0, duration: 1, stagger: 0.08 }, 0.6)
      .from('.hud-bottom > *, .viewfinder', { opacity: 0, duration: 1, stagger: 0.08 }, 0.9);

    playIntro(heroIn);
    buildScrollScenes();
    trackScenes();
  };

  function playIntro(heroIn) {
    let seen = false;
    try { seen = sessionStorage.getItem('rmk-intro') === '1'; } catch (e) { /* storage blocked */ }

    if (!intro || seen) {
      intro?.remove();
      heroIn.play(0.15);
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
      .from('.intro__kicker', { yPercent: 40, opacity: 0, filter: 'blur(10px)', duration: 0.8, ease: 'expo.out' }, 1.75)
      .from('.intro__presents', { opacity: 0, y: 10, duration: 0.6, ease: 'expo.out' }, 1.95)
      .to('.intro__title', { opacity: 0, duration: 0.35, ease: 'power2.in' }, 2.75)
      .addLabel('open', 3)
      .to('.intro__half--top', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 'open')
      .to('.intro__half--bottom', { yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, 'open')
      .call(() => heroIn.play(0), null, 'open+=0.35');

    intro.addEventListener('click', () => {
      if (tl.time() < 3) tl.seek('open');
    }, { once: true });
  }

  function buildScrollScenes() {
    const mm = gsap.matchMedia();

    /* Hero exits: bars close in, image drifts, title lifts away */
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__media', { yPercent: 18, scale: 1.08, ease: 'none' }, 0)
      .to('.hero__title', { yPercent: -35, ease: 'none' }, 0)
      .to('.hero__foot', { yPercent: -60, opacity: 0, ease: 'none' }, 0)
      .to('.bars i', { height: '26vh', ease: 'none' }, 0);

    /* Marquee: endless, and scroll velocity pushes it along */
    const loops = $$('.marquee__track').map((track, i) =>
      gsap.fromTo(track, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: i % 2 ? 44 : 36, ease: 'none', repeat: -1 })
    );
    if (lenis) {
      let boost = 0;
      lenis.on('scroll', ({ velocity }) => { boost = gsap.utils.clamp(-8, 8, velocity * 0.18); });
      gsap.ticker.add(() => {
        boost *= 0.92;
        loops.forEach((l) => l.timeScale(1 + Math.abs(boost)));
      });
    }

    /* Story: words light up as they are "read" */
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
    gsap.fromTo('.story__emblem', { rotate: -8, yPercent: 10 }, {
      rotate: 6,
      yPercent: -6,
      ease: 'none',
      scrollTrigger: { trigger: '.story', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.from('.values li', {
      y: 40,
      opacity: 0,
      duration: 1.1,
      stagger: 0.12,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.values', start: 'top 85%' },
    });

    /* Section titles and slug lines */
    $$('.display').forEach((el) => {
      gsap.from(el, {
        yPercent: 40,
        opacity: 0,
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });

    /* Work: pinned horizontal film strip on larger screens */
    mm.add('(min-width: 900px)', () => {
      const track = $('.strip__track');
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      const scroller = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: '.work__pin',
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });

      $$('.frame__pan', track).forEach((pan) => {
        gsap.fromTo(pan, { xPercent: -6 }, {
          xPercent: 6,
          ease: 'none',
          scrollTrigger: { trigger: pan.closest('.frame'), containerAnimation: scroller, start: 'left right', end: 'right left', scrub: true },
        });
      });

      // Frames lean into the direction of travel
      const frames = $$('.frame', track);
      const skewTo = gsap.quickTo(frames, 'skewX', { duration: 0.5, ease: 'power3' });
      const st = scroller.scrollTrigger;
      const tick = () => skewTo(gsap.utils.clamp(-6, 6, st.getVelocity() / -300));
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    });

    mm.add('(max-width: 899px)', () => {
      gsap.from('.frame', {
        x: 60,
        opacity: 0,
        duration: 1.1,
        stagger: 0.08,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.strip', start: 'top 85%' },
      });
    });

    /* Close-up: a letterboxed frame opens to full screen while the lens pushes in */
    gsap.timeline({
      scrollTrigger: { trigger: '.closeup', start: 'top top', end: '+=160%', pin: '.closeup__pin', scrub: 0.6 },
    })
      .fromTo('.closeup__frame', { clipPath: 'inset(32% 24% 32% 24%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo('.closeup__frame img', { scale: 1.02, filter: 'blur(6px)' }, { scale: 1.45, filter: 'blur(0px)', ease: 'power1.inOut', duration: 1 }, 0)
      .fromTo('.focus', { width: '46vw', height: '36vh', opacity: 0.2 }, { width: 150, height: 96, opacity: 1, ease: 'power2.inOut', duration: 0.8 }, 0.1)
      .fromTo('.closeup__title span', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'power3.out', duration: 0.35 }, 0.55)
      .fromTo('.closeup__title em', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'power3.out', duration: 0.35 }, 0.65)
      .fromTo('.closeup__hud > span', { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.05 }, 0.2);

    /* Process: storyboards slide in and sketches draw themselves */
    $$('.board').forEach((board, i) => {
      const paths = $$('.board__sketch path, .board__sketch circle', board);
      paths.forEach((p) => {
        const len = p.getTotalLength ? p.getTotalLength() : 200;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.timeline({ scrollTrigger: { trigger: board, start: 'top 85%' } })
        .from(board, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', delay: (i % 4) * 0.08 })
        .to(paths, { strokeDashoffset: 0, duration: 1.2, stagger: 0.15, ease: 'power2.inOut' }, 0.3);
    });

    /* Action: the clapperboard snaps shut — ACTIE! */
    const stick = $('.clapper__stick--top');
    const clap = () => gsap.timeline()
      .to(stick, { rotate: -22, duration: 0.25, ease: 'power2.out' })
      .to(stick, { rotate: 0, duration: 0.16, ease: 'power4.in' })
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

  // Wait for the fonts so SplitText measures the real glyphs
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(start);
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
