// js/core/ui.js
// Wspólne helpery UI dla gier.

(function () {
  function addBackToArcadeButton(options = {}) {
    const params = new URLSearchParams(window.location.search);
    const isFullscreen = params.get("fullscreen") === "1";
    if (!isFullscreen) return;

    const backUrl = options.backUrl || "../arcade.html";

    const btn = document.createElement("button");
    btn.textContent = "Powrót do Arcade";
    btn.type = "button";
    btn.style.position = "fixed";
    btn.style.top = "20px";
    btn.style.left = "20px";
    btn.style.padding = "8px 16px";
    btn.style.border = "none";
    btn.style.borderRadius = "999px";
    btn.style.cursor = "pointer";
    btn.style.zIndex = "9999";
    btn.style.fontSize = "14px";
    btn.style.fontWeight = "600";
    btn.style.background = "linear-gradient(135deg,#22c55e,#16a34a)";
    btn.style.color = "#052e16";
    btn.style.boxShadow = "0 8px 18px rgba(22,163,74,0.45)";
    btn.style.transition = "transform 0.06s ease, box-shadow 0.06s ease";

    btn.onmouseover = () => {
      btn.style.transform = "translateY(-1px)";
      btn.style.boxShadow = "0 12px 26px rgba(22,163,74,0.6)";
    };
    btn.onmouseout = () => {
      btn.style.transform = "translateY(0)";
      btn.style.boxShadow = "0 8px 18px rgba(22,163,74,0.45)";
    };

    btn.onclick = () => {
      window.location.href = backUrl;
    };

    document.body.appendChild(btn);
  }

  window.ArcadeUI = {
    addBackToArcadeButton
  };
})();
