/* 静态数据来自 DOM；模板循环替换后无需同步另一份 JS 数据。 */
(() => {
  'use strict';
  window.initComputing = function () {
    window.computingPage?.destroy();
    const root = document.querySelector('.computing-page main');
    if (!root) return;
    const cleanup = [], swipers = [];
    const on = (node, event, handler) => { node.addEventListener(event, handler); cleanup.push(() => node.removeEventListener(event, handler)); };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set();
    const motion = (node, frames, options = {}) => {
      if (!node || reduced.matches || !node.animate) return;
      const animation = node.animate(frames, { duration: 450, easing: 'cubic-bezier(0.2,0,0,1)', ...options });
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
      return animation;
    };
    const tabs = [...root.querySelectorAll('.resource-tab')];
    const tablist = root.querySelector('.resource-tabs');
    const resources = new Map();
    tabs.forEach(tab => {
      tablist.append(tab);
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (typeof Swiper !== 'undefined') {
        const swiper = new Swiper(panel.querySelector('.resource-swiper'), {
          slidesPerView: 1, spaceBetween: 16, speed: reduced.matches ? 0 : 350,
          watchOverflow: true, observer: true, observeParents: true,
          pagination: { el: panel.querySelector('.resource-pagination'), clickable: true },
          keyboard: { enabled: true, onlyInViewport: true },
          a11y: { enabled: true, paginationBulletMessage: '前往第 {{index}} 组算力资源' },
          breakpoints: { 768: { slidesPerView: 2, spaceBetween: 20 }, 1200: { slidesPerView: 3, spaceBetween: 24 } },
        });
        resources.set(tab, swiper); swipers.push(swiper);
      }
    });
    function selectResource(tab, focus = false) {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
        document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
      });
      resources.get(tab)?.update();
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      motion(panel, [{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 320 });
      if (focus) tab.focus();
    }
    tabs.forEach((tab, i) => {
      on(tab, 'click', () => selectResource(tab));
      on(tab, 'keydown', e => {
        const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;
        e.preventDefault(); selectResource(tabs[next], true);
      });
    });
    const carousel = root.querySelector('.model-carousel');
    if (typeof Swiper !== 'undefined') swipers.push(new Swiper(carousel, {
      slidesPerView: 'auto', spaceBetween: innerWidth < 768 ? 14 : 24 * Math.min(innerWidth / 1920, 1),
      loop: true, speed: reduced.matches ? 0 : 4000,
      // delay 0 + speed 组合成匀速跑马灯；悬停暂停方便点击卡片筛选。
      autoplay: reduced.matches ? false : { delay: 0, disableOnInteraction: false, pauseOnMouseEnter: true },
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: { enabled: true, itemRoleDescriptionMessage: '模型服务' },
    }));
    const table = root.querySelector('.model-table');
    const scroll = root.querySelector('.model-table-scroll');
    const records = [...table.querySelectorAll('.model-record')];
    const cards = [...root.querySelectorAll('.model-card')];
    function expand(record, open) {
      const button = record.querySelector('.model-expand');
      button.setAttribute('aria-expanded', String(open));
      record.querySelector('.model-detail').hidden = !open;
    }
    const hoverFine = matchMedia('(hover: hover) and (pointer: fine)');
    let hoverLock = 0;
    // 手风琴：只保留一个展开项；切换时补偿滚动，避免指针下的行被顶走。
    function openOnly(record) {
      const isOpen = record.querySelector('.model-expand').getAttribute('aria-expanded') === 'true';
      const othersOpen = records.some(item => item !== record && item.querySelector('.model-expand').getAttribute('aria-expanded') === 'true');
      if (isOpen && !othersOpen) return;
      const top = record.getBoundingClientRect().top;
      records.forEach(item => expand(item, item === record));
      const shift = record.getBoundingClientRect().top - top;
      if (Math.abs(shift) > 1) scroll.scrollTop += shift;
    }
    // 鼠标设备：悬停即展开，展开另一个时自动收起原来那个。
    records.forEach(record => on(record.querySelector('.model-row'), 'mouseenter', () => {
      if (!hoverFine.matches || performance.now() < hoverLock) return;
      hoverLock = performance.now() + 140;
      openOnly(record);
    }));
    on(table, 'click', e => {
      const record = e.target.closest('.model-record');
      if (!record) return;
      const button = record.querySelector('.model-expand');
      if (e.target.closest('.detail-close')) { expand(record, false); hoverLock = performance.now() + 400; button.focus({ preventScroll: true }); return; }
      if (!e.target.closest('.model-row')) return;
      if (hoverFine.matches) openOnly(record);
      else if (button.getAttribute('aria-expanded') === 'true') expand(record, false);
      else openOnly(record);
    });
    cards.forEach(card => on(card, 'click', () => {
      const name = card.dataset.model;
      cards.forEach(item => item.setAttribute('aria-pressed', String(item === card)));
      const matches = records.filter(item => item.dataset.model === name);
      const other = records.filter(item => item.dataset.model !== name);
      records.forEach(record => expand(record, false));
      // 每个 tbody 是独立的报价项和详情；整组移动保持关联，不复制、不丢失其他模型。
      [...matches, ...other].forEach(record => table.append(record));
      if (matches[0]) expand(matches[0], true);
      scroll.scrollTop = 0;
      matches.slice(0, 3).forEach((record, i) => motion(record.querySelector('.model-row'),
        [{ opacity: .35, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 300, delay: i * 45, fill: 'backwards' }));
      root.querySelector('.model-status').textContent = `已将 ${name} 的 ${matches.length} 项模型规格置顶`;
    }));
    const steps = [...root.querySelectorAll('.flow-list li')];
    steps.forEach((step, i) => {
      step.style.setProperty('--step-delay', `${i * 80}ms`);
      const button = step.querySelector('.flow-step');
      on(button, 'click', () => {
        const active = button.getAttribute('aria-pressed') !== 'true';
        steps.forEach(item => {
          const selected = active && item === step;
          item.classList.toggle('is-active', selected);
          item.querySelector('.flow-step').setAttribute('aria-pressed', String(selected));
        });
        motion(step.querySelector('.flow-diamond'), [
          { transform: 'rotate(45deg) scale(1)' },
          { transform: 'rotate(45deg) scale(1.16)', offset: .45 },
          { transform: `rotate(45deg) scale(${active ? 1.1 : 1})` },
        ], { duration: 420 });
      });
    });
    let observer;
    const showAll = () => {
      observer?.disconnect();
      document.body.classList.remove('reveal-ready', 'motion-ready');
      root.querySelectorAll('.flow-motion').forEach(node => node.classList.remove('flow-motion'));
      animations.forEach(animation => animation.cancel()); animations.clear();
    };
    function reveal(node) {
      node.classList.add('is-visible');
      if (node.classList.contains('hero-heading')) {
        node.querySelectorAll('h1>span').forEach((line, i) => motion(line,
          [{ opacity: 0, transform: 'translateY(24px)', clipPath: 'inset(100% 0 0)' },
           { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0)' }],
          { duration: 700, delay: i * 110, fill: 'backwards' }));
        motion(node.querySelector('p'), [{ opacity: 0, filter: 'blur(3px)', transform: 'translateY(10px)' },
          { opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' }], { duration: 650, delay: 220, fill: 'backwards' });
      } else if (node.classList.contains('hero-services')) {
        motion(node.querySelector(':scope>p'), [{ opacity: 0, transform: 'translateX(-12px)' }, { opacity: 1, transform: 'translateX(0)' }]);
        node.querySelectorAll('.hero-service-grid>a').forEach((card, i) => motion(card,
          [{ opacity: 0, transform: 'translateY(25px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
          { duration: 500, delay: i * 75, fill: 'backwards' }));
      } else if (node.classList.contains('advantage-grid')) {
        [...node.children].forEach((card, i) => motion(card,
          [{ opacity: 0, transform: 'translateY(28px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
          { duration: 550, delay: i * 75, fill: 'backwards' }));
      } else if (node.classList.contains('flow-list')) {
        steps.forEach((step, i) => {
          motion(step.querySelector('h3'), [{ opacity: 0, transform: 'translateX(-16px)' }, { opacity: 1, transform: 'translateX(0)' }],
            { duration: 400, delay: i * 80, fill: 'backwards' });
          motion(step.querySelector('.flow-diamond'), [{ opacity: 0, transform: 'rotate(25deg) scale(.65)' }, { opacity: 1, transform: 'rotate(45deg) scale(1)' }],
            { duration: 500, delay: i * 80 + 180, fill: 'backwards' });
          motion(step.querySelector('.flow-track p'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
            { duration: 400, delay: i * 80 + 250, fill: 'backwards' });
        });
      } else if (node.classList.contains('model-carousel')) {
        node.querySelectorAll('.model-card').forEach((card, i) => {
          if (i > 5) return;
          motion(card, [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'translateX(0)' }],
            { duration: 450, delay: i * 55, fill: 'backwards' });
        });
      } else if (node.classList.contains('model-table-scroll')) {
        motion(node, [{ opacity: 0, transform: 'translateY(20px) scale(.985)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 550 });
        motion(node.querySelector('thead'), [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' },
          { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 600, delay: 80, fill: 'backwards' });
        [...node.querySelectorAll('.model-record')].slice(0, 6).forEach((record, i) =>
          motion(record, [{ opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }],
          { duration: 350, delay: 160 + i * 45, fill: 'backwards' }));
      } else if (node.classList.contains('contact-grid')) {
        motion(node.querySelector('.contact-phones'), [{ opacity: 0, transform: 'translateX(-24px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 600 });
        motion(node.querySelector('.contact-info'), [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 600, delay: 100, fill: 'backwards' });
      } else if (node.matches('h2')) {
        motion(node, [{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }], { duration: 500 });
      } else {
        motion(node, [{ opacity: 0, transform: 'translateY(16px) scale(.99)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 450 });
      }
    }
    if (!reduced.matches && 'IntersectionObserver' in window) {
      document.body.classList.add('motion-ready');
      root.querySelector('.flow-list')?.classList.add('flow-motion');
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
      }), { threshold: .06 });
      root.querySelectorAll('[data-reveal]').forEach(node => {
        node.classList.remove('is-visible'); observer.observe(node);
      });
    }
    on(reduced, 'change', showAll);
    window.computingPage = { destroy() { cleanup.forEach(fn => fn()); swipers.forEach(swiper => swiper.destroy(true, true)); showAll(); } };
  };
  window.initComputing();
})();
