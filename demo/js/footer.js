/* 公共页脚：入场动画、手机菜单中的页脚过渡、模板占位链接。 */
(function initParkFooter() {
  "use strict";
  window.parkFooter?.destroy();
  window.parkFooter = undefined;
  window.initParkFooter = initParkFooter;
  const footer = document.querySelector(".site-footer");
  if (!footer) return;
  const mobile = matchMedia("(max-width: 767px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let entrance, menuMotion;
  const menuTarget = footer.closest(".page-footer");
  const complete = () => { entrance?.progress(1).kill(); entrance = undefined; };
  function enter(paused = false) {
    complete();
    if (mobile.matches || reduced.matches || !window.gsap) return;
    const tl = gsap.timeline({ paused, defaults: { ease: "power3.out", duration: .7 } });
    tl.from(
      footer.querySelector(".footer-brand"),
      {
        y: 14,
        autoAlpha: 0,
        duration: 0.75,
        clearProps: "transform,opacity,visibility",
      },
      0.35,
    )
      .from(
        footer.querySelector(".footer-links"),
        {
          y: 18,
          autoAlpha: 0,
          duration: 0.85,
          clearProps: "transform,opacity,visibility",
        },
        0.5,
      )
      .from(
        footer.querySelector(".footer-contact"),
        {
          y: 18,
          autoAlpha: 0,
          duration: 0.8,
          clearProps: "transform,opacity,visibility",
        },
        0.65,
      )
      .from(
        footer.querySelector(".copyright"),
        {
          y: 10,
          autoAlpha: 0,
          duration: 0.65,
          clearProps: "transform,opacity,visibility",
        },
        0.85,
      );
    entrance = tl;
    return tl;
  }
  function onMenu(event) {
    if (!menuTarget) return;
    menuMotion?.kill();
    if (!event.detail.animate || !window.gsap || reduced.matches) {
      menuTarget.style.removeProperty("opacity");
      menuTarget.style.removeProperty("transform");
      return;
    }
    menuMotion = event.detail.open
      ? gsap.fromTo(menuTarget, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .32, delay: .1, ease: "power2.out", clearProps: "opacity,transform" })
      : gsap.to(menuTarget, { opacity: 0, y: 6, duration: .2, ease: "power2.in", clearProps: "opacity,transform" });
  }
  function onClick(event) {
    const link = event.target.closest("[data-template-link]");
    if (link && ["#", ""].includes(link.getAttribute("href"))) event.preventDefault();
  }
  function resetMotion() { complete(); menuMotion?.progress(1).kill(); }
  document.addEventListener("park:mobile-menu", onMenu);
  footer.addEventListener("click", onClick);
  mobile.addEventListener("change", resetMotion);
  reduced.addEventListener("change", resetMotion);
  window.parkFooter = {
    enter, complete,
    destroy() {
      resetMotion();
      document.removeEventListener("park:mobile-menu", onMenu);
      footer.removeEventListener("click", onClick);
      mobile.removeEventListener("change", resetMotion);
      reduced.removeEventListener("change", resetMotion);
    },
  };
  return window.parkFooter;
})();
