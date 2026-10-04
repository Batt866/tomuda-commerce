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
import java.nio.charset.StandardCharsets;
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

import org.json.JSONArray;

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
        ),
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_FINE_LOCATION }
        )
    }
)
public class BluetoothPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID =
        UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final String M58_MAC = "66:32:C0:82:F5:EA";

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private BluetoothSocket socket;
    private OutputStream output;
    private String connectedAddress = "";
    private BroadcastReceiver pinReceiver;
    private boolean pinReceiverRegistered = false;

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
        requestPermissionForAliases(
            new String[] { "btLegacy", "location" },
            call,
            "onBtPermission"
        );
    }

    @PermissionCallback
    private void onBtPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted =
            Build.VERSION.SDK_INT < 31
                || getPermissionState("btConnect")
                    == com.getcapacitor.PermissionState.GRANTED;
        ret.put("granted", granted);
        if (granted) call.resolve(ret);
        else call.reject("Bluetooth эрх олгогдоогүй. Тохиргооноос Томуда-д Nearby devices зөвшөөрнө үү.");
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void listDevices(PluginCall call) {
        boolean nearby = Boolean.TRUE.equals(call.getBoolean("nearby", false));
        io.execute(() -> {
            try {
                BluetoothAdapter adapter = adapter();
                if (adapter == null) {
                    rejectOnMain(call, "Bluetooth дэмжихгүй");
                    return;
                }
                if (!adapter.isEnabled()) {
                    rejectOnMain(call, "Bluetooth унтраалттай байна. Асаагаад дахин оролдоно уу.");
                    return;
                }
                ensurePinReceiver();
                Map<String, JSObject> byAddress =
                    java.util.Collections.synchronizedMap(new LinkedHashMap<>());
                collectPairedDevices(adapter, byAddress);
                injectPreferredPrinter(adapter, byAddress);
                if (nearby) {
                    discoverNearby(adapter, byAddress);
                    collectPairedDevices(adapter, byAddress);
                    injectPreferredPrinter(adapter, byAddress);
                }
                resolveDevicesOnMain(call, byAddress);
            } catch (SecurityException e) {
                rejectOnMain(
                    call,
                    "Bluetooth эрх олгогдоогүй. Тохиргооноос Томуда-д Nearby devices зөвшөөрнө үү."
                );
            } catch (Exception e) {
                rejectOnMain(
                    call,
                    e.getMessage() != null ? e.getMessage() : "Принтер олдсонгүй"
                );
            }
        });
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address", M58_MAC);
        if (address == null || address.isEmpty()) address = M58_MAC;
        final String mac = formatMac(address);
        io.execute(() -> {
            try {
                ensurePinReceiver();
                openSocket(mac);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("address", mac);
                resolveOnMain(call, ret);
            } catch (Exception e) {
                rejectOnMain(
                    call,
                    e.getMessage() != null ? e.getMessage() : "Принтертэй холбогдсонгүй"
                );
            }
        });
    }

    @PluginMethod
    public void write(PluginCall call) {
        String address = call.getString("address", connectedAddress);
        if (address == null || address.isEmpty()) address = M58_MAC;
        final String mac = formatMac(address);
        String data = call.getString("data", "");
        if (data == null || data.isEmpty()) {
            rejectOnMain(call, "Хэвлэх өгөгдөл хоосон");
            return;
        }
        io.execute(() -> {
            try {
                writeBytes(mac, Base64.decode(data, Base64.DEFAULT));
                JSObject ret = new JSObject();
                ret.put("ok", true);
                resolveOnMain(call, ret);
            } catch (Exception e) {
                closeSocket();
                rejectOnMain(
                    call,
                    e.getMessage() != null ? e.getMessage() : "Хэвлэж чадсангүй"
                );
            }
        });
    }

    @PluginMethod
    public void print(PluginCall call) {
        String address = call.getString("address", M58_MAC);
        if (address == null || address.isEmpty()) address = M58_MAC;
        final String mac = formatMac(address);
        String data = call.getString("data", "");
        if (data == null || data.isEmpty()) {
            rejectOnMain(call, "Хэвлэх өгөгдөл хоосон");
            return;
        }
        byte[] bytes = Base64.decode(data, Base64.DEFAULT);
        io.execute(() -> {
            try {
                ensurePinReceiver();
                writeBytes(mac, bytes);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("address", mac);
                resolveOnMain(call, ret);
            } catch (Exception e) {
                closeSocket();
                rejectOnMain(
                    call,
                    e.getMessage() != null ? e.getMessage() : "Хэвлэж чадсангүй"
                );
            }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        io.execute(() -> {
            closeSocket();
            JSObject ret = new JSObject();
            ret.put("ok", true);
            resolveOnMain(call, ret);
        });
    }

    private void writeBytes(String address, byte[] bytes) throws Exception {
        if (output == null || socket == null || !socket.isConnected()
            || address == null || !address.equalsIgnoreCase(connectedAddress)) {
            openSocket(address);
        }
        int offset = 0;
        while (offset < bytes.length) {
            int chunk = Math.min(1024, bytes.length - offset);
            output.write(bytes, offset, chunk);
            output.flush();
            offset += chunk;
            if (offset < bytes.length) Thread.sleep(20);
        }
    }

    @SuppressLint("MissingPermission")
    private void openSocket(String address) throws Exception {
        String mac = formatMac(address);
        if (socket != null && socket.isConnected() && mac.equalsIgnoreCase(connectedAddress)) {
            return;
        }
        closeSocket();
        BluetoothAdapter adapter = adapter();
        if (adapter == null) throw new IOException("Bluetooth дэмжихгүй");
        if (!adapter.isEnabled()) throw new IOException("Bluetooth унтраалттай байна");
        if (!BluetoothAdapter.checkBluetoothAddress(mac)) {
            throw new IOException("Принтерийн хаяг буруу");
        }
        BluetoothDevice device = adapter.getRemoteDevice(mac);
        try {
            adapter.cancelDiscovery();
        } catch (Exception ignored) {}
        Thread.sleep(200);
        Exception last = tryPreferredConnect(device);
        if (last == null) return;
        if (device.getBondState() != BluetoothDevice.BOND_BONDED) {
            ensureBonded(device);
            try {
                adapter.cancelDiscovery();
            } catch (Exception ignored) {}
            Thread.sleep(200);
            last = tryPreferredConnect(device);
            if (last == null) return;
        }
        String detail = last.getMessage() != null ? last.getMessage() : "";
        throw new IOException(
            "M58-L принтертэй холбогдсонгүй"
                + (detail.isEmpty() ? "" : ": " + detail)
                + ". Принтерээ асаагаад Bluetooth-ыг ойртуулна уу."
        );
    }

    @SuppressLint("MissingPermission")
    private Exception tryPreferredConnect(BluetoothDevice device) {
        Exception last = tryInsecureChannel(device, 1);
        if (last == null) return null;
        last = tryHiddenChannel(device, 1);
        if (last == null) return null;
        last = tryConnect(device, SPP_UUID, true);
        if (last == null) return null;
        last = tryConnect(device, SPP_UUID, false);
        if (last == null) return null;
        last = tryHiddenChannels(device);
        if (last == null) return null;
        last = tryInsecureChannel(device, 2);
        if (last == null) return null;
        return last;
    }

    private String formatMac(String address) {
        String hex = normalizeBtAddress(address);
        if (hex.length() != 12) {
            return address == null || address.isEmpty() ? M58_MAC : address;
        }
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < 12; i += 2) {
            if (i > 0) out.append(':');
            out.append(hex, i, i + 2);
        }
        return out.toString();
    }

    private void resolveOnMain(PluginCall call, JSObject ret) {
        runOnMain(() -> call.resolve(ret));
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
    private Exception tryInsecureChannel(BluetoothDevice device, int channel) {
        BluetoothSocket next = null;
        try {
            Method method =
                device.getClass().getMethod("createInsecureRfcommSocket", int.class);
            next = (BluetoothSocket) method.invoke(device, channel);
            if (next == null) return new IOException("RFCOMM socket null");
            next.connect();
            socket = next;
            output = next.getOutputStream();
            connectedAddress = device.getAddress();
            return null;
        } catch (NoSuchMethodException missing) {
            return tryHiddenChannel(device, channel);
        } catch (Exception e) {
            closeQuietly(next);
            return e;
        }
    }

    @SuppressLint("MissingPermission")
    private Exception tryHiddenChannel(BluetoothDevice device, int channel) {
        BluetoothSocket next = null;
        try {
            Method method = device.getClass().getMethod("createRfcommSocket", int.class);
            next = (BluetoothSocket) method.invoke(device, channel);
            if (next == null) return new IOException("RFCOMM socket null");
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
        for (int channel = 1; channel <= 5; channel++) {
            last = tryHiddenChannel(device, channel);
            if (last == null) return null;
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

    private void runOnMain(Runnable action) {
        android.app.Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(action);
        } else {
            action.run();
        }
    }

    private void rejectOnMain(PluginCall call, String message) {
        runOnMain(() -> call.reject(message));
    }

    @SuppressLint("MissingPermission")
    private void collectPairedDevices(
        BluetoothAdapter adapter,
        Map<String, JSObject> byAddress
    ) {
        Set<BluetoothDevice> bonded = adapter.getBondedDevices();
        if (bonded == null) return;
        for (BluetoothDevice device : bonded) {
            putDevice(byAddress, device, true);
        }
    }

    @SuppressLint("MissingPermission")
    private void injectPreferredPrinter(
        BluetoothAdapter adapter,
        Map<String, JSObject> byAddress
    ) {
        try {
            BluetoothDevice preferred = adapter.getRemoteDevice(M58_MAC);
            boolean bonded = false;
            Set<BluetoothDevice> devices = adapter.getBondedDevices();
            if (devices != null) {
                for (BluetoothDevice device : devices) {
                    if (isPreferredMac(device.getAddress())) {
                        bonded = true;
                        break;
                    }
                }
            }
            putDevice(byAddress, preferred, bonded);
        } catch (Exception ignored) {}
    }

    private void resolveDevicesOnMain(
        PluginCall call,
        Map<String, JSObject> byAddress
    ) {
        List<JSObject> ranked = new ArrayList<>(byAddress.values());
        ranked.sort((a, b) -> Integer.compare(deviceScore(b), deviceScore(a)));
        JSArray devices = new JSArray();
        JSONArray json = new JSONArray();
        for (JSObject row : ranked) {
            devices.put(row);
            json.put(row);
        }
        JSObject ret = new JSObject();
        ret.put("devices", devices);
        ret.put("devicesJson", json.toString());
        runOnMain(() -> call.resolve(ret));
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
        if (isZijiangName(name) || isPreferredMac(address)) {
            row.put("kind", "printer");
            row.put("model", "M58-L");
            if (name == null || name.isEmpty()) row.put("name", "BlueTooth Printer");
        } else {
            row.put("kind", deviceKind(device));
        }
        if (bonded) row.put("bonded", true);
    }

    @SuppressLint("MissingPermission")
    private String deviceKind(BluetoothDevice device) {
        String name = "";
        try {
            name = String.valueOf(device.getName()).toLowerCase();
        } catch (Exception ignored) {}
        if (name.contains("print")
            || name.contains("pos")
            || name.contains("rpp")
            || name.contains("innerprinter")
            || name.contains("thermal")
            || name.contains("zj-")
            || name.contains("zj58")
            || name.contains("5809")
            || name.contains("xp-")
            || name.contains("m58")
            || name.contains("bluetoothprinter")) {
            return "printer";
        }
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
        return "other";
    }

    private int deviceScore(JSObject row) {
        String name = "";
        try {
            name = row.getString("name");
        } catch (Exception ignored) {}
        if (isPreferredMac(jsAddr(row)) || isZijiangName(name)) return 50;
        String kind = jsKind(row);
        if ("printer".equals(kind)) return 30;
        if ("other".equals(kind)) return 10;
        if ("ble".equals(kind)) return 5;
        return 0;
    }

    @SuppressLint("MissingPermission")
    private String deviceName(BluetoothDevice device) {
        try {
            String name = device.getName();
            return name != null ? name : "";
        } catch (Exception e) {
            return "";
        }
    }

    private boolean isZijiangName(String name) {
        String n = String.valueOf(name == null ? "" : name).toLowerCase().trim();
        return n.contains("bluetooth printer")
            || n.contains("bluetoothprinter")
            || n.contains("innerprinter")
            || n.contains("inner printer")
            || n.contains("m58-l")
            || n.contains("m58.l")
            || n.contains("m58")
            || n.contains("zj-5809")
            || n.contains("zj5809")
            || n.contains("5809")
            || n.contains("zj-58")
            || n.contains("mini thermal")
            || n.equals("printer")
            || n.startsWith("printer_");
    }

    private String jsAddr(JSObject row) {
        if (row == null) return "";
        try {
            String address = row.getString("address");
            return address != null ? address : "";
        } catch (Exception e) {
            return "";
        }
    }

    private boolean isPreferredMac(String address) {
        return normalizeBtAddress(address).equals(normalizeBtAddress(M58_MAC));
    }

    private String normalizeBtAddress(String address) {
        return String.valueOf(address == null ? "" : address)
            .replaceAll("[^0-9A-Fa-f]", "")
            .toUpperCase();
    }

    private void ensurePinReceiver() {
        if (pinReceiverRegistered) return;
        Context ctx = getContext();
        if (ctx == null) return;
        pinReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null
                    || !BluetoothDevice.ACTION_PAIRING_REQUEST.equals(intent.getAction())) {
                    return;
                }
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (device == null) return;
                String name = deviceName(device);
                if (!isZijiangName(name)
                    && !isPreferredMac(device.getAddress())
                    && !"printer".equals(deviceKind(device))) return;
                try {
                    byte[] pin1234 = "1234".getBytes(StandardCharsets.UTF_8);
                    device.setPin(pin1234);
                    abortBroadcast();
                } catch (Exception first) {
                    try {
                        device.setPin("0000".getBytes(StandardCharsets.UTF_8));
                        abortBroadcast();
                    } catch (Exception ignored) {}
                }
            }
        };
        IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_PAIRING_REQUEST);
        filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                ctx.registerReceiver(pinReceiver, filter, Context.RECEIVER_EXPORTED);
            } else {
                ctx.registerReceiver(pinReceiver, filter);
            }
            pinReceiverRegistered = true;
        } catch (Exception ignored) {}
    }

    @SuppressLint("MissingPermission")
    private void discoverNearby(BluetoothAdapter adapter, Map<String, JSObject> byAddress) {
        Context ctx = getContext();
        if (ctx == null) return;
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
            try {
                adapter.cancelDiscovery();
            } catch (Exception ignored) {}
            boolean started = false;
            try {
                started = adapter.startDiscovery();
            } catch (Exception ignored) {}
            if (!started) {
                done.countDown();
            } else if (!done.await(8, TimeUnit.SECONDS)) {
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
        Context ctx = getContext();
        if (pinReceiverRegistered && ctx != null && pinReceiver != null) {
            try {
                ctx.unregisterReceiver(pinReceiver);
            } catch (Exception ignored) {}
            pinReceiverRegistered = false;
        }
        io.shutdownNow();
        super.handleOnDestroy();
    }
}
