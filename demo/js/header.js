/* 公共顶部：桌面导航、手机菜单、搜索。可独立于任何页面脚本引用。 */
(function initParkHeader() {
  "use strict";
  window.parkHeader?.destroy();
  window.parkHeader = undefined;
  const $ = (selector, root = document) => root?.querySelector(selector);
  const $$ = (selector, root = document) => [...(root?.querySelectorAll(selector) || [])];
  const header = $(".site-header");
  window.initParkHeader = initParkHeader;
  if (!header) return;
  const cleanupTasks = [];
  const listen = (node, event, handler, options) => {
    if (!node) return;
    node.addEventListener(event, handler, options);
    cleanupTasks.push(() => node.removeEventListener(event, handler, options));
  };
  const mobileLayout = matchMedia("(max-width: 767px)");
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const animate = () => !!window.gsap && !motionPreference.matches;
  const homeLayout = !!$(".page-swiper");
  let headerCloseTimer;
  const contentState = new Map();
  function setContentInert(inert) {
    if (inert) {
      [$("main"), $(".site-footer")].filter(Boolean).forEach(node => {
        if (!contentState.has(node)) contentState.set(node, node.inert);
        node.inert = true;
      });
    } else {
      contentState.forEach((value, node) => { node.inert = value; });
      contentState.clear();
    }
  }
  function notifyState() {
    document.dispatchEvent(new CustomEvent("park:header-state"));
  }
  function menuOpen() {
    return (
      header.classList.contains("is-expanded") ||
      (mobileNavigation && !mobileNavigation.hidden) ||
      !!$(".search-dialog")?.open
    );
  }
  let mobileMenuScroll = 0;
  let mobileMenuTimeline;
  const mobileSubnavTimelines = new Map();
  const mobileNavigation = $("#mobile-navigation");
  const menuToggle = $(".menu-toggle");

  function finishMobileSubnavMotion() {
    mobileSubnavTimelines.forEach((timeline) => timeline.progress(1).kill());
    mobileSubnavTimelines.clear();
  }

  function clearMobileMenuMotion() {
    if (mobileMenuTimeline) mobileMenuTimeline.kill();
    mobileMenuTimeline = undefined;
    [mobileNavigation, ...$$(".mobile-nav-group", mobileNavigation)].filter(Boolean).forEach((el) => {
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
    });
  }

  function closeMobileMenu(withMotion = false) {
    if (!mobileNavigation || !menuToggle) return;
    const wasOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "展开菜单");
    mobileNavigation.inert = true;
    if (mobileNavigation.contains(document.activeElement)) menuToggle.focus({ preventScroll: true });
    finishMobileSubnavMotion();
    if (mobileMenuTimeline) mobileMenuTimeline.kill();
    const finish = () => {
      clearMobileMenuMotion();
      mobileNavigation.hidden = true;
      if (!homeLayout) setContentInert(false);
      notifyState();
      if (document.body.classList.contains("mobile-menu-open")) {
        document.body.classList.remove("mobile-menu-open");
        window.scrollTo({ top: mobileMenuScroll, behavior: "instant" });
      }
    };
    document.dispatchEvent(new CustomEvent("park:mobile-menu", { detail: { open: false, animate: withMotion && wasOpen && mobileLayout.matches && animate() } }));
    if (withMotion && wasOpen && mobileLayout.matches && animate()) {
      mobileMenuTimeline = gsap.timeline({ onComplete: finish })
        .to(mobileNavigation,
          { opacity: 0, y: -6, duration: 0.2, ease: "power2.in" }, 0);
    } else finish();
  }

  function closeMenus(withMobileMotion = false) {
    clearTimeout(headerCloseTimer);
    $$(".nav-item").forEach((item) => {
      item.classList.remove("is-open");
      const sub = $(".nav-sub", item);
      if (sub) sub.hidden = true;
      const link = $("a", item);
      if (link && sub) link.setAttribute("aria-expanded", "false");
    });
    header.classList.remove("is-expanded");
    closeMobileMenu(withMobileMotion);
    notifyState();
  }
  function openMenu(item) {
    clearTimeout(headerCloseTimer);
    $$(".nav-item").forEach((other) => {
      const sub = $(".nav-sub", other);
      const opened = other === item && !!sub;
      other.classList.toggle("is-open", opened);
      if (sub) sub.hidden = !opened;
      const link = $("a", other);
      if (link && sub) link.setAttribute("aria-expanded", String(opened));
    });
    header.classList.add("is-expanded");
    notifyState();
  }
  $$(".nav-item").forEach((item) => {
    listen(item, "mouseenter", () => openMenu(item));
    listen(item, "focusin", () => openMenu(item));
  });
  listen(header, "mouseleave", () => {
    // Touch browsers emit compatibility mouseleave during a tap. Keep mobile navigation open.
    if (matchMedia("(hover:hover) and (min-width:1200px)").matches)
      headerCloseTimer = setTimeout(closeMenus, 150);
  });
  listen(header, "mouseenter", () => {
    clearTimeout(headerCloseTimer);
    if (matchMedia("(hover:hover) and (min-width:1200px)").matches)
      header.classList.add("is-expanded");
    notifyState();
  });
  listen(header, "focusout", () => {
    if (mobileNavigation && !mobileNavigation.hidden) return;
    clearTimeout(headerCloseTimer);
    headerCloseTimer = setTimeout(() => {
      if (!header.contains(document.activeElement)) closeMenus();
    }, 150);
  });
  listen($(".menu-toggle"), "click", () => {
    const mobile = mobileNavigation;
    if (!mobile || !menuToggle) return;
    const opened = menuToggle.getAttribute("aria-expanded") !== "true";
    if (!opened) {
      closeMenus(true);
      return;
    }
    if (!mobileLayout.matches) closeMenus();
    // 快速重开时取消退场，保留首次打开前的阅读位置。
    clearMobileMenuMotion();
    finishMobileSubnavMotion();
    mobile.hidden = false;
    mobile.inert = false;
    $(".menu-toggle").setAttribute("aria-expanded", String(opened));
    $(".menu-toggle").setAttribute(
      "aria-label",
      opened ? "关闭菜单" : "展开菜单",
    );
    if (opened && mobileLayout.matches) {
      if (!document.body.classList.contains("mobile-menu-open"))
        mobileMenuScroll = window.scrollY;
      document.body.classList.add("mobile-menu-open");
      window.scrollTo({ top: 0, behavior: "instant" });
      if (!homeLayout) setContentInert(true);
      // 优先展开当前页面所属分类，首页默认展开企业分类。
      const activeGroup = $$(".mobile-nav-group", mobile).findIndex(group => !!$('a[aria-current="page"]', group));
      const defaultGroup = activeGroup >= 0 ? activeGroup : (homeLayout ? 1 : 0);
      $$(".mobile-nav-heading").forEach((button, index) => {
        button.setAttribute("aria-expanded", String(index === defaultGroup));
        const sub = document.getElementById(button.getAttribute("aria-controls"));
        sub.hidden = index !== defaultGroup;
        sub.inert = index !== defaultGroup;
      });
      if (animate()) {
        mobileMenuTimeline = gsap.timeline()
          .fromTo(mobile, { opacity: 0, y: -10 }, {
            opacity: 1, y: 0, duration: 0.32, ease: "power2.out",
            clearProps: "opacity,transform",
          })
          .fromTo($$(".mobile-nav-group", mobile), { opacity: 0, y: 8 }, {
            opacity: 1, y: 0, duration: 0.22, stagger: 0.025,
            ease: "power2.out", clearProps: "opacity,transform",
          }, 0.06);
        document.dispatchEvent(new CustomEvent("park:mobile-menu", { detail: { open: true, animate: true } }));
      }
    }
    notifyState();
  });

  $$(".mobile-nav-heading").forEach((button) => {
    listen(button, "click", () => {
      const opened = button.getAttribute("aria-expanded") !== "true";
      $$(".mobile-nav-heading").forEach((other) => {
        const active = other === button && opened;
        const wasActive = other.getAttribute("aria-expanded") === "true";
        other.setAttribute("aria-expanded", String(active));
        const sub = document.getElementById(other.getAttribute("aria-controls"));
        sub.inert = !active;
        if (wasActive === active) return;
        const previous = mobileSubnavTimelines.get(sub);
        if (previous) previous.kill();
        const currentHeight = sub.hidden ? 0 : sub.getBoundingClientRect().height;
        const currentOpacity = sub.hidden ? 0 : Number(getComputedStyle(sub).opacity);
        const currentPadding = sub.hidden ? [0, 0] : [parseFloat(getComputedStyle(sub).paddingTop), parseFloat(getComputedStyle(sub).paddingBottom)];
        sub.hidden = false;
        ["height", "opacity", "padding-top", "padding-bottom", "overflow"].forEach((property) => sub.style.removeProperty(property));
        const targetHeight = sub.getBoundingClientRect().height;
        const style = getComputedStyle(sub);
        const padding = [parseFloat(style.paddingTop), parseFloat(style.paddingBottom)];
        const finish = () => {
          sub.hidden = !active;
          ["height", "opacity", "padding-top", "padding-bottom", "overflow"].forEach((property) => sub.style.removeProperty(property));
          mobileSubnavTimelines.delete(sub);
        };
        if (!mobileLayout.matches || !animate()) {
          finish();
          return;
        }
        sub.style.overflow = "hidden";
        const timeline = gsap.timeline({ onComplete: finish }).fromTo(sub, {
          height: currentHeight, opacity: currentOpacity,
          paddingTop: currentPadding[0], paddingBottom: currentPadding[1],
        }, {
          height: active ? targetHeight : 0, opacity: active ? 1 : 0,
          paddingTop: active ? padding[0] : 0, paddingBottom: active ? padding[1] : 0,
          duration: active ? 0.3 : 0.22, ease: active ? "power2.out" : "power2.inOut",
        });
        mobileSubnavTimelines.set(sub, timeline);
      });
    });
  });

  const searchDialog = $(".search-dialog");
  const searchInput = $("#site-search");
  listen($(".search-open", header), "click", () => {
    if (!searchDialog) return;
    closeMenus();
    searchDialog.showModal();
    notifyState();
    searchInput?.focus();
  });
  listen($(".dialog-close", searchDialog || header), "click", () => searchDialog?.close());
  listen(searchDialog, "click", event => {
    if (event.target !== searchDialog) return;
    const rect = searchDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) searchDialog.close();
  });
  listen(searchDialog, "close", notifyState);
  listen($(".search-form"), "submit", event => {
    event.preventDefault();
    const term = searchInput?.value.trim().toLocaleLowerCase() || "";
    const results = $(".search-results", searchDialog);
    if (!results) return;
    results.replaceChildren();
    if (!term) { results.textContent = "请输入搜索关键词"; return; }
    // A page can provide results and actions; rendering remains owned by the header.
    const query = new CustomEvent("park:search", { cancelable: true, detail: { term, matches: [] } });
    document.dispatchEvent(query);
    if (!query.defaultPrevented) {
      $$("main section[aria-labelledby]").filter(section => section.textContent.toLocaleLowerCase().includes(term)).forEach(section => {
        const heading = document.getElementById(section.getAttribute("aria-labelledby"));
        if (!heading) return;
        query.detail.matches.push({ text: heading.textContent, run: () => section.scrollIntoView({ block: "start", behavior: motionPreference.matches ? "instant" : "smooth" }) });
      });
    }
    query.detail.matches.forEach(match => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = match.text;
      button.addEventListener("click", () => { searchDialog.close(); match.run(); });
      results.append(button);
    });
    if (!query.detail.matches.length) results.textContent = "未找到相关内容，请尝试其他关键词";
  });
  listen(header, "click", event => {
    const link = event.target.closest("a");
    if (!link) return;
    if (link.hasAttribute("data-template-link") && ["#", ""].includes(link.getAttribute("href"))) { event.preventDefault(); return; }
    if (mobileNavigation?.contains(link)) closeMenus();
  });
  listen(document, "click", event => {
    // Placeholder links can also occur in page content supplied by the template.
    const link = event.target.closest("[data-template-link]");
    if (link && ["#", ""].includes(link.getAttribute("href"))) event.preventDefault();
    if (!header.contains(event.target)) closeMenus();
  });
  listen(document, "keydown", event => {
    if (event.key === "Escape") {
      const wasOpen = mobileNavigation && !mobileNavigation.hidden;
      closeMenus(true);
      if (wasOpen) menuToggle?.focus({ preventScroll: true });
    }
    if (event.key !== "Tab" || !mobileNavigation || mobileNavigation.hidden || searchDialog?.open) return;
    const targets = [menuToggle, ...$$("button,a", mobileNavigation)].filter(node => node && node.getClientRects().length);
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  listen(mobileLayout, "change", () => closeMenus());
  listen(window, "resize", () => { if (innerWidth >= 1200) closeMenus(); });
  listen(motionPreference, "change", () => {
    if (!motionPreference.matches) return;
    mobileMenuTimeline?.progress(1);
    finishMobileSubnavMotion();
  });
  window.parkHeader = {
    close: closeMenus,
    isOpen: menuOpen,
    isSearchOpen: () => !!searchDialog?.open,
    destroy() {
      cleanupTasks.forEach(cleanup => cleanup());
      closeMenus();
      searchDialog?.close();
      clearTimeout(headerCloseTimer);
      clearMobileMenuMotion();
      setContentInert(false);
    },
  };
  return window.parkHeader;
})();
