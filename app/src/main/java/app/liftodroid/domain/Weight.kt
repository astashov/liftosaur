package app.liftodroid.domain

import kotlin.math.abs
import kotlin.math.round

enum class WeightUnit(val suffix: String) {
    KG("kg"), LB("lb");

    companion object {
        fun fromSuffix(s: String): WeightUnit? = entries.firstOrNull { it.suffix == s.lowercase() }
    }
}

/**
 * A weight as the Liftosaur API speaks it: a number glued to a unit suffix ("100kg", "185lb").
 * Percentages like "80%" (the `originalWeight` display field) are not weights and fail to parse.
 */
data class Weight(val value: Double, val unit: WeightUnit) : Comparable<Weight> {

    fun to(target: WeightUnit): Weight = when {
        target == unit -> this
        target == WeightUnit.KG -> Weight(value / LB_PER_KG, target)
        else -> Weight(value * LB_PER_KG, target)
    }

    operator fun plus(other: Weight) = Weight(value + other.to(unit).value, unit)
    operator fun minus(other: Weight) = Weight(value - other.to(unit).value, unit)
    operator fun times(n: Int) = Weight(value * n, unit)

    override fun compareTo(other: Weight): Int = value.compareTo(other.to(unit).value)

    /** Wire format: "102.5kg". Trailing zeros dropped, at most 2 decimals. */
    fun toApi(): String = formatNumber(value) + unit.suffix

    /** Display format: "102.5 kg". */
    fun display(): String = formatNumber(value) + " " + unit.suffix

    companion object {
        const val LB_PER_KG = 2.2046226218

        private val pattern = Regex("""^\s*(-?\d+(?:\.\d+)?)\s*(kg|lb)\s*$""", RegexOption.IGNORE_CASE)

        fun parse(raw: String?): Weight? {
            val m = raw?.let { pattern.matchEntire(it) } ?: return null
            val unit = WeightUnit.fromSuffix(m.groupValues[2]) ?: return null
            return Weight(m.groupValues[1].toDouble(), unit)
        }

        fun zero(unit: WeightUnit) = Weight(0.0, unit)

        fun formatNumber(v: Double): String {
            val rounded = round(v * 100) / 100
            return if (abs(rounded - rounded.toLong()) < 1e-9) rounded.toLong().toString()
            else rounded.toString().trimEnd('0').trimEnd('.')
        }
    }
}
