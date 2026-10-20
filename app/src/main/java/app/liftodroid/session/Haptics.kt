package app.liftodroid.session

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/**
 * Gym-tuned vibration vocabulary. Each pattern is distinct by *rhythm*, not just strength, so it
 * reads through a hoodie pocket or a phone face-down on a bench. All of it is supplementary:
 * every state is also shown on screen and in the notification.
 */
class Haptics(context: Context) {

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= 31) {
        context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Vibrator::class.java)
    }

    /** Set logged: one firm click. */
    fun setLogged() = predefinedOr(VibrationEffect.EFFECT_CLICK, longArrayOf(0, 30), intArrayOf(0, 200))

    /** Rest countdown, fired at 3, 2, 1 seconds left: crisp ticks that ramp up. */
    fun countdownTick(secondsLeft: Int) {
        val amp = when (secondsLeft) { 3 -> 90; 2 -> 150; else -> 220 }
        wave(longArrayOf(0, 18), intArrayOf(0, amp))
    }

    /** Rest over: long-short-long, unmistakable from across the rack. */
    fun restOver() = wave(longArrayOf(0, 220, 90, 80, 90, 260), intArrayOf(0, 255, 0, 180, 0, 255))

    /** Personal record: rising triple. */
    fun personalRecord() = wave(longArrayOf(0, 40, 50, 60, 50, 140), intArrayOf(0, 120, 0, 190, 0, 255))

    /** Rejected input (e.g. API refused a value): double buzz. */
    fun reject() = predefinedOr(VibrationEffect.EFFECT_DOUBLE_CLICK, longArrayOf(0, 40, 60, 40), intArrayOf(0, 200, 0, 200))

    private fun predefinedOr(effect: Int, timings: LongArray, amps: IntArray) {
        val v = vibrator ?: return
        if (Build.VERSION.SDK_INT >= 29) v.vibrate(VibrationEffect.createPredefined(effect)) else wave(timings, amps)
    }

    private fun wave(timings: LongArray, amps: IntArray) {
        val v = vibrator ?: return
        if (!v.hasVibrator()) return
        val fixedAmps = if (v.hasAmplitudeControl()) amps else amps.map { if (it > 0) 255 else 0 }.toIntArray()
        v.vibrate(VibrationEffect.createWaveform(timings, fixedAmps, -1))
    }
}
