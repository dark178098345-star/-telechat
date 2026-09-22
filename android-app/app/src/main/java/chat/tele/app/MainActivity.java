package chat.tele.app;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.Build;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String TELECHAT_URL = "https://dark178098345-star.github.io/-telechat/?app=android&v=131";
    private static final String TELECHAT_HOST = "dark178098345-star.github.io";
    private static final String NOTIFICATION_CHANNEL = "telechat-messages";
    private static final int FILE_CHOOSER_REQUEST = 401;
    private static final int MICROPHONE_PERMISSION_REQUEST = 402;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 403;
    private static final int QR_SAVE_REQUEST = 404;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingAudioRequest;
    private byte[] pendingQrImage;
    private volatile boolean appInBackground = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(9, 10, 19));
        getWindow().setNavigationBarColor(Color.rgb(9, 10, 19));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(9, 10, 19));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);

        configureWebView();
        webView.addJavascriptInterface(new TelechatAndroidBridge(), "TelechatAndroid");
        createNotificationChannel();
        if (savedInstanceState == null) webView.loadUrl(TELECHAT_URL);
        else webView.restoreState(savedInstanceState);
    }

    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " telechat-android/1.2.5");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                if (isTelechatUri(Uri.parse(url))) publishVisibility();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isTelechatUri(uri)) return false;
                openExternal(uri);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent chooser = Intent.createChooser(params.createIntent(), "Выбери фото или видео");
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "Не удалось открыть галерею", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermission(request));
            }
            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingAudioRequest == request) pendingAudioRequest = null;
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            openExternal(Uri.parse(url));
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
                NOTIFICATION_CHANNEL, "Сообщения tele.chat", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Уведомления о новых сообщениях");
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    private void requestNotifications() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        } else {
            Toast.makeText(this, "Уведомления tele.chat включены", Toast.LENGTH_SHORT).show();
        }
    }

    private void notifyMessage(String title, String body) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        Intent intent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0));
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, NOTIFICATION_CHANNEL)
                : new Notification.Builder(this);
        builder.setSmallIcon(chat.tele.app.R.drawable.telechat_icon)
                .setContentTitle(title == null || title.isEmpty() ? "tele.chat" : title)
                .setContentText(body == null ? "" : body)
                .setAutoCancel(true).setContentIntent(pending).setPriority(Notification.PRIORITY_DEFAULT);
        getSystemService(NotificationManager.class).notify((int) (System.currentTimeMillis() & 0x7fffffff), builder.build());
    }

    private final class TelechatAndroidBridge {
        @JavascriptInterface public boolean isApp() { return true; }
        @JavascriptInterface public boolean isInBackground() { return appInBackground; }
        @JavascriptInterface public void requestNotifications() { runOnUiThread(MainActivity.this::requestNotifications); }
        @JavascriptInterface public void notify(String title, String body) { runOnUiThread(() -> notifyMessage(title, body)); }
        @JavascriptInterface public void saveQrImage(String data) {
            if (data == null || !data.startsWith("data:image/png;base64,") || data.length() > 3000000) return;
            runOnUiThread(() -> {
                if (pendingQrImage != null) return;
                try {
                    byte[] png = android.util.Base64.decode(data.substring(22), android.util.Base64.DEFAULT);
                    if (png.length < 8 || png[0] != (byte)137 || png[1] != 80 || png[2] != 78 || png[3] != 71) return;
                    pendingQrImage = png;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                            .setType("image/png").putExtra(Intent.EXTRA_TITLE, "telechat-qr.png");
                    startActivityForResult(intent, QR_SAVE_REQUEST);
                } catch (Exception error) { pendingQrImage = null; Toast.makeText(MainActivity.this, "Не удалось сохранить QR", Toast.LENGTH_SHORT).show(); }
            });
        }
    }

    private void handleWebPermission(PermissionRequest request) {
        if (!isTelechatUri(request.getOrigin()) || pendingAudioRequest != null) {
            request.deny();
            return;
        }
        java.util.ArrayList<String> missing = new java.util.ArrayList<>();
        java.util.ArrayList<String> allowed = new java.util.ArrayList<>();
        for (String resource : request.getResources()) {
            String permission = mediaPermission(resource);
            if (permission == null) continue;
            allowed.add(resource);
            if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) missing.add(permission);
        }
        if (allowed.isEmpty()) { request.deny(); return; }
        if (missing.isEmpty()) { request.grant(allowed.toArray(new String[0])); return; }
        pendingAudioRequest = request;
        requestPermissions(missing.toArray(new String[0]), MICROPHONE_PERMISSION_REQUEST);
    }

    private String mediaPermission(String resource) {
        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) return Manifest.permission.RECORD_AUDIO;
        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) return Manifest.permission.CAMERA;
        return null;
    }

    private boolean isTelechatUri(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme()) && TELECHAT_HOST.equalsIgnoreCase(uri.getHost());
    }

    private void openExternal(Uri uri) {
        if (uri == null) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "Не удалось открыть ссылку", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MICROPHONE_PERMISSION_REQUEST || pendingAudioRequest == null) return;
        java.util.ArrayList<String> allowed = new java.util.ArrayList<>();
        for (String resource : pendingAudioRequest.getResources()) {
            String permission = mediaPermission(resource);
            if (permission != null && checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED) allowed.add(resource);
        }
        if (!allowed.isEmpty()) pendingAudioRequest.grant(allowed.toArray(new String[0]));
        else pendingAudioRequest.deny();
        pendingAudioRequest = null;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == QR_SAVE_REQUEST) {
            byte[] png = pendingQrImage; pendingQrImage = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null && png != null) {
                try (java.io.OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out == null) throw new java.io.IOException("No output stream");
                    out.write(png); Toast.makeText(this, "QR сохранён", Toast.LENGTH_SHORT).show();
                } catch (Exception error) { Toast.makeText(this, "Не удалось сохранить QR", Toast.LENGTH_SHORT).show(); }
            }
            return;
        }
        if (requestCode != FILE_CHOOSER_REQUEST || fileCallback == null) return;
        fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        fileCallback = null;
    }

    @Override
    protected void onStart() {
        super.onStart();
        appInBackground = false;
        publishVisibility();
    }

    @Override
    protected void onStop() {
        appInBackground = true;
        publishVisibility();
        super.onStop();
    }

    private void publishVisibility() {
        if (webView == null) return;
        webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('telechat-native-visibility',{detail:{background:"
                        + appInBackground + "}}));", null);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
