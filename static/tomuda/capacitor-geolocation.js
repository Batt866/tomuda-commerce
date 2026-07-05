(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  if (!cap.registerPlugin) return;
  if (cap.Plugins && cap.Plugins.Geolocation) return;
  cap.registerPlugin("Geolocation", {
    web: function () {
      return Promise.resolve({
        getCurrentPosition: function (options) {
          return new Promise(function (resolve, reject) {
            if (!navigator.geolocation) {
              reject(Object.assign(new Error("unsupported"), { code: 0 }));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              function (pos) {
                resolve({ coords: pos.coords });
              },
              reject,
              Object.assign(
                {
                  enableHighAccuracy: true,
                  timeout: 25000,
                  maximumAge: 0,
                },
                options || {},
              ),
            );
          });
        },
        requestPermissions: function () {
          return Promise.resolve({
            location: "prompt",
            coarseLocation: "prompt",
          });
        },
      });
    },
  });
})();
