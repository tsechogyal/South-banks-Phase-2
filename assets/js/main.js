// South Banks Phase 2 landing page. No dependencies.

// Registrations are emailed by FormSubmit (formsubmit.co), which also sends the auto-reply.
// The very first submission triggers a one-time "Activate form" email to this address.
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/tsechogyal@gmail.com';
const AUTO_REPLY = [
  'Thanks for registering for South Banks Phase 2 updates.',
  '',
  'Phase 2 pricing, floor plans and the launch date have not been released yet. You will get them by email as soon as they are.',
  '',
  'Questions in the meantime? WhatsApp or call 416-451-4099: https://wa.me/14164514099',
  '',
  'Tsering Chogyal',
  'Sales Representative',
  "Century21 People's Choice Realty Inc. Brokerage",
].join('\n');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- Header: solid once past the hero ---------- */
(() => {
  const header = $('.header');
  const hero = $('.hero');
  new IntersectionObserver(([e]) => header.classList.toggle('is-solid', !e.isIntersecting), {
    rootMargin: '-80px 0px 0px 0px',
  }).observe(hero);
})();

/* ---------- Hero slideshow ---------- */
(() => {
  const slides = $$('[data-slide]');
  if (slides.length < 2) return;

  const INTERVAL = 5000;
  const controls = $('.hero__controls');
  const dotsWrap = $('.hero__dots');
  const pauseBtn = $('.hero__pause');
  let index = 0;
  let timer = null;
  let userPaused = false;
  let heroVisible = true;

  // Later slides carry their URLs in data-* attributes; copy them over on demand.
  const hydrate = (slide) => {
    if (slide.dataset.ready) return slide.dataset.ready === 'ok' ? Promise.resolve() : slide._loading;
    const img = $('img', slide);
    $$('source[data-srcset]', slide).forEach((s) => { s.srcset = s.dataset.srcset; s.removeAttribute('data-srcset'); });
    if (img.dataset.src) { img.loading = 'eager'; img.src = img.dataset.src; img.removeAttribute('data-src'); }
    slide.dataset.ready = 'loading';
    slide._loading = (img.decode ? img.decode() : Promise.resolve())
      .then(() => { slide.dataset.ready = 'ok'; })
      .catch(() => { slide.dataset.ready = 'error'; });
    return slide._loading;
  };
  slides[0].dataset.ready = 'ok';

  const dots = slides.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hero__dot';
    b.setAttribute('aria-label', `Show image ${i + 1} of ${slides.length}`);
    b.addEventListener('click', () => { go(i); restart(); });
    dotsWrap.append(b);
    return b;
  });

  const setActive = (i) => {
    slides.forEach((s, n) => {
      const on = n === i;
      s.classList.toggle('is-active', on);
      s.toggleAttribute('aria-hidden', !on);
    });
    dots.forEach((d, n) => d.setAttribute('aria-current', n === i ? 'true' : 'false'));
    index = i;
  };

  const go = async (i) => {
    const slide = slides[i];
    await hydrate(slide);
    if (slide.dataset.ready === 'error') {
      // Skip a slide whose image failed rather than fading to black.
      slide.remove(); slides.splice(i, 1); dots[i].remove(); dots.splice(i, 1);
      if (slides.length < 2) { stop(); controls.hidden = true; return; }
      return go(i % slides.length);
    }
    setActive(i);
    // Warm up the following slide in the background.
    hydrate(slides[(i + 1) % slides.length]);
  };

  const tick = () => go((index + 1) % slides.length);
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => {
    if (timer || userPaused || !heroVisible || document.hidden || reduceMotion.matches) return;
    timer = setInterval(tick, INTERVAL);
  };
  const restart = () => { stop(); start(); };

  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
    userPaused ? stop() : start();
  });

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  reduceMotion.addEventListener?.('change', () => (reduceMotion.matches ? stop() : start()));
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    heroVisible ? start() : stop();
  }).observe($('.hero'));

  setActive(0);
  controls.hidden = false;
  if (reduceMotion.matches) {
    userPaused = true;
    pauseBtn.setAttribute('aria-pressed', 'true');
    pauseBtn.setAttribute('aria-label', 'Play slideshow');
  }

  // Nothing beyond slide 1 is fetched until the page has finished loading.
  const begin = () => {
    hydrate(slides[1]);
    start();
  };
  if (document.readyState === 'complete') setTimeout(begin, 600);
  else window.addEventListener('load', () => setTimeout(begin, 600), { once: true });
})();

/* ---------- Scroll reveals ---------- */
(() => {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach((el) => io.observe(el));
})();

/* ---------- Light parallax + keeping the WhatsApp button clear of other buttons ---------- */
(() => {
  const fab = $('.wa-fab');
  const avoid = $$('[data-fab-avoid]');
  const layers = $$('.parallax');
  const visible = new Set();
  let queued = false;

  if (layers.length && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    });
    layers.forEach((l) => io.observe(l));
  }

  const frame = () => {
    queued = false;
    const vh = window.innerHeight;

    visible.forEach((el) => {
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 across the viewport
      el.style.setProperty('--py', `${(offset * -24).toFixed(1)}px`);
    });

    // If a button sits under the floating WhatsApp icon, lift the icon above it.
    // offset* ignore the current transform, so this is the resting position.
    const f = { top: fab.offsetTop, left: fab.offsetLeft };
    f.bottom = f.top + fab.offsetHeight;
    f.right = f.left + fab.offsetWidth;
    let lift = 0;
    for (const el of avoid) {
      const r = el.getBoundingClientRect();
      if (r.bottom < f.top - 8 || r.top > f.bottom + 8 || r.right < f.left - 8 || r.left > f.right + 8) continue;
      lift = Math.max(lift, f.bottom - r.top + 12);
    }
    const tooFar = lift > 140;
    fab.classList.toggle('is-hidden', tooFar);
    fab.style.setProperty('--lift', tooFar ? '0px' : `${-lift}px`);
  };

  const onScroll = () => {
    if (!queued) { queued = true; requestAnimationFrame(frame); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  // Reveal transitions move buttons after the last scroll event, so re-check when they finish.
  document.addEventListener('transitionend', (e) => { if (e.target.classList.contains('reveal')) onScroll(); });
  onScroll();
})();

/* ---------- Gallery lightbox ---------- */
(() => {
  const dialog = $('.lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const img = $('img', dialog);
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-lightbox]');
    if (!link) return;
    e.preventDefault();
    const thumb = $('img', link);
    img.src = link.href;
    img.alt = thumb ? thumb.alt : '';
    dialog.showModal();
  });
  $('button', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
})();

/* ---------- Registration form ---------- */
(() => {
  const form = $('#lead-form');
  if (!form) return;
  const done = $('.form__done');
  const error = $('.form__error', form);
  const button = $('button[type="submit"]', form);

  // Keep ad attribution (utm_*, fbclid) with the lead.
  const params = new URLSearchParams(location.search);
  const source = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid']
    .filter((k) => params.get(k))
    .map((k) => `${k}=${params.get(k)}`)
    .join('&');
  form.elements.source.value = source || document.referrer || 'direct';

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const phoneOk = (v) => v.replace(/\D/g, '').length >= 10;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    const f = form.elements;
    const checks = [
      [f.name, f.name.value.trim().length > 1, 'Please enter your name.'],
      [f.email, emailOk(f.email.value.trim()), 'Please enter a valid email address.'],
      [f.phone, phoneOk(f.phone.value), 'Please enter a phone number with area code.'],
      [f.consent, f.consent.checked, 'Please tick the consent box so we can send you Phase 2 details.'],
    ];
    checks.forEach(([el, ok]) => el.setAttribute('aria-invalid', String(!ok)));
    const failed = checks.find(([, ok]) => !ok);
    if (failed) {
      error.textContent = failed[2];
      failed[0].focus();
      return;
    }
    if (f.company.value) return; // honeypot

    if (!FORM_ENDPOINT) {
      error.textContent = 'Registration is being set up. Please message on WhatsApp or call 416-451-4099 for now.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Sending…';
    // Keys become the labels in the lead email. `email` doubles as the reply-to address.
    const lead = {
      Name: f.name.value.trim(),
      email: f.email.value.trim(),
      Phone: f.phone.value.trim(),
      'Interested as': f.intent.value,
      'Working with a realtor': f.realtor.value,
      'Ad source': f.source.value,
      Consent: 'Yes',
      _subject: `New South Banks Phase 2 registration: ${f.name.value.trim()}`,
      _template: 'table',
      _captcha: 'false',
      _autoresponse: AUTO_REPLY,
    };
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(lead),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || String(out.success) !== 'true') throw new Error(out.message || res.status);
      form.hidden = true;
      done.hidden = false;
      done.focus();
    } catch {
      button.disabled = false;
      button.textContent = 'Register for Phase 2 updates';
      error.textContent = 'That didn’t go through. Please try again, or message on WhatsApp or call 416-451-4099.';
    }
  });
})();
