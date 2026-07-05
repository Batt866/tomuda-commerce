(function () {
  var cap = window.Capacitor;
  if (!cap || typeof cap.registerPlugin !== "function") return;
  if (window.TomudaGeolocation) return;

  window.TomudaGeolocation = cap.registerPlugin("Geolocation", {
    web: function () {
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
    },
  });
})();
