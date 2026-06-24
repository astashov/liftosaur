package com.liftosaur.www.twa.fasttext

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.text.Layout
import android.text.SpannableString
import android.text.Spanned
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import android.text.style.AbsoluteSizeSpan
import android.text.style.BackgroundColorSpan
import android.text.style.ForegroundColorSpan
import android.text.style.LineHeightSpan
import android.text.style.MetricAffectingSpan
import android.text.style.StrikethroughSpan
import android.text.style.UnderlineSpan
import android.view.View
import com.facebook.react.common.assets.ReactFontManager

data class FastTextFragment(
  val start: Int,
  val end: Int,
  val color: Int?,
  val backgroundColor: Int?,
  val weight: Int?,
  val fontSizePx: Float?,
  val italic: Boolean?,
  val decoration: String?,
)

data class FastTextSpec(
  val text: String,
  val color: Int,
  val backgroundColor: Int?,
  val weight: Int,
  val italic: Boolean,
  val fontFamily: String?,
  val fontSizePx: Float,
  val paddingHorizontalPx: Float,
  val lineHeightPx: Float,
  val maxLines: Int,
  val textAlign: String?,
  val decoration: String?,
  val fragments: List<FastTextFragment>,
) {
  companion object {
    // App's BASE_REM / text-base (see useRem). Defensive default only — callers
    // always pass a resolved px via remToPx.
    const val DEFAULT_FONT_SIZE_DP = 16f
  }
}

private class TypefaceWeightSpan(private val typeface: Typeface) : MetricAffectingSpan() {
  override fun updateDrawState(tp: TextPaint) {
    tp.typeface = typeface
  }

  override fun updateMeasureState(tp: TextPaint) {
    tp.typeface = typeface
  }
}

// LineHeightSpan.Standard is API 29+; app minSdk is 26, so center the line within
// the target height manually.
private class AbsoluteLineHeightSpan(private val heightPx: Int) : LineHeightSpan {
  override fun chooseHeight(
    text: CharSequence?,
    start: Int,
    end: Int,
    spanstartv: Int,
    lineHeight: Int,
    fm: Paint.FontMetricsInt,
  ) {
    val original = fm.descent - fm.ascent
    if (original <= 0) {
      return
    }
    val extra = heightPx - original
    val half = extra / 2
    fm.ascent -= half
    fm.descent += extra - half
    fm.top = fm.ascent
    fm.bottom = fm.descent
  }
}

object FastTextLayoutBuilder {
  // The app's Poppins variants are separate font families keyed by file name (mirrors the
  // web Text primitive's resolveFontFamily); ReactFontManager with a numeric weight would
  // synthesize a faux weight off Poppins-Regular instead of loading Poppins-SemiBold/Bold.
  private fun fontFamily(weight: Int, italic: Boolean): String {
    val bold = weight >= 700
    val semibold = weight in 500..699
    return when {
      bold && italic -> "Poppins-BoldItalic"
      bold -> "Poppins-Bold"
      semibold && italic -> "Poppins-SemiBoldItalic"
      semibold -> "Poppins-SemiBold"
      italic -> "Poppins-Italic"
      else -> "Poppins-Regular"
    }
  }

  private fun typeface(context: Context, family: String?, weight: Int, italic: Boolean): Typeface {
    // A custom family (e.g. Iosevka) is used verbatim; the weight->Poppins-file mapping only
    // applies when no family is given.
    val name = if (!family.isNullOrEmpty()) family else fontFamily(weight, italic)
    return ReactFontManager.getInstance().getTypeface(name, Typeface.NORMAL, context.assets)
  }

  fun basePaint(context: Context, spec: FastTextSpec): TextPaint {
    val tp = TextPaint(Paint.ANTI_ALIAS_FLAG)
    tp.textSize = spec.fontSizePx
    tp.color = spec.color
    tp.typeface = typeface(context, spec.fontFamily, spec.weight, spec.italic)
    return tp
  }

  private fun decorationSpan(decoration: String?): Any? =
    when (decoration) {
      "underline" -> UnderlineSpan()
      "line-through" -> StrikethroughSpan()
      else -> null
    }

  fun buildSpannable(context: Context, spec: FastTextSpec): SpannableString {
    val sp = SpannableString(spec.text)
    val len = spec.text.length
    if (len == 0) {
      return sp
    }
    val flag = Spanned.SPAN_INCLUSIVE_EXCLUSIVE
    sp.setSpan(ForegroundColorSpan(spec.color), 0, len, flag)
    sp.setSpan(AbsoluteSizeSpan(spec.fontSizePx.toInt(), false), 0, len, flag)
    sp.setSpan(TypefaceWeightSpan(typeface(context, spec.fontFamily, spec.weight, spec.italic)), 0, len, flag)
    decorationSpan(spec.decoration)?.let { sp.setSpan(it, 0, len, flag) }
    if (spec.lineHeightPx > 0f) {
      sp.setSpan(AbsoluteLineHeightSpan(spec.lineHeightPx.toInt()), 0, len, flag)
    }
    for (f in spec.fragments) {
      val s = f.start.coerceIn(0, len)
      val e = f.end.coerceIn(s, len)
      if (e <= s) {
        continue
      }
      f.color?.let { sp.setSpan(ForegroundColorSpan(it), s, e, flag) }
      f.backgroundColor?.let { sp.setSpan(BackgroundColorSpan(it), s, e, flag) }
      if (f.weight != null || f.italic != null) {
        sp.setSpan(
          TypefaceWeightSpan(typeface(context, spec.fontFamily, f.weight ?: spec.weight, f.italic ?: spec.italic)),
          s,
          e,
          flag,
        )
      }
      f.fontSizePx?.let { sp.setSpan(AbsoluteSizeSpan(it.toInt(), false), s, e, flag) }
      decorationSpan(f.decoration)?.let { sp.setSpan(it, s, e, flag) }
    }
    return sp
  }

  private fun alignment(textAlign: String?): Layout.Alignment =
    when (textAlign) {
      "center" -> Layout.Alignment.ALIGN_CENTER
      "right" -> Layout.Alignment.ALIGN_OPPOSITE
      else -> Layout.Alignment.ALIGN_NORMAL
    }

  fun layout(context: Context, spec: FastTextSpec, contentWidthPx: Int): StaticLayout {
    val sp = buildSpannable(context, spec)
    val width = maxOf(contentWidthPx, 0)
    val builder =
      StaticLayout.Builder.obtain(sp, 0, spec.text.length, basePaint(context, spec), width)
        .setIncludePad(false)
        .setAlignment(alignment(spec.textAlign))
    if (spec.maxLines > 0) {
      builder.setMaxLines(spec.maxLines).setEllipsize(TextUtils.TruncateAt.END).setEllipsizedWidth(width)
    }
    return builder.build()
  }
}

class FastTextView(context: Context) : View(context) {
  var spec: FastTextSpec =
    FastTextSpec("", Color.BLACK, null, 400, false, null, FastTextSpec.DEFAULT_FONT_SIZE_DP * resources.displayMetrics.density, 0f, 0f, 0, null, null, emptyList())
    set(value) {
      field = value
      // Set the background on the View (clipped to bounds by the framework). Canvas.drawColor
      // fills the whole clip region, which on an unclipped Fabric view floods the parent.
      setBackgroundColor(value.backgroundColor ?: Color.TRANSPARENT)
      layout = null
      invalidate()
    }

  private var layout: StaticLayout? = null
  private var lastWidth: Int = -1

  override fun onDraw(canvas: Canvas) {
    val contentWidth = (width - 2 * spec.paddingHorizontalPx).toInt()
    val l =
      layout?.takeIf { lastWidth == contentWidth }
        ?: FastTextLayoutBuilder.layout(context, spec, contentWidth).also {
          layout = it
          lastWidth = contentWidth
        }
    canvas.save()
    canvas.translate(spec.paddingHorizontalPx, 0f)
    l.draw(canvas)
    canvas.restore()
  }
}
