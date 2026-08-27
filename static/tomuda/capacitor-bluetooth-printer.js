(function () {
  function registerTomudaBluetoothPrinter() {
    var cap = window.Capacitor;
    if (!cap || typeof cap.registerPlugin !== "function") return false;
    if (window.TomudaBluetoothPrinter) return true;
    window.TomudaBluetoothPrinter = cap.registerPlugin("BluetoothPrinter");
    return true;
  }

  window.__initTomudaBluetoothPrinter = registerTomudaBluetoothPrinter;

  function boot() {
    if (registerTomudaBluetoothPrinter()) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (registerTomudaBluetoothPrinter() || tries >= 120) clearInterval(timer);
    }, 50);
  }

  boot();
  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("capacitorDidLoad", boot);
})();
