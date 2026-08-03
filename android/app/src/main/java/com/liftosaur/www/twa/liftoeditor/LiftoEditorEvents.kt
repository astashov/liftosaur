package com.liftosaur.www.twa.liftoeditor

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class TextDeltaEvent(
  surfaceId: Int,
  viewId: Int,
  private val start: Int,
  private val end: Int,
  private val insertedText: String,
  private val textLength: Int,
) : Event<TextDeltaEvent>(surfaceId, viewId) {
  override fun getEventName(): String = "topTextDelta"

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putInt("start", start)
      putInt("end", end)
      putString("insertedText", insertedText)
      putInt("textLength", textLength)
    }
}

class ContentSizeChangeEvent(
  surfaceId: Int,
  viewId: Int,
  private val width: Float,
  private val height: Float,
) : Event<ContentSizeChangeEvent>(surfaceId, viewId) {
  override fun getEventName(): String = "topEditorContentSizeChange"

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putDouble("width", width.toDouble())
      putDouble("height", height.toDouble())
    }
}

class EditorTapEvent(
  surfaceId: Int,
  viewId: Int,
  private val index: Int,
) : Event<EditorTapEvent>(surfaceId, viewId) {
  override fun getEventName(): String = "topEditorTap"

  override fun getEventData(): WritableMap = Arguments.createMap().apply { putInt("index", index) }
}

class EditorSelectionChangeEvent(
  surfaceId: Int,
  viewId: Int,
  private val start: Int,
  private val end: Int,
) : Event<EditorSelectionChangeEvent>(surfaceId, viewId) {
  override fun getEventName(): String = "topEditorSelectionChange"

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putInt("start", start)
      putInt("end", end)
    }
}
