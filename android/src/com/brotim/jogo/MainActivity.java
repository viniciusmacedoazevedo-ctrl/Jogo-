package com.brotim.jogo;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.lang.reflect.Method;

/**
 * Tela única do app: um WebView em tela cheia (horizontal) que carrega
 * o jogo embutido em assets/game/. Funciona sem internet.
 */
public class MainActivity extends Activity {
    // SYSTEM_UI_FLAG_* (API 19+): esconde barras e mantém o modo imersivo
    private static final int IMMERSIVE_FLAGS =
            0x00000100 /* LAYOUT_STABLE */ | 0x00000200 /* LAYOUT_HIDE_NAVIGATION */
            | 0x00000400 /* LAYOUT_FULLSCREEN */ | 0x00000002 /* HIDE_NAVIGATION */
            | 0x00000004 /* FULLSCREEN */ | 0x00001000 /* IMMERSIVE_STICKY */;

    private WebView web;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFF15122B);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);      // LocalStorage (progresso salvo)
        s.setDatabaseEnabled(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        callIfExists(s, "setMediaPlaybackRequiresUserGesture", false); // API 17+
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);
        web.loadUrl("file:///android_asset/game/index.html");
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) getWindow().getDecorView().setSystemUiVisibility(IMMERSIVE_FLAGS);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) {
            // pausa a partida antes de congelar o WebView
            web.loadUrl("javascript:(function(){try{if(BROTIM.Game.state==='playing')BROTIM.Game.togglePause();}catch(e){}})()");
            web.onPause();
            web.pauseTimers();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.resumeTimers();
            web.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    /** Voltar: jogando = pausa; pausado = continua; nas telas = volta ao menu; no menu = sai. */
    @Override
    public void onBackPressed() {
        String js = "(function(){try{var G=BROTIM.Game,U=BROTIM.UI;"
                + "if(G.state==='playing'){G.togglePause();return 'ok';}"
                + "if(G.state==='paused'){G.resume();return 'ok';}"
                + "if(U.current&&U.current!=='menu'){G.toMenu();return 'ok';}"
                + "return 'exit';}catch(e){return 'exit';}})()";
        try {
            Method m = WebView.class.getMethod("evaluateJavascript", String.class, ValueCallback.class); // API 19+
            m.invoke(web, js, new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if (value == null || value.contains("exit")) finish();
                }
            });
        } catch (Exception e) {
            finish();
        }
    }

    private static void callIfExists(Object target, String method, boolean value) {
        try {
            target.getClass().getMethod(method, boolean.class).invoke(target, value);
        } catch (Exception ignored) {
            // método não existe nesta versão do Android
        }
    }
}
