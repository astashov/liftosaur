#ifndef QUICKJS_SHIM_H
#define QUICKJS_SHIM_H

#include "quickjs.h"

int qjs_is_null(JSValue v);
int qjs_is_undefined(JSValue v);
int qjs_is_exception(JSValue v);
void qjs_free_value(JSContext *ctx, JSValue v);
JSValue qjs_dup_value(JSContext *ctx, JSValue v);
const char *qjs_to_cstring(JSContext *ctx, JSValue val);

#endif
