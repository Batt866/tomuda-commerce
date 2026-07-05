(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
  if (cap.Plugins && cap.Plugins.Geolocation) return;
  console.error(
    "[TOMUDA] Capacitor Geolocation plugin missing. Rebuild APK: npx cap sync android",
  );
})();
