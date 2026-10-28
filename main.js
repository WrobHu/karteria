/* Karteria — ruch strony w języku filmu z przelotem.
   Bez bibliotek. Jedno pasywne nasłuchiwanie przewijania + requestAnimationFrame, animowane tylko transform/opacity.
   Bez JS (albo z prefers-reduced-motion) strona jest płaska i w całości widoczna. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = root.classList.contains('motion') && !reduce.matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (t) => t * t * (3 - 2 * t);

  /* MARK: Menu na telefonie (details/summary działa też bez JS) */
  const menu = $('.menu');
  if (menu) {
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.open) { menu.open = false; $('summary', menu).focus(); }
    });
    document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  }

  /* MARK: Aktywny link w nawigacji */
  // Obserwowane są wszystkie sekcje (także te bez linku: hero, cytat, pytania, stopka, film) —
  // sekcja bez linku w nawigacji czyści podświetlenie, zamiast zostawiać poprzednie.
  const navLinks = $$('.nav-links a');
  const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window && navLinks.length) {
    const hit = new Map();
    const navIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => hit.set(e.target, e.isIntersecting));
      let cur = null;
      hit.forEach((on, el) => { if (on) cur = el; });
      const a = cur ? byId.get(cur.id) : null;
      navLinks.forEach((l) => l.classList.toggle('on', l === a));
    }, { rootMargin: '-45% 0px -54% 0px' });
    $$('#tresc > section, #film').forEach((s) => navIO.observe(s));
  }

  /* MARK: Nawigacja chowa się, gdy strona się kończy (zamiast jechać na przyciętym brzegu strony nad podłogą) */
  const nav = $('#nav');
  const page = $('.page');
  if (nav && page) {
    // Z układu, nie z getBoundingClientRect: w trakcie wejścia strona jest pochylona w 3D i jej obwiednia bywa bez sensu.
    let navRaf = 0;
    const navCheck = () => {
      navRaf = 0;
      let top = 0;
      for (let n = page; n; n = n.offsetParent) top += n.offsetTop;
      nav.classList.toggle('off', top + page.offsetHeight - scrollY < nav.offsetHeight + 120);
    };
    const navQueue = () => { if (!navRaf) navRaf = requestAnimationFrame(navCheck); };
    addEventListener('scroll', navQueue, { passive: true });
    addEventListener('resize', navQueue, { passive: true });
    navCheck();
  }

  /* MARK: Film: odtwarzanie tylko w kadrze, przełącznik dźwięku */
  const video = $('#film-video');
  const ui = $('.film-ui');
  if (video && ui) {
    const playBtn = $('#film-play');
    const soundBtn = $('#film-sound');
    const fullBtn = $('#film-full');
    const dl = $('.film-dl');
    const sources = $$('source', video);
    let userPaused = false;
    let inView = false;
    let playing = false;      // dopiero zdarzenie „playing” — samo wywołanie play() to jeszcze nie odtwarzanie
    let failed = false;
    // Przeglądarka bez żadnego z formatów (albo błąd ostatniego źródła): zwykłe kontrolki i link do pobrania.
    const fallback = () => {
      if (failed) return;
      failed = true; playing = false;
      video.controls = true;
      ui.hidden = true;
      if (dl) dl.hidden = false;
    };
    if (!sources.some((s) => video.canPlayType(s.type) !== '')) { fallback(); }
    else {
    if (sources.length) sources[sources.length - 1].addEventListener('error', fallback);
    video.addEventListener('error', fallback);
    video.removeAttribute('controls');
    ui.hidden = false;
    const play = () => {
      if (video.preload !== 'auto') video.preload = 'auto';
      const p = video.play();
      if (p && p.catch) p.catch(() => sync());
    };
    const sync = () => {
      playBtn.classList.toggle('playing', playing);
      playBtn.setAttribute('aria-label', playing ? 'Zatrzymaj film' : 'Odtwórz film');
      soundBtn.setAttribute('aria-pressed', String(!video.muted));
      $('span', soundBtn).textContent = video.muted ? 'Włącz dźwięk' : 'Wycisz';
    };
    const toggle = () => {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    };
    playBtn.addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    soundBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted && video.paused) { userPaused = false; play(); }
      sync();
    });
    video.addEventListener('playing', () => { playing = true; sync(); });
    ['pause', 'ended', 'emptied'].forEach((ev) => video.addEventListener(ev, () => { playing = false; sync(); }));
    video.addEventListener('volumechange', sync);
    // Pełny ekran: na czas pełnego ekranu wracają kontrolki przeglądarki (przewijanie, PiP); iPhone ma własny odtwarzacz.
    if (fullBtn && (video.requestFullscreen || video.webkitEnterFullscreen)) {
      fullBtn.hidden = false;
      fullBtn.addEventListener('click', () => {
        if (video.requestFullscreen && document.fullscreenEnabled) video.requestFullscreen().catch(() => {});
        else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      });
      document.addEventListener('fullscreenchange', () => { if (!failed) video.controls = document.fullscreenElement === video; });
    }
    if ('IntersectionObserver' in window) {
      // Wczytanie zaczyna się ~1200 px przed kadrem (tylko gdy film i tak sam ruszy), żeby bufor i dekoder były gotowe,
      // zanim karta wjedzie — bez przycięcia przewijania w chwili startu.
      if (motion) {
        const pre = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          pre.disconnect();
          if (video.preload !== 'auto') video.preload = 'auto';
        }, { rootMargin: '1200px 0px 1200px 0px' });
        pre.observe(video);
      }
      new IntersectionObserver(([e]) => {
        inView = e.isIntersecting;
        if (inView && motion && !userPaused) play();
        else if (!inView && !video.paused) video.pause();
      }, { threshold: 0.4 }).observe(video);
    }
    sync();
    }
  }

  if (!motion || !('IntersectionObserver' in window)) return;

  /* MARK: Pozycje w dokumencie (z układu, nie z transformacji — strona może się właśnie prostować) */
  const scene = $('.scene');
  const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const docLeft = (el) => { let x = 0; for (let n = el; n; n = n.offsetParent) x += n.offsetLeft; return x; };

  /* Kafelki logo: zawisają przy górnych rogach strony (0,1–1,35 s w filmie). Lewy wylatuje z kafelka przy „Wkrótce”,
     prawy wynurza się z podłogi na tej samej wysokości. Tor (tileFly): najpierw w bok do brzegu strony, potem w górę
     wzdłuż brzegu — nigdy nad tekstem ani nad nawigacją. Na wąskich ekranach brzeg strony to treść, więc tylko krótkie wynurzenie. */
  if (root.classList.contains('intro')) {
    const s = $('.soon .tile');
    $$('.ctile').forEach((c, k) => {
      const t = $('.tile', c);
      if (!t || !s || !s.offsetWidth || innerWidth < 768) return;   // domyślne --fy/--fs/--fo z CSS: krótkie wynurzenie
      const tw = t.offsetWidth;
      const dx = docLeft(s) + s.offsetWidth / 2 - (docLeft(t) + tw / 2);
      const dy = docTop(s) + s.offsetHeight / 2 - (docTop(t) + tw / 2);
      t.style.setProperty('--fx', (k === 0 ? dx : 0).toFixed(1) + 'px');
      t.style.setProperty('--fy', dy.toFixed(1) + 'px');
      t.style.setProperty('--fs', (s.offsetWidth / tw).toFixed(3));
      t.style.setProperty('--fo', k === 0 ? '1' : '0');
    });
  }

  /* MARK: Sceny: pochylenie przy wejściu w kadr, unoszenie warstw po wejściu */
  const stages = $$('.stage[data-tilt]').map((el) => ({ el, hero: el.dataset.tilt === 'hero', top: 0, h: 0, last: '' }));
  const drifts = [
    { el: $('.drift-1'), anchor: '#tenis', off: 0.62, k: 0.42 },
    { el: $('.drift-2'), anchor: '#nazwa', off: 0.2, k: 0.36 },
  ].filter((d) => d.el);
  let vh = innerHeight;
  let small = innerWidth < 768;
  let sceneTop = 0;

  function measure() {
    vh = innerHeight;
    small = innerWidth < 768;
    sceneTop = docTop(scene);
    stages.forEach((s) => { s.top = docTop(s.el); s.h = s.el.offsetHeight; });
    $$('.lift.flat').forEach((l) => l.style.setProperty('--flat-y', flatY(l) + 'px'));
    drifts.forEach((d) => {
      const a = $(d.anchor);
      d.visible = d.el.offsetParent !== null;
      if (!a || !d.visible) return;
      d.y = docTop(a) + a.offsetHeight * d.off;
      d.el.style.top = (d.y - sceneTop).toFixed(0) + 'px';
    });
    frame();
  }

  function frame() {
    raf = 0;
    const y = scrollY;
    const inMax = small ? 7 : 14;
    const outMax = small ? 3 : 6;
    for (const s of stages) {
      const topV = (s.top - y) / vh;          // 1 = górna krawędź przy dole kadru
      const botV = (s.top + s.h - y) / vh;    // 0 = dolna krawędź przy górze kadru
      if (botV < -0.6 || topV > 1.6) continue;
      const tIn = s.hero ? 0 : smooth(clamp((topV - 0.62) / 0.38, 0, 1));   // płasko, zanim nagłówek sekcji dojdzie do góry (scena ≤ 62% kadru)
      const tOut = smooth(clamp((0.42 - botV) / 0.5, 0, 1));
      const ang = inMax * tIn - outMax * tOut;
      const ty = 56 * tIn;
      const sc = 1 - 0.035 * tIn - 0.02 * tOut;
      const op = 1 - 0.34 * tIn - 0.3 * tOut;  // głębia ostrości: dalej od linii czytania = ciemniej
      // W spoczynku bez żadnej transformacji — tekst kart rysuje się 1:1, nie z warstwy 3D.
      const tr = tIn === 0 && tOut === 0 ? 'none' : `perspective(1600px) translate3d(0,${ty.toFixed(1)}px,0) rotateX(${ang.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      const key = tr + op.toFixed(3);
      if (key !== s.last) {
        s.last = key;
        s.el.style.transform = tr;
        s.el.style.opacity = op.toFixed(3);
      }
    }
    for (const d of drifts) {
      if (!d.visible) continue;
      const rel = y + vh * 0.5 - d.y;
      if (Math.abs(rel) > vh * 2) continue;
      d.el.style.transform = `translate3d(0,${(-rel * d.k).toFixed(1)}px,0)`;
    }
  }

  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };

  // Uniesienie sceny; po przejściu karty bez pochylenia (nie chipy, nie stojące zdjęcia) dostają .flat:
  // płaskie przesunięcie o całe piksele zamiast warstwy 3D z przesunięciem 3,6 px.
  const flatY = (el) => Math.round(-(parseFloat(el.style.getPropertyValue('--z')) || 30) * (small ? 0.06 : 0.12));
  const flattenable = (el) => !el.classList.contains('chip-l') && (parseFloat(getComputedStyle(el).getPropertyValue('--stand')) || 0) === 0;
  const lift = (el) => {
    el.classList.add('in');
    $$('.lift', el).forEach((l) => {
      const once = l.classList.contains('stand-once');
      if (!once && !flattenable(l)) return;
      const i = parseFloat(l.style.getPropertyValue('--i')) || 0;
      setTimeout(() => {
        l.style.setProperty('--flat-y', flatY(l) + 'px');
        l.classList.add('flat');
      }, once ? 2800 : 1250 + i * 90 + 150);
    });
  };

  // Warstwy unoszą się, gdy scena wchodzi w kadr (i zostają uniesione — jak w filmie).
  const liftIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { lift(e.target); liftIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -16% 0px' });
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { threshold: 0.3 });

  measure();
  // Sceny już w kadrze (np. po odświeżeniu w połowie strony) startują uniesione, bez przejścia.
  stages.forEach((s) => { if (!s.hero && s.top - scrollY < vh * 0.84 && s.top + s.h > scrollY) lift(s.el); });
  $$('.stage:not([data-tilt])').forEach(lift);
  const tc = $('#title-card');
  const fc = $('#film-card');
  [tc, fc].forEach((el) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.7 && r.bottom > 0) el.classList.add('in');
  });
  root.classList.add('live');

  stages.forEach((s) => { if (!s.hero && !s.el.classList.contains('in')) liftIO.observe(s.el); });
  [tc, fc].forEach((el) => { if (el && !el.classList.contains('in')) revealIO.observe(el); });

  // Hero: telefon, zegarek i chipy unoszą się razem z prostowaniem strony.
  const hero = stages.find((s) => s.hero);
  if (hero) setTimeout(() => lift(hero.el), root.classList.contains('intro') ? 380 : 0);

  addEventListener('scroll', onScroll, { passive: true });
  let rz = 0;
  const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(measure); };
  addEventListener('resize', onResize, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);

  // Zmiana ustawienia „ogranicz ruch” w trakcie: wszystko płasko.
  const off = () => {
    if (!reduce.matches) return;
    motion = false;
    removeEventListener('scroll', onScroll);
    root.classList.remove('motion', 'live', 'intro');
    stages.forEach((s) => { s.el.style.transform = ''; s.el.style.opacity = ''; });
    $$('.lift.flat').forEach((l) => l.classList.remove('flat'));
    drifts.forEach((d) => { d.el.style.transform = ''; });
  };
  if (reduce.addEventListener) reduce.addEventListener('change', off);
})();
