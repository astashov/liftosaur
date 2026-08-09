package com.liftosaur.www.twa.liftoeditor

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.LiftoEditorManagerDelegate
import com.facebook.react.viewmanagers.LiftoEditorManagerInterface

@ReactModule(name = LiftoEditorViewManager.NAME)
class LiftoEditorViewManager : SimpleViewManager<LiftoEditorView>(), LiftoEditorManagerInterface<LiftoEditorView> {

  private val delegate = LiftoEditorManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<LiftoEditorView> = delegate

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): LiftoEditorView = LiftoEditorView(context)

  override fun setInitialText(view: LiftoEditorView, value: String?) {
    view.setInitialTextOnce(value ?: "")
  }

  override fun setEditable(view: LiftoEditorView, value: Boolean) {
    view.isEditable = value
  }

  override fun setShowLineNumbers(view: LiftoEditorView, value: Boolean) {
    view.setLineNumberEnabled(value)
  }

  override fun setFontSize(view: LiftoEditorView, value: Float) {
    if (value > 0f) {
      view.setTextSize(value)
    }
  }

  override fun setColors(view: LiftoEditorView, value: String?) {
    view.applyColors(value ?: "")
  }

  override fun setText(view: LiftoEditorView, text: String?) {
    view.applyText(text ?: "")
  }

  override fun setStyledRanges(view: LiftoEditorView, rangesJson: String?) {
    view.applyStyledRanges(rangesJson ?: "")
  }

  override fun patchStyledRanges(view: LiftoEditorView, start: Int, end: Int, rangesJson: String?) {
    view.applyStyledRangesPatch(start, end, rangesJson ?: "")
  }

  override fun setSelection(view: LiftoEditorView, start: Int, end: Int) {
    view.applySelection(start, end)
  }

  override fun replaceRange(view: LiftoEditorView, start: Int, end: Int, text: String?) {
    view.applyReplaceRange(start, end, text ?: "")
  }

  override fun requestCaretRect(view: LiftoEditorView, start: Int, end: Int) {
    view.requestCaretRect(start, end)
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
    mutableMapOf(
      "topTextDelta" to mapOf("registrationName" to "onTextDelta"),
      "topEditorSelectionChange" to mapOf("registrationName" to "onEditorSelectionChange"),
      "topEditorContentSizeChange" to mapOf("registrationName" to "onEditorContentSizeChange"),
      "topEditorTap" to mapOf("registrationName" to "onEditorTap"),
      "topEditorCaretRect" to mapOf("registrationName" to "onEditorCaretRect"),
    )

  companion object {
    const val NAME = "LiftoEditor"
  }
}
