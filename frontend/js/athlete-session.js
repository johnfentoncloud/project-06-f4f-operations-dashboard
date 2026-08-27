(function () {
  "use strict";
  function createAutosave(save, delay = 900, onFailure = () => {}) {
    let timer = null;
    let chain = Promise.resolve();
    let pending = null;
    function schedule(value) {
      pending = value;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const next = pending;
        pending = null;
        chain = chain.then(() => save(next)).catch(error => { onFailure(error); });
      }, delay);
    }
    async function flush() {
      window.clearTimeout(timer);
      if (pending !== null) {
        const next = pending;
        pending = null;
        chain = chain.then(() => save(next)).catch(error => { onFailure(error); });
      }
      return chain;
    }
    return Object.freeze({ schedule, flush });
  }
  window.F4F_ATHLETE_SESSION = Object.freeze({ createAutosave });
})();
