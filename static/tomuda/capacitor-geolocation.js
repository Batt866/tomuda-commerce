(function () {
  function webGeolocationImpl() {
    return {
      getCurrentPosition: function (options) {
        return new Promise(function (resolve, reject) {
          if (!navigator.geolocation) {
            reject(Object.assign(new Error("unsupported"), { code: 0 }));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            function (pos) {
              resolve({ coords: pos.coords, timestamp: pos.timestamp });
            },
            reject,
            Object.assign(
              {
                enableHighAccuracy: true,
                timeout: 35000,
                maximumAge: 0,
              },
              options || {},
            ),
          );
        });
      },
      checkPermissions: function () {
        return Promise.resolve({
          location: "prompt",
          coarseLocation: "prompt",
        });
      },
      requestPermissions: function () {
        return Promise.resolve({
          location: "prompt",
          coarseLocation: "prompt",
        });
      },
    };
  }

  function registerTomudaGeolocation() {
    var cap = window.Capacitor;
    if (!cap || typeof cap.registerPlugin !== "function") return false;
    if (window.TomudaGeolocation) return true;
    window.TomudaGeolocation = cap.registerPlugin("Geolocation", {
      web: webGeolocationImpl,
    });
    return true;
  }

  window.__initTomudaGeolocation = registerTomudaGeolocation;

  function boot() {
    if (registerTomudaGeolocation()) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (registerTomudaGeolocation() || tries >= 120) clearInterval(timer);
    }, 50);
  }

  boot();
  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("capacitorDidLoad", boot);
})();
