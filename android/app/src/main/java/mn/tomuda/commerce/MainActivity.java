package mn.tomuda.commerce;

import android.os.Bundle;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        enableWebViewGeolocation();
    }

    private void enableWebViewGeolocation() {
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) return;
        bridge.getWebView().getSettings().setGeolocationEnabled(true);
        bridge.getWebView().getSettings().setGeolocationDatabasePath(getFilesDir().getPath());
    }
}
