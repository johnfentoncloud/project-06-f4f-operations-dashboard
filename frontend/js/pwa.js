(function () {
  "use strict";
  if (window.F4F_CONFIG?.environment === "production" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
  }
})();
