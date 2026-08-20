package com.devois.devapp;

import android.os.Bundle;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // A renderer crash tears down the hosting process unless it is handled here,
        // which showed up as the app closing on interaction. Detach the dead WebView
        // and reload the bridge instead of letting the process die.
        bridge.addWebViewListener(
            new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                    if (webView.getParent() instanceof FrameLayout) {
                        ((FrameLayout) webView.getParent()).removeView(webView);
                    }
                    webView.destroy();
                    recreate();
                    return true;
                }
            }
        );
    }
}
