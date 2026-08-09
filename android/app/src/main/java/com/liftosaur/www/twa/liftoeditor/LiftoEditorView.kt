package com.liftosaur.www.twa.liftoeditor

import android.graphics.Color
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import io.github.rosemoe.sora.event.ClickEvent
import io.github.rosemoe.sora.event.ContentChangeEvent
import io.github.rosemoe.sora.event.DoubleClickEvent
import io.github.rosemoe.sora.event.HandleStateChangeEvent
import io.github.rosemoe.sora.event.LongPressEvent
import io.github.rosemoe.sora.event.SelectionChangeEvent
import io.github.rosemoe.sora.lang.styling.MappedSpans
import io.github.rosemoe.sora.lang.styling.Styles
import io.github.rosemoe.sora.lang.styling.TextStyle
import io.github.rosemoe.sora.widget.CodeEditor
import io.github.rosemoe.sora.widget.schemes.EditorColorScheme
import org.json.JSONArray
import org.json.JSONObject

private class StyledRange(
  var start: Int,
  var end: Int,
  val color: String,
  val backgroundColor: String,
  val bold: Boolean,
  val italic: Boolean,
)

class LiftoEditorView(private val reactContext: ThemedReactContext) : CodeEditor(reactContext) {
  private var hasSetInitialText = false
  private var suppressEvents = false
  // Arbitrary hex colors get dynamic scheme ids above sora's built-in range (END_COLOR_ID=66);
  // the scheme stores colors in a SparseIntArray so unknown ids are fine. Ids are only
  // meaningful within one scheme, which is why the view owns its own — see init.
  private val colorIds = HashMap<String, Int>()
  private var nextColorId = 1000
  private var lastReportedContentHeightDp = -1f
  // The store behind the delta protocol: what JS pushed last, shifted through subsequent
  // edits with the same rule the JS mirror (and iOS's ExternalRangesStore) uses, so
  // patchStyledRanges windows line up. Sorted by start, non-overlapping.
  private val styledRanges = ArrayList<StyledRange>()

  init {
    // CodeEditor defaults to EditorColorScheme.getDefault(), a process-wide singleton. Two
    // live editors would both hand out dynamic id 1000, 1001... for their own palettes and
    // overwrite each other's entries in it, so an editor left on screen behind another one
    // repaints with the other's colors.
    colorScheme = EditorColorScheme()
    setWordwrap(true)
    setLineNumberEnabled(false)
    // sora's public constructor builds its *light* default scheme and paints the whole canvas
    // with it on every draw, so an RN backgroundColor on this view never shows. The host view
    // owns the background (same as iOS, where every theme background is .clear); the rest of
    // the scheme's chrome comes from the app palette via applyColors.
    colorScheme.setColor(EditorColorScheme.WHOLE_BACKGROUND, Color.TRANSPARENT)
    colorScheme.setColor(EditorColorScheme.CURRENT_LINE, Color.TRANSPARENT)
    // A tint instead of sora's opaque panel and divider, which would draw a second border
    // inside the one the host already puts around the editor. Translucent gray so it reads
    // the same way over either background.
    colorScheme.setColor(EditorColorScheme.LINE_NUMBER_BACKGROUND, 0x14808080)
    colorScheme.setColor(EditorColorScheme.LINE_DIVIDER, Color.TRANSPARENT)
    val density = reactContext.resources.displayMetrics.density
    // Left margin is inside the tinted strip, right margin is the gap to the code.
    setDividerMargin(4f * density, 4f * density)
    val codeTypeface = try {
      android.graphics.Typeface.createFromAsset(reactContext.assets, "fonts/Iosevka-Regular.ttf")
    } catch (e: Exception) {
      android.graphics.Typeface.MONOSPACE
    }
    typefaceText = codeTypeface
    // Line numbers default to MONOSPACE, whose metrics differ from the text's — they end up
    // both looking foreign and sitting a shade off the line they label.
    typefaceLineNumber = codeTypeface
    subscribeEvent(ContentChangeEvent::class.java) { event, _ -> handleContentChange(event) }
    subscribeEvent(SelectionChangeEvent::class.java) { event, _ -> handleSelectionChange(event) }
    subscribeEvent(ClickEvent::class.java) { event, _ ->
      if (!isEditable) {
        val index = event.charPosition.index
        emit { surfaceId, viewId -> EditorTapEvent(surfaceId, viewId, index) }
      }
    }
    // The second tap of a double-tap arrives as sora's double-tap gesture, not a ClickEvent:
    // in structured mode that would select the word (handles + action popup) and JS would
    // never see the tap that switches to freeform. Intercept sora's default and re-emit it
    // as a plain tap; the JS session's own timing turns it into the freeform switch.
    subscribeEvent(DoubleClickEvent::class.java) { event, _ ->
      if (!isEditable) {
        event.intercept()
        val index = event.charPosition.index
        emit { surfaceId, viewId -> EditorTapEvent(surfaceId, viewId, index) }
      }
    }
    // Same reasoning: read-only structured mode shouldn't sprout native selection UI.
    subscribeEvent(LongPressEvent::class.java) { event, _ ->
      if (!isEditable) {
        event.intercept()
      }
    }
    // Extending a selection means dragging a handle vertically, which the enclosing RN
    // ScrollView otherwise claims once the drag passes the touch slop — sora gets
    // ACTION_CANCEL, the selection snaps back and the page scrolls instead. sora dispatches
    // this synchronously on the handle's ACTION_DOWN, before any move can be intercepted.
    subscribeEvent(HandleStateChangeEvent::class.java) { event, _ ->
      parent?.requestDisallowInterceptTouchEvent(event.isHeld)
    }
  }

  override fun onSizeChanged(w: Int, h: Int, oldWidth: Int, oldHeight: Int) {
    super.onSizeChanged(w, h, oldWidth, oldHeight)
    post { emitContentSize() }
  }

  private fun emitContentSize() {
    val heightPx = try {
      getLayout().layoutHeight
    } catch (e: Exception) {
      return
    }
    val d = resources.displayMetrics.density
    val heightDp = heightPx / d
    if (kotlin.math.abs(heightDp - lastReportedContentHeightDp) > 0.5f) {
      lastReportedContentHeightDp = heightDp
      emit { surfaceId, viewId -> ContentSizeChangeEvent(surfaceId, viewId, width / d, heightDp) }
    }
  }

  fun setInitialTextOnce(text: String) {
    if (!hasSetInitialText) {
      hasSetInitialText = true
      applyText(text)
    }
  }

  fun applyText(text: String) {
    suppressEvents = true
    try {
      setText(text)
    } finally {
      suppressEvents = false
    }
  }

  fun applyColors(json: String) {
    val colors = try {
      JSONObject(json)
    } catch (e: Exception) {
      return
    }
    applyColor(colors, "text", EditorColorScheme.TEXT_NORMAL)
    applyColor(colors, "selection", EditorColorScheme.SELECTED_TEXT_BACKGROUND)
    applyColor(colors, "caret", EditorColorScheme.SELECTION_INSERT)
    applyColor(colors, "handle", EditorColorScheme.SELECTION_HANDLE)
    applyColor(colors, "lineNumber", EditorColorScheme.LINE_NUMBER)
    applyColor(colors, "lineNumber", EditorColorScheme.LINE_NUMBER_CURRENT)
  }

  private fun applyColor(colors: JSONObject, key: String, colorId: Int) {
    val color = parseHexColor(colors.optString(key)) ?: return
    colorScheme.setColor(colorId, color)
  }

  fun applyStyledRanges(json: String) {
    val ranges = parseRanges(json) ?: return
    styledRanges.clear()
    styledRanges.addAll(ranges)
    rebuildSpans()
  }

  // Delta protocol: replaces stored ranges whose start falls in [start, end) with the given
  // ones (sorted, all inside the window), so per-keystroke updates carry only the edited
  // region instead of the whole document's ranges.
  fun applyStyledRangesPatch(start: Int, end: Int, json: String) {
    val inserted = parseRanges(json) ?: return
    styledRanges.removeAll { it.start in start until end }
    val insertAt = styledRanges.indexOfFirst { it.start >= end }.let { if (it == -1) styledRanges.size else it }
    styledRanges.addAll(insertAt, inserted)
    rebuildSpans()
  }

  private fun parseRanges(json: String): List<StyledRange>? {
    val ranges = try {
      JSONArray(json)
    } catch (e: Exception) {
      return null
    }
    val result = ArrayList<StyledRange>(ranges.length())
    for (i in 0 until ranges.length()) {
      val item = ranges.optJSONObject(i) ?: continue
      val start = item.optInt("start", -1)
      val end = item.optInt("end", -1)
      if (start < 0 || end <= start) {
        continue
      }
      result.add(
        StyledRange(
          start,
          end,
          item.optString("color", ""),
          item.optString("backgroundColor", ""),
          item.optBoolean("bold", false),
          item.optBoolean("italic", false),
        )
      )
    }
    return result
  }

  // Same rule as iOS's ExternalRangesStore.applyEdit and the JS mirror — any change here
  // must land in all three places, or patch windows stop lining up.
  private fun shiftStyledRanges(editStart: Int, editEnd: Int, insertedLength: Int) {
    val delta = insertedLength - (editEnd - editStart)
    if (delta == 0) {
      return
    }
    val iterator = styledRanges.listIterator()
    while (iterator.hasNext()) {
      val range = iterator.next()
      if (editEnd <= range.start) {
        range.start += delta
        range.end += delta
      } else if (editStart < range.end) {
        range.end = maxOf(range.start, range.end + delta)
      }
      if (range.end <= range.start) {
        iterator.remove()
      }
    }
  }

  private fun rebuildSpans() {
    val normalStyle = TextStyle.makeStyle(EditorColorScheme.TEXT_NORMAL)
    val builder = MappedSpans.Builder()
    builder.addIfNeeded(0, 0, normalStyle)
    val indexer = text.indexer
    val textLength = text.length
    for (range in styledRanges) {
      if (range.end > textLength) {
        continue
      }
      val style = TextStyle.makeStyle(
        colorId(range.color),
        if (range.backgroundColor.isEmpty()) 0 else colorId(range.backgroundColor),
        range.bold,
        range.italic,
        false
      )
      val startPos = indexer.getCharPosition(range.start)
      val endPos = indexer.getCharPosition(range.end)
      for (line in startPos.line..endPos.line) {
        builder.addIfNeeded(line, if (line == startPos.line) startPos.column else 0, style)
      }
      builder.addIfNeeded(endPos.line, endPos.column, normalStyle)
    }
    setStyles(Styles(builder.build()))
  }

  private fun colorId(hex: String): Int {
    if (hex.isEmpty()) {
      return EditorColorScheme.TEXT_NORMAL
    }
    return colorIds.getOrPut(hex) {
      val id = nextColorId++
      colorScheme.setColor(id, parseHexColor(hex) ?: Color.BLACK)
      id
    }
  }

  private fun parseHexColor(value: String): Int? {
    val v = value.trim()
    if (!v.startsWith("#")) {
      return try {
        Color.parseColor(v)
      } catch (e: IllegalArgumentException) {
        null
      }
    }
    val hex = v.substring(1)
    // android.graphics.Color handles #RRGGBB/#AARRGGBB but not CSS #RGB or #RRGGBBAA.
    val normalized = when (hex.length) {
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

  fun applySelection(start: Int, end: Int) {
    val length = text.length
    val clampedStart = start.coerceIn(0, length)
    val clampedEnd = end.coerceIn(clampedStart, length)
    val indexer = text.indexer
    val startPos = indexer.getCharPosition(clampedStart)
    if (clampedStart == clampedEnd) {
      setSelection(startPos.line, startPos.column)
    } else {
      val endPos = indexer.getCharPosition(clampedEnd)
      setSelectionRegion(startPos.line, startPos.column, endPos.line, endPos.column)
    }
    // Programmatic selection while editable means JS wants a real editing session
    // (structured → freeform hand-off), so bring up the IME too.
    if (isEditable) {
      requestFocus()
      showSoftInput()
    }
  }

  fun applyReplaceRange(start: Int, end: Int, replacement: String) {
    val length = text.length
    if (start < 0 || end < start || end > length) {
      return
    }
    text.replace(start, end, replacement)
  }

  // Structured mode never sets a selection (that would sprout native selection UI), so the
  // focused range comes from JS and the row has to be resolved on demand. Offsets are content
  // pixels; with autoHeight the editor never scrolls internally, but subtract the offset
  // anyway so this stays correct if that changes.
  fun requestCaretRect(start: Int, end: Int) {
    val layout = try {
      getLayout()
    } catch (e: Exception) {
      return
    }
    val length = text.length
    val row = layout.getRowIndexForPosition(start.coerceIn(0, length))
    val endRow = layout.getRowIndexForPosition(end.coerceIn(0, length))
    val d = resources.displayMetrics.density
    val top = (getRowTop(row) - offsetY) / d
    val bottom = (getRowBottom(maxOf(row, endRow)) - offsetY) / d
    emit { surfaceId, viewId -> EditorCaretRectEvent(surfaceId, viewId, top, bottom) }
  }

  private fun handleContentChange(event: ContentChangeEvent) {
    // Size changes on programmatic setText too, so this stays ahead of the suppress guard;
    // posted because the wrap layout rebuilds after the content listener fires.
    post { emitContentSize() }
    if (suppressEvents) {
      // applyText replaced the whole document; stored ranges are meaningless and JS
      // follows up with a full set.
      styledRanges.clear()
      return
    }
    val textLength = text.length
    when (event.action) {
      ContentChangeEvent.ACTION_INSERT -> {
        shiftStyledRanges(event.changeStart.index, event.changeStart.index, event.changedText.length)
        emit { surfaceId, viewId ->
          TextDeltaEvent(surfaceId, viewId, event.changeStart.index, event.changeStart.index, event.changedText.toString(), textLength)
        }
      }
      ContentChangeEvent.ACTION_DELETE -> {
        shiftStyledRanges(event.changeStart.index, event.changeEnd.index, 0)
        emit { surfaceId, viewId ->
          TextDeltaEvent(surfaceId, viewId, event.changeStart.index, event.changeEnd.index, "", textLength)
        }
      }
    }
  }

  private fun handleSelectionChange(event: SelectionChangeEvent) {
    if (suppressEvents) {
      return
    }
    emit { surfaceId, viewId -> EditorSelectionChangeEvent(surfaceId, viewId, event.left.index, event.right.index) }
  }

  private fun emit(create: (surfaceId: Int, viewId: Int) -> Event<*>) {
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
    dispatcher.dispatchEvent(create(UIManagerHelper.getSurfaceId(reactContext), id))
  }
}
