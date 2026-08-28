package mn.tomuda.commerce;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.ParcelUuid;
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
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

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
        else call.reject("Bluetooth эрх олгогдоогүй. Тохиргооноос Томуда-д Bluetooth зөвшөөрнө үү.");
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
                Map<String, JSObject> byAddress =
                    java.util.Collections.synchronizedMap(new LinkedHashMap<>());
                Set<BluetoothDevice> bonded = adapter.getBondedDevices();
                if (bonded != null) {
                    for (BluetoothDevice device : bonded) {
                        putDevice(byAddress, device, true);
                    }
                }
                discoverNearby(adapter, byAddress);
                List<JSObject> ranked = new ArrayList<>(byAddress.values());
                ranked.sort((a, b) -> Integer.compare(
                    deviceRank(jsKind(b)),
                    deviceRank(jsKind(a))
                ));
                JSArray devices = new JSArray();
                for (JSObject row : ranked) devices.put(row);
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
                call.reject(
                    e.getMessage() != null ? e.getMessage() : "Принтертэй холбогдсонгүй"
                );
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
        if (Build.VERSION.SDK_INT >= 18
            && device.getType() == BluetoothDevice.DEVICE_TYPE_LE) {
            throw new IOException(
                "Энэ төхөөрөмж BLE. 58мм Classic Bluetooth принтер сонгоно уу."
            );
        }
        try {
            adapter.cancelDiscovery();
        } catch (Exception ignored) {}
        Thread.sleep(250);
        ensureBonded(device);
        Exception last = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            if (attempt > 0) Thread.sleep(400);
            for (UUID uuid : sppUuids(device)) {
                last = tryConnect(device, uuid, true);
                if (last == null) return;
                last = tryConnect(device, uuid, false);
                if (last == null) return;
            }
            last = tryHiddenChannels(device);
            if (last == null) return;
        }
        String detail = last != null && last.getMessage() != null
            ? last.getMessage()
            : "";
        throw new IOException(
            "Принтертэй холбогдсонгүй"
                + (detail.isEmpty() ? "" : ": " + detail)
                + ". Утасны Bluetooth-аас салгах/холбоод дахин оролдоно уу."
        );
    }

    @SuppressLint("MissingPermission")
    private Exception tryConnect(BluetoothDevice device, UUID uuid, boolean insecure) {
        BluetoothSocket next = null;
        try {
            next = insecure
                ? device.createInsecureRfcommSocketToServiceRecord(uuid)
                : device.createRfcommSocketToServiceRecord(uuid);
            next.connect();
            socket = next;
            output = next.getOutputStream();
            connectedAddress = device.getAddress();
            return null;
        } catch (Exception e) {
            closeQuietly(next);
            return e;
        }
    }

    @SuppressLint("MissingPermission")
    private Exception tryHiddenChannels(BluetoothDevice device) {
        Exception last = null;
        try {
            Method method = device.getClass().getMethod("createRfcommSocket", int.class);
            for (int channel = 1; channel <= 5; channel++) {
                BluetoothSocket next = null;
                try {
                    next = (BluetoothSocket) method.invoke(device, channel);
                    if (next == null) continue;
                    next.connect();
                    socket = next;
                    output = next.getOutputStream();
                    connectedAddress = device.getAddress();
                    return null;
                } catch (Exception e) {
                    last = e;
                    closeQuietly(next);
                }
            }
        } catch (Exception e) {
            last = e;
        }
        return last;
    }

    @SuppressLint("MissingPermission")
    private UUID[] sppUuids(BluetoothDevice device) {
        LinkedHashSet<UUID> out = new LinkedHashSet<>();
        out.add(SPP_UUID);
        ParcelUuid[] extras = device.getUuids();
        if (extras == null || extras.length == 0) {
            try {
                device.fetchUuidsWithSdp();
                Thread.sleep(900);
                extras = device.getUuids();
            } catch (Exception ignored) {}
        }
        if (extras != null) {
            for (ParcelUuid parcel : extras) {
                if (parcel != null && parcel.getUuid() != null) out.add(parcel.getUuid());
            }
        }
        return out.toArray(new UUID[0]);
    }

    @SuppressLint("MissingPermission")
    private void ensureBonded(BluetoothDevice device) {
        try {
            if (device.getBondState() == BluetoothDevice.BOND_BONDED) return;
            device.createBond();
            for (int i = 0; i < 24; i++) {
                Thread.sleep(250);
                if (device.getBondState() == BluetoothDevice.BOND_BONDED) return;
                if (device.getBondState() == BluetoothDevice.BOND_NONE && i > 8) return;
            }
        } catch (Exception ignored) {}
    }

    @SuppressLint("MissingPermission")
    private void discoverNearby(BluetoothAdapter adapter, Map<String, JSObject> byAddress) {
        Context ctx = getContext();
        if (ctx == null) return;
        if (Build.VERSION.SDK_INT >= 31
            && getPermissionState("btScan") != com.getcapacitor.PermissionState.GRANTED) {
            return;
        }
        CountDownLatch done = new CountDownLatch(1);
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent != null ? intent.getAction() : "";
                if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                    BluetoothDevice found =
                        intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    putDevice(byAddress, found, false);
                } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                    done.countDown();
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                ctx.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                ctx.registerReceiver(receiver, filter);
            }
            adapter.startDiscovery();
            if (!done.await(8, TimeUnit.SECONDS)) {
                try {
                    adapter.cancelDiscovery();
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {
        } finally {
            try {
                adapter.cancelDiscovery();
            } catch (Exception ignored) {}
            try {
                ctx.unregisterReceiver(receiver);
            } catch (Exception ignored) {}
        }
    }

    @SuppressLint("MissingPermission")
    private void putDevice(
        Map<String, JSObject> byAddress,
        BluetoothDevice device,
        boolean bonded
    ) {
        if (device == null) return;
        String address = device.getAddress();
        if (address == null || address.isEmpty()) return;
        JSObject row = byAddress.get(address);
        if (row == null) {
            row = new JSObject();
            row.put("address", address);
            byAddress.put(address, row);
        }
        String name = null;
        try {
            name = device.getName();
        } catch (Exception ignored) {}
        if (name != null && !name.isEmpty()) row.put("name", name);
        else if (!row.has("name")) row.put("name", address);
        row.put("kind", deviceKind(device));
        if (bonded) row.put("bonded", true);
    }

    @SuppressLint("MissingPermission")
    private String deviceKind(BluetoothDevice device) {
        try {
            if (Build.VERSION.SDK_INT >= 18
                && device.getType() == BluetoothDevice.DEVICE_TYPE_LE) {
                return "ble";
            }
        } catch (Exception ignored) {}
        BluetoothClass cls = device.getBluetoothClass();
        if (cls == null) return "other";
        int major = cls.getMajorDeviceClass();
        if (major == BluetoothClass.Device.Major.IMAGING
            || cls.hasService(BluetoothClass.Service.RENDERING)) {
            return "printer";
        }
        if (major == BluetoothClass.Device.Major.PHONE
            || major == BluetoothClass.Device.Major.COMPUTER) {
            return "phone";
        }
        if (major == BluetoothClass.Device.Major.AUDIO_VIDEO) return "audio";
        String name = "";
        try {
            name = String.valueOf(device.getName()).toLowerCase();
        } catch (Exception ignored) {}
        if (name.contains("print")
            || name.contains("pos")
            || name.contains("rpp")
            || name.contains("innerprinter")
            || name.contains("thermal")) {
            return "printer";
        }
        return "other";
    }

    private int deviceRank(String kind) {
        if ("printer".equals(kind)) return 3;
        if ("other".equals(kind)) return 2;
        if ("ble".equals(kind)) return 1;
        return 0;
    }

    private String jsKind(JSObject row) {
        if (row == null) return "";
        try {
            String kind = row.getString("kind");
            return kind != null ? kind : "";
        } catch (Exception e) {
            return "";
        }
    }

    private void closeQuietly(BluetoothSocket next) {
        if (next == null) return;
        try {
            next.close();
        } catch (Exception ignored) {}
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
