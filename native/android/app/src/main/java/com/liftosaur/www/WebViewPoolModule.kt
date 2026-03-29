package com.liftosaur.www

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.JavascriptInterface
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

private const val TAG = "WebViewPool"

private class WebViewSlot(val id: Int, val webView: WebView) {
    var status: String = "loading" // "loading", "idle", "acquired"
}

class WebViewPoolModule(private val reactContext: ReactApplicationContext) :
    NativeWebViewPoolSpec(reactContext) {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val slots = mutableListOf<WebViewSlot>()
    private val acquireWaiters = mutableListOf<(Int) -> Unit>()

    private fun sendEvent(slotId: Int, data: String) {
        val params = Arguments.createMap().apply {
            putInt("slotId", slotId)
            putString("data", data)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onWebViewMessage", params)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun setup(url: String, poolSize: Double) {
        mainHandler.post {
            if (slots.isNotEmpty()) return@post

            for (i in 0 until poolSize.toInt()) {
                val webView = WebView(reactContext).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true

                    addJavascriptInterface(object {
                        @JavascriptInterface
                        fun postMessage(data: String) {
                            sendEvent(i, data)
                        }
                    }, "liftosaurBridge")

                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean = false

                        override fun onPageFinished(view: WebView?, loadUrl: String?) {
                            handleLoadEnd(view)
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onJsAlert(
                            view: WebView?, url: String?, message: String?, result: JsResult?
                        ): Boolean {
                            val activity = reactApplicationContext.currentActivity ?: run {
                                result?.cancel()
                                return true
                            }
                            AlertDialog.Builder(activity)
                                .setMessage(message)
                                .setPositiveButton("OK") { _, _ -> result?.confirm() }
                                .setOnCancelListener { result?.cancel() }
                                .show()
                            return true
                        }

                        override fun onJsConfirm(
                            view: WebView?, url: String?, message: String?, result: JsResult?
                        ): Boolean {
                            val activity = reactApplicationContext.currentActivity ?: run {
                                result?.cancel()
                                return true
                            }
                            AlertDialog.Builder(activity)
                                .setMessage(message)
                                .setPositiveButton("OK") { _, _ -> result?.confirm() }
                                .setNegativeButton("Cancel") { _, _ -> result?.cancel() }
                                .setOnCancelListener { result?.cancel() }
                                .show()
                            return true
                        }

                        override fun onJsPrompt(
                            view: WebView?, url: String?, message: String?,
                            defaultValue: String?, result: JsPromptResult?
                        ): Boolean {
                            val activity = reactApplicationContext.currentActivity ?: run {
                                result?.cancel()
                                return true
                            }
                            val input = EditText(activity).apply { setText(defaultValue) }
                            AlertDialog.Builder(activity)
                                .setMessage(message)
                                .setView(input)
                                .setPositiveButton("OK") { _, _ -> result?.confirm(input.text.toString()) }
                                .setNegativeButton("Cancel") { _, _ -> result?.cancel() }
                                .setOnCancelListener { result?.cancel() }
                                .show()
                            return true
                        }
                    }

                    loadUrl("javascript:void(0)")
                    evaluateJavascript("""
                        window.ReactNativeWebView = {
                          postMessage: function(data) {
                            liftosaurBridge.postMessage(data);
                          }
                        };
                        (function() {
                          var levels = ['log', 'warn', 'error', 'info', 'debug'];
                          for (var i = 0; i < levels.length; i++) {
                            (function(level) {
                              var orig = console[level];
                              console[level] = function() {
                                orig.apply(console, arguments);
                                try {
                                  var args = Array.prototype.map.call(arguments, function(a) {
                                    return typeof a === 'object' ? JSON.stringify(a) : String(a);
                                  });
                                  liftosaurBridge.postMessage(
                                    JSON.stringify({ type: '__console', level: level, message: args.join(' ') })
                                  );
                                } catch(e) {}
                              };
                            })(levels[i]);
                          }
                        })();
                    """.trimIndent(), null)

                    loadUrl(url)
                }

                slots.add(WebViewSlot(i, webView))
                Log.i(TAG, "Created slot $i")
            }
        }
    }

    override fun acquire(promise: Promise) {
        mainHandler.post {
            val slot = slots.firstOrNull { it.status == "idle" }
            if (slot != null) {
                slot.status = "acquired"
                Log.i(TAG, "Acquired slot ${slot.id}")
                promise.resolve(slot.id)
            } else {
                Log.i(TAG, "No idle slots, queuing waiter")
                acquireWaiters.add { slotId -> promise.resolve(slotId) }
            }
        }
    }

    override fun attach(slotId: Double, targetNativeID: String, promise: Promise) {
        mainHandler.post {
            val slot = slots.firstOrNull { it.id == slotId.toInt() }
            if (slot == null) {
                promise.resolve(false)
                return@post
            }

            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                Log.e(TAG, "attach: no activity")
                promise.resolve(false)
                return@post
            }

            val rootView = activity.window.decorView.rootView
            val targetView = findViewByNativeId(targetNativeID, rootView)
            if (targetView == null) {
                Log.i(TAG, "attach: target view '$targetNativeID' not found")
                promise.resolve(false)
                return@post
            }

            (slot.webView.parent as? ViewGroup)?.removeView(slot.webView)
            slot.webView.layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            (targetView as ViewGroup).addView(slot.webView)
            Log.i(TAG, "Attached slot ${slotId.toInt()} to '$targetNativeID'")
            promise.resolve(true)
        }
    }

    override fun releaseSlot(slotId: Double) {
        mainHandler.post {
            val slot = slots.firstOrNull { it.id == slotId.toInt() } ?: return@post
            (slot.webView.parent as? ViewGroup)?.removeView(slot.webView)
            slot.status = "idle"
            Log.i(TAG, "Released slot ${slotId.toInt()}")
            notifyWaiters()
        }
    }

    override fun injectJavaScript(slotId: Double, js: String) {
        mainHandler.post {
            val slot = slots.firstOrNull { it.id == slotId.toInt() } ?: return@post
            slot.webView.evaluateJavascript(js, null)
        }
    }

    override fun addListener(eventName: String) {}
    override fun removeListeners(count: Double) {}

    private fun handleLoadEnd(webView: WebView?) {
        val slot = slots.firstOrNull { it.webView === webView } ?: return
        if (slot.status == "loading") {
            slot.status = "idle"
            Log.i(TAG, "Slot ${slot.id} loaded, now idle")
            notifyWaiters()
        }
    }

    private fun notifyWaiters() {
        while (acquireWaiters.isNotEmpty()) {
            val slot = slots.firstOrNull { it.status == "idle" } ?: break
            slot.status = "acquired"
            val waiter = acquireWaiters.removeFirst()
            Log.i(TAG, "Fulfilled waiter with slot ${slot.id}")
            waiter(slot.id)
        }
    }

    private fun findViewByNativeId(nativeId: String, view: View): View? {
        try {
            val method = view.javaClass.getMethod("getId")
            val tag = view.getTag(com.facebook.react.R.id.view_tag_native_id)
            if (tag is String && tag == nativeId) {
                return view
            }
        } catch (_: Exception) {}

        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                val found = findViewByNativeId(nativeId, view.getChildAt(i))
                if (found != null) return found
            }
        }
        return null
    }
}
