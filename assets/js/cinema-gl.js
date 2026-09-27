/* ==========================================================================
   CinemaGL — a tiny WebGL "camera" for one image.
   Focus pull (disc blur), chromatic aberration, scroll-velocity bend,
   anamorphic headlight flare with lens ghosts, split-tone grade, vignette.
   No dependencies. One shared render loop, paused when off-screen.
   ========================================================================== */
(() => {
  const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // y down, like the DOM
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  const FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform vec2 uRes, uImg, uPos, uPan, uMouse, uFlarePos;
    uniform float uZoom, uBlur, uAberr, uVel, uTime, uFlare, uExposure, uGray, uReveal;

    vec2 win() {
      float rs = uRes.x / uRes.y;
      float ri = uImg.x / uImg.y;
      vec2 w = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
      return w / uZoom;
    }
    // object-fit: cover + object-position (zoom anchored on uPos)
    vec2 toImg(vec2 uv) { vec2 w = win(); return uv * w + (1.0 - w) * uPos + uPan; }
    vec2 toScreen(vec2 p) { vec2 w = win(); return (p - (1.0 - w) * uPos - uPan) / w; }

    vec3 sampleRGB(vec2 uv) {
      vec2 dir = uv - 0.5;
      float a = uAberr * 0.014 + abs(uVel) * 0.012;
      float r = texture2D(uTex, toImg(uv + dir * a)).r;
      float g = texture2D(uTex, toImg(uv)).g;
      float b = texture2D(uTex, toImg(uv - dir * a)).b;
      return vec3(r, g, b);
    }

    void main() {
      vec2 uv = vUv;
      uv.y += sin(uv.x * 3.14159) * uVel * 0.035; // film bends with scroll speed
      float asp = uRes.x / uRes.y;

      vec3 col;
      if (uBlur > 0.002) {
        col = vec3(0.0);
        for (int i = 0; i < 16; i++) {
          float fi = float(i);
          float ang = fi * 2.39996;
          float rad = sqrt((fi + 0.5) / 16.0);
          vec2 off = vec2(cos(ang) / asp, sin(ang)) * rad * uBlur * 0.022;
          col += sampleRGB(uv + off);
        }
        col /= 16.0;
      } else {
        col = sampleRGB(uv);
      }

      // Grade: exposure, desaturation, split-tone, gentle S-curve
      col *= uExposure;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(l), uGray);
      col += vec3(-0.012, 0.0, 0.018) * (1.0 - l) + vec3(0.018, 0.008, -0.012) * l;
      col = clamp(col, 0.0, 1.0);
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);

      // Anamorphic flare on the headlight
      if (uFlare > 0.001) {
        vec2 f = toScreen(uFlarePos);
        vec2 d = vUv - f; d.x *= asp;
        float flick = 0.92 + 0.08 * sin(uTime * 9.0) * sin(uTime * 2.3);
        float streak = exp(-abs(d.y) * 110.0) * exp(-abs(d.x) * 1.3);
        float core = exp(-length(d) * 16.0);
        float halo = exp(-length(d) * 4.5) * 0.22;
        vec3 fl = vec3(0.32, 0.6, 1.0) * streak * 0.85 + vec3(0.85, 0.93, 1.0) * core * 0.55 + vec3(0.25, 0.45, 1.0) * halo;
        vec2 axis = vec2(0.5) - f;
        for (int i = 1; i <= 3; i++) {
          float k = float(i);
          vec2 gp = f + axis * (0.7 + k * 0.45);
          vec2 gd = vUv - gp; gd.x *= asp;
          float gr = 0.025 + 0.02 * k;
          fl += vec3(0.3, 0.55, 1.0) * smoothstep(gr, gr * 0.55, length(gd)) * 0.05;
        }
        vec2 md = uMouse - f; md.x *= asp;
        float boost = 1.0 + 0.9 * exp(-length(md) * 5.0);
        col += fl * uFlare * flick * boost;
      }

      vec2 vd = vUv - 0.5; vd.x *= asp;
      col *= 1.0 - smoothstep(0.42, 1.15, length(vd)) * 0.6;
      gl_FragColor = vec4(col * uReveal, 1.0);
    }`;

  const instances = new Set();
  let rafId = 0;

  const loop = (t) => {
    rafId = requestAnimationFrame(loop);
    instances.forEach((inst) => inst.render(t / 1000));
  };

  const compile = (gl, type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };

  function supported() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && c.getContext('webgl'));
    } catch (e) { return false; }
  }

  function create(canvas, opts = {}) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;

    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (e) {
      console.warn('CinemaGL:', e);
      return null;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const names = ['uTex', 'uRes', 'uImg', 'uPos', 'uPan', 'uMouse', 'uFlarePos', 'uZoom', 'uBlur', 'uAberr', 'uVel', 'uTime', 'uFlare', 'uExposure', 'uGray', 'uReveal'];
    const u = {};
    names.forEach((n) => { u[n] = gl.getUniformLocation(program, n); });

    const state = {
      zoom: 1, blur: 0, aberr: 0, vel: 0, flare: 0, exposure: 1, gray: 0, reveal: 1,
      pos: [0.5, 0.5], pan: [0, 0], mouse: [0.5, 0.5], flarePos: [0.5, 0.5],
      ...opts.state,
    };

    const img = { w: 1, h: 1, ready: false };
    const tex = gl.createTexture();
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      const pot = (n) => (n & (n - 1)) === 0;
      if (pot(image.width) && pot(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      img.w = image.width;
      img.h = image.height;
      img.ready = true;
      canvas.classList.add('is-ready');
      opts.onReady?.();
    };
    image.src = opts.src;

    const size = { w: 1, h: 1, cssW: 1, cssH: 1 };
    const maxDpr = opts.maxDpr || 1.75;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      size.cssW = Math.max(1, r.width);
      size.cssH = Math.max(1, r.height);
      size.w = Math.max(1, Math.round(size.cssW * dpr));
      size.h = Math.max(1, Math.round(size.cssH * dpr));
      if (canvas.width !== size.w || canvas.height !== size.h) {
        canvas.width = size.w;
        canvas.height = size.h;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let visible = true;
    const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; }, { rootMargin: "10% 0px" });
    io.observe(canvas);

    let lost = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });

    const inst = {
      state,
      canvas,
      set(obj) { Object.assign(state, obj); },
      // Where a point of the image (0..1, y down) lands inside the canvas, in CSS px
      imageToCanvas(ix, iy) {
        const rs = size.cssW / size.cssH;
        const ri = img.w / img.h;
        let wx = 1, wy = 1;
        if (rs > ri) wy = ri / rs; else wx = rs / ri;
        wx /= state.zoom; wy /= state.zoom;
        const sx = (ix - (1 - wx) * state.pos[0] - state.pan[0]) / wx;
        const sy = (iy - (1 - wy) * state.pos[1] - state.pan[1]) / wy;
        return [sx * size.cssW, sy * size.cssH];
      },
      render(time) {
        if (!img.ready || !visible || lost) return;
        gl.viewport(0, 0, size.w, size.h);
        gl.uniform1i(u.uTex, 0);
        gl.uniform2f(u.uRes, size.w, size.h);
        gl.uniform2f(u.uImg, img.w, img.h);
        gl.uniform2f(u.uPos, state.pos[0], state.pos[1]);
        gl.uniform2f(u.uPan, state.pan[0], state.pan[1]);
        gl.uniform2f(u.uMouse, state.mouse[0], state.mouse[1]);
        gl.uniform2f(u.uFlarePos, state.flarePos[0], state.flarePos[1]);
        gl.uniform1f(u.uZoom, state.zoom);
        gl.uniform1f(u.uBlur, state.blur);
        gl.uniform1f(u.uAberr, state.aberr);
        gl.uniform1f(u.uVel, state.vel);
        gl.uniform1f(u.uTime, time);
        gl.uniform1f(u.uFlare, state.flare);
        gl.uniform1f(u.uExposure, state.exposure);
        gl.uniform1f(u.uGray, state.gray);
        gl.uniform1f(u.uReveal, state.reveal);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy() {
        instances.delete(inst);
        ro.disconnect();
        io.disconnect();
      },
    };

    instances.add(inst);
    if (!rafId) rafId = requestAnimationFrame(loop);
    return inst;
  }

  window.CinemaGL = { create, supported };
})();
