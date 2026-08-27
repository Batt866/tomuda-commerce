package mn.tomuda.commerce;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(
            alias = "btConnect",
            strings = { Manifest.permission.BLUETOOTH_CONNECT }
        ),
        @Permission(
            alias = "btScan",
            strings = { Manifest.permission.BLUETOOTH_SCAN }
        ),
        @Permission(
            alias = "btLegacy",
            strings = {
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private BluetoothSocket socket;
    private OutputStream output;
    private String connectedAddress = "";

    private BluetoothAdapter adapter() {
        Context ctx = getContext();
        if (ctx == null) return null;
        BluetoothManager manager =
            (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
        return manager != null ? manager.getAdapter() : BluetoothAdapter.getDefaultAdapter();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        BluetoothAdapter adapter = adapter();
        ret.put("available", adapter != null);
        ret.put("enabled", adapter != null && adapter.isEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            requestPermissionForAliases(
                new String[] { "btConnect", "btScan" },
                call,
                "onBtPermission"
            );
            return;
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void onBtPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted =
            getPermissionState("btConnect") == com.getcapacitor.PermissionState.GRANTED;
        ret.put("granted", granted);
        if (granted) call.resolve(ret);
        else call.reject("Bluetooth эрх олгогдоогүй");
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void listDevices(PluginCall call) {
        io.execute(() -> {
            try {
                BluetoothAdapter adapter = adapter();
                if (adapter == null) {
                    call.reject("Bluetooth дэмжихгүй");
                    return;
                }
                if (!adapter.isEnabled()) {
                    call.reject("Bluetooth унтраалттай байна. Асаагаад дахин оролдоно уу.");
                    return;
                }
                JSArray devices = new JSArray();
                Set<BluetoothDevice> bonded = adapter.getBondedDevices();
                if (bonded != null) {
                    for (BluetoothDevice device : bonded) {
                        JSObject row = new JSObject();
                        String name = device.getName();
                        row.put("name", name != null && !name.isEmpty() ? name : device.getAddress());
                        row.put("address", device.getAddress());
                        devices.put(row);
                    }
                }
                JSObject ret = new JSObject();
                ret.put("devices", devices);
                call.resolve(ret);
            } catch (SecurityException e) {
                call.reject("Bluetooth эрх олгогдоогүй");
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Принтер олдсонгүй");
            }
        });
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address", "");
        if (address == null || address.isEmpty()) {
            call.reject("Принтерийн хаяг дутуу");
            return;
        }
        io.execute(() -> {
            try {
                openSocket(address);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("address", address);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Холбогдсонгүй");
            }
        });
    }

    @PluginMethod
    public void write(PluginCall call) {
        String address = call.getString("address", connectedAddress);
        String data = call.getString("data", "");
        if (data == null || data.isEmpty()) {
            call.reject("Хэвлэх өгөгдөл хоосон");
            return;
        }
        io.execute(() -> {
            try {
                if (output == null || socket == null || !socket.isConnected()
                    || (address != null && !address.isEmpty() && !address.equals(connectedAddress))) {
                    if (address == null || address.isEmpty()) {
                        call.reject("Принтер холбогдоогүй");
                        return;
                    }
                    openSocket(address);
                }
                byte[] bytes = Base64.decode(data, Base64.DEFAULT);
                int offset = 0;
                while (offset < bytes.length) {
                    int chunk = Math.min(1024, bytes.length - offset);
                    output.write(bytes, offset, chunk);
                    output.flush();
                    offset += chunk;
                    if (offset < bytes.length) Thread.sleep(20);
                }
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) {
                closeSocket();
                call.reject(e.getMessage() != null ? e.getMessage() : "Хэвлэж чадсангүй");
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        io.execute(() -> {
            closeSocket();
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        });
    }

    @SuppressLint("MissingPermission")
    private void openSocket(String address) throws Exception {
        if (socket != null && socket.isConnected() && address.equals(connectedAddress)) return;
        closeSocket();
        BluetoothAdapter adapter = adapter();
        if (adapter == null) throw new IOException("Bluetooth дэмжихгүй");
        if (!adapter.isEnabled()) throw new IOException("Bluetooth унтраалттай байна");
        BluetoothDevice device = adapter.getRemoteDevice(address);
        try {
            adapter.cancelDiscovery();
        } catch (Exception ignored) {}
        BluetoothSocket next;
        try {
            next = device.createRfcommSocketToServiceRecord(SPP_UUID);
            next.connect();
        } catch (Exception first) {
            try {
                next = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID);
                next.connect();
            } catch (Exception second) {
                try {
                    next = (BluetoothSocket) device.getClass()
                        .getMethod("createRfcommSocket", int.class)
                        .invoke(device, 1);
                    next.connect();
                } catch (Exception third) {
                    throw new IOException("Принтертэй холбогдсонгүй");
                }
            }
        }
        socket = next;
        output = next.getOutputStream();
        connectedAddress = address;
    }

    private void closeSocket() {
        connectedAddress = "";
        try {
            if (output != null) output.close();
        } catch (Exception ignored) {}
        output = null;
        try {
            if (socket != null) socket.close();
        } catch (Exception ignored) {}
        socket = null;
    }

    @Override
    protected void handleOnDestroy() {
        closeSocket();
        io.shutdownNow();
        super.handleOnDestroy();
    }
}
