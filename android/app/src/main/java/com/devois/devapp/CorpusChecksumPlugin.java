package com.devois.devapp;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "CorpusChecksum")
public class CorpusChecksumPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void sha256(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("Corpus file path is required.");
            return;
        }

        call.setKeepAlive(true);
        worker.execute(() -> {
            try {
                File file = new File(path).getCanonicalFile();
                String privateDirectory = new File(getContext().getApplicationInfo().dataDir).getCanonicalPath();
                if (!file.getPath().startsWith(privateDirectory + File.separator)) {
                    throw new IOException("Corpus file must be in app-private storage.");
                }
                String hash = CorpusChecksum.sha256(file, completedBytes -> {
                    JSObject progress = new JSObject();
                    progress.put("completedBytes", completedBytes);
                    call.resolve(progress);
                });
                JSObject result = new JSObject();
                result.put("sha256", hash);
                call.setKeepAlive(false);
                call.resolve(result);
            } catch (Exception error) {
                call.setKeepAlive(false);
                call.reject("Corpus file verification failed: " + error.getMessage(), error);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        worker.shutdownNow();
        super.handleOnDestroy();
    }
}