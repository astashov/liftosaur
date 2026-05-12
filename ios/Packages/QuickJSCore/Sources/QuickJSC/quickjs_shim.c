#include "include/quickjs.h"

// Wrappers for static inline functions that Swift can't call directly

int qjs_is_null(JSValue v) {
    return JS_IsNull(v);
}

int qjs_is_undefined(JSValue v) {
    return JS_IsUndefined(v);
}

int qjs_is_exception(JSValue v) {
    return JS_IsException(v);
}

void qjs_free_value(JSContext *ctx, JSValue v) {
    JS_FreeValue(ctx, v);
}

JSValue qjs_dup_value(JSContext *ctx, JSValue v) {
    return JS_DupValue(ctx, v);
}

const char *qjs_to_cstring(JSContext *ctx, JSValue val) {
    return JS_ToCString(ctx, val);
}
