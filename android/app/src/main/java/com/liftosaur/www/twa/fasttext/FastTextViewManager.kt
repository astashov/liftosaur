package com.liftosaur.www.twa.fasttext

import android.content.Context
import android.graphics.Color
import com.facebook.react.bridge.ColorPropConverter
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.FastTextManagerDelegate
import com.facebook.react.viewmanagers.FastTextManagerInterface
import com.facebook.yoga.YogaMeasureMode
import com.facebook.yoga.YogaMeasureOutput
import kotlin.math.ceil

@ReactModule(name = FastTextViewManager.NAME)
class FastTextViewManager : SimpleViewManager<FastTextView>(), FastTextManagerInterface<FastTextView> {

  private val delegate = FastTextManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<FastTextView> = delegate

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): FastTextView = FastTextView(context)

  private fun density(context: Context): Float = context.resources.displayMetrics.density

  override fun setText(view: FastTextView, value: String?) {
    view.spec = view.spec.copy(text = value ?: "")
  }

  override fun setColor(view: FastTextView, value: Int?) {
    view.spec = view.spec.copy(color = value ?: Color.BLACK)
  }

  override fun setBackgroundColor(view: FastTextView, value: Int?) {
    view.spec = view.spec.copy(backgroundColor = value)
  }

  override fun setFontWeight(view: FastTextView, value: String?) {
    view.spec = view.spec.copy(weight = value?.toIntOrNull() ?: 400)
  }

  override fun setFontStyle(view: FastTextView, value: String?) {
    view.spec = view.spec.copy(italic = parseItalic(value) ?: false)
  }

  override fun setFontFamily(view: FastTextView, value: String?) {
    view.spec = view.spec.copy(fontFamily = value?.takeIf { it.isNotEmpty() })
  }

  override fun setFontSize(view: FastTextView, value: Float) {
    val d = density(view.context)
    view.spec = view.spec.copy(fontSizePx = if (value > 0f) value * d else FastTextSpec.DEFAULT_FONT_SIZE_DP * d)
  }

  override fun setTextPaddingHorizontal(view: FastTextView, value: Float) {
    view.spec = view.spec.copy(paddingHorizontalPx = value * density(view.context))
  }

  override fun setTextLineHeight(view: FastTextView, value: Float) {
    view.spec = view.spec.copy(lineHeightPx = value * density(view.context))
  }

  override fun setNumberOfLines(view: FastTextView, value: Int) {
    view.spec = view.spec.copy(maxLines = maxOf(value, 0))
  }

  override fun setTextAlign(view: FastTextView, value: String?) {
    view.spec = view.spec.copy(textAlign = value?.takeIf { it.isNotEmpty() })
  }

  override fun setTextDecorationLine(view: FastTextView, value: String?) {
    view.spec = view.spec.copy(decoration = value?.takeIf { it.isNotEmpty() })
  }

  override fun setFragments(view: FastTextView, value: ReadableArray?) {
    view.spec = view.spec.copy(fragments = parseFragments(value, density(view.context), view.context))
  }

  override fun measure(
    context: Context,
    localData: ReadableMap?,
    props: ReadableMap?,
    state: ReadableMap?,
    width: Float,
    widthMode: YogaMeasureMode,
    height: Float,
    heightMode: YogaMeasureMode,
    attachmentsPositions: FloatArray?,
  ): Long {
    val d = density(context)
    val spec = specForMeasure(context, props, d)
    val padPx = spec.paddingHorizontalPx
    // Build the layout at the actual available content width (mirroring what the view does)
    // and read the real line width — getLineWidth on an unbounded layout overestimates the
    // trailing advance, which shows up as extra right padding. Yoga constraints are device px;
    // the returned size must be points (Fabric multiplies back by density).
    val boundPx = if (widthMode == YogaMeasureMode.UNDEFINED) 100000 else width.toInt()
    val contentBoundPx = maxOf(boundPx - 2 * padPx.toInt(), 0)
    val layout = FastTextLayoutBuilder.layout(context, spec, contentBoundPx)
    var lineWidthPx = 0f
    for (i in 0 until layout.lineCount) {
      lineWidthPx = maxOf(lineWidthPx, layout.getLineWidth(i))
    }
    val contentWidthPx = if (widthMode == YogaMeasureMode.EXACTLY) contentBoundPx else ceil(lineWidthPx).toInt()
    val totalWidthPx = if (widthMode == YogaMeasureMode.EXACTLY) width.toFloat() else (contentWidthPx + 2 * padPx)
    return YogaMeasureOutput.make(totalWidthPx / d, layout.height.toFloat() / d)
  }

  private fun specForMeasure(context: Context, props: ReadableMap?, d: Float): FastTextSpec {
    val text = props?.getString("text") ?: ""
    val fontSizeRaw = readFloat(props, "fontSize", FastTextSpec.DEFAULT_FONT_SIZE_DP)
    val fontSizePx = (if (fontSizeRaw > 0f) fontSizeRaw else FastTextSpec.DEFAULT_FONT_SIZE_DP) * d
    val weight = props?.getString("fontWeight")?.toIntOrNull() ?: 400
    val italic = parseItalic(props?.getString("fontStyle")) ?: false
    val fontFamily = props?.getString("fontFamily")?.takeIf { it.isNotEmpty() }
    val paddingHorizontalPx = readFloat(props, "textPaddingHorizontal", 0f) * d
    val lineHeightPx = readFloat(props, "textLineHeight", 0f) * d
    val maxLines = if (props != null && props.hasKey("numberOfLines") && !props.isNull("numberOfLines")) maxOf(props.getInt("numberOfLines"), 0) else 0
    val textAlign = props?.getString("textAlign")?.takeIf { it.isNotEmpty() }
    val decoration = props?.getString("textDecorationLine")?.takeIf { it.isNotEmpty() }
    val fragments =
      if (props?.hasKey("fragments") == true) parseFragments(props.getArray("fragments"), d, context) else emptyList()
    return FastTextSpec(text, Color.BLACK, null, weight, italic, fontFamily, fontSizePx, paddingHorizontalPx, lineHeightPx, maxLines, textAlign, decoration, fragments)
  }

  private fun parseFragments(arr: ReadableArray?, d: Float, context: Context): List<FastTextFragment> {
    if (arr == null) {
      return emptyList()
    }
    val out = ArrayList<FastTextFragment>(arr.size())
    for (i in 0 until arr.size()) {
      val m = arr.getMap(i) ?: continue
      out.add(
        FastTextFragment(
          start = if (m.hasKey("start")) m.getInt("start") else 0,
          end = if (m.hasKey("end")) m.getInt("end") else 0,
          color = readColor(m, "color", context),
          backgroundColor = readColor(m, "backgroundColor", context),
          // Codegen populates non-nullable Float/string with 0.0 / "" when unset, so
          // treat zero size and empty weight/style as "inherit base" (null).
          weight = if (m.hasKey("fontWeight") && !m.isNull("fontWeight")) m.getString("fontWeight")?.toIntOrNull() else null,
          fontSizePx = if (m.hasKey("fontSize") && !m.isNull("fontSize") && m.getDouble("fontSize") > 0.0) (m.getDouble("fontSize").toFloat() * d) else null,
          italic = parseItalic(if (m.hasKey("fontStyle") && !m.isNull("fontStyle")) m.getString("fontStyle") else null),
          decoration = if (m.hasKey("textDecorationLine") && !m.isNull("textDecorationLine")) m.getString("textDecorationLine")?.takeIf { it.isNotEmpty() } else null,
        )
      )
    }
    return out
  }

  private fun parseItalic(style: String?): Boolean? =
    when (style) {
      "italic" -> true
      "normal" -> false
      else -> null
    }

  // Fragment colors arrive as the raw CSS string (unlike top-level Color props, which the
  // codegen pipeline pre-converts to ints); platform-color maps still go via ColorPropConverter.
  private fun readColor(m: ReadableMap, key: String, context: Context): Int? {
    if (!m.hasKey(key) || m.isNull(key)) {
      return null
    }
    return when (m.getType(key)) {
      ReadableType.Number -> m.getInt(key)
      ReadableType.String -> parseCssColor(m.getString(key))
      ReadableType.Map -> ColorPropConverter.getColor(m.getMap(key), context)
      else -> null
    }
  }

  // android.graphics.Color.parseColor handles #RRGGBB and #AARRGGBB but not CSS #RGB or
  // #RRGGBBAA (alpha-last), so normalize those here.
  private fun parseCssColor(value: String?): Int? {
    val v = value?.trim() ?: return null
    if (v.equals("transparent", ignoreCase = true)) {
      return Color.TRANSPARENT
    }
    if (v.startsWith("#")) {
      val hex = v.substring(1)
      val normalized =
        when (hex.length) {
          3 -> "#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}"
          6 -> v
          8 -> "#${hex.substring(6, 8)}${hex.substring(0, 6)}"
          else -> return null
        }
      return try {
        Color.parseColor(normalized)
      } catch (e: IllegalArgumentException) {
        null
      }
    }
    return try {
      Color.parseColor(v)
    } catch (e: IllegalArgumentException) {
      null
    }
  }

  private fun readFloat(m: ReadableMap?, key: String, fallback: Float): Float =
    if (m != null && m.hasKey(key) && !m.isNull(key)) m.getDouble(key).toFloat() else fallback

  companion object {
    const val NAME = "FastText"
  }
}
