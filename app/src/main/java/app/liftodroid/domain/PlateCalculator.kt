package app.liftodroid.domain

import kotlin.math.abs

data class PlateCount(val weight: Weight, val num: Int)

/**
 * A gym equipment profile reduced to what plate math needs.
 * [plates] counts are the gym's whole inventory, across all [multiplier] loading sides,
 * matching `GET /gyms/:gymId/equipment/:id`.
 */
data class LoadingProfile(
    val bar: Weight,
    val multiplier: Int,
    val plates: List<PlateCount>,
    val isFixed: Boolean = false,
    val fixed: List<Weight> = emptyList(),
)

data class PlateBreakdown(
    /** Plates to load on ONE side, heaviest first. */
    val perSide: List<PlateCount>,
    val achieved: Weight,
    val target: Weight,
) {
    val isExact: Boolean get() = abs((achieved - target).value) < 0.01
    val remainder: Weight get() = target - achieved
}

object PlateCalculator {

    /**
     * Greedy heaviest-first fill, bounded by the per-side inventory. Greedy is optimal for the
     * plate sets real gyms stock (each plate a multiple of the next smaller denomination, or close
     * to it). The server already resolves `plates` for prescribed sets; this runs only when the
     * lifter edits the weight on-device, so the visualizer never lags behind the steppers.
     */
    fun breakdown(target: Weight, profile: LoadingProfile): PlateBreakdown {
        val unit = target.unit
        if (profile.isFixed) {
            val best = profile.fixed.minByOrNull { abs((it - target).value) } ?: target
            return PlateBreakdown(emptyList(), best.to(unit), target)
        }
        val sides = profile.multiplier.coerceIn(1, 10)
        val bar = profile.bar.to(unit)
        var remainingPerSide = ((target - bar).value / sides).coerceAtLeast(0.0)

        val loaded = mutableListOf<PlateCount>()
        profile.plates
            .map { PlateCount(it.weight.to(unit), it.num / sides) }
            .filter { it.num > 0 && it.weight.value > 0 }
            .sortedByDescending { it.weight.value }
            .forEach { plate ->
                val fit = minOf(plate.num, ((remainingPerSide + EPS) / plate.weight.value).toInt())
                if (fit > 0) {
                    loaded += PlateCount(plate.weight, fit)
                    remainingPerSide -= fit * plate.weight.value
                }
            }

        val perSideTotal = loaded.sumOf { it.weight.value * it.num }
        return PlateBreakdown(loaded, Weight(bar.value + perSideTotal * sides, unit), target)
    }

    /** Next loadable weight above/below [current], used by the +/- steppers. */
    fun step(current: Weight, profile: LoadingProfile?, rounding: Double, up: Boolean): Weight {
        val delta = if (up) rounding else -rounding
        val raw = Weight((current.value + delta).coerceAtLeast(0.0), current.unit)
        if (profile == null) return raw
        val loadable = breakdown(raw, profile).achieved
        // If the inventory can't express the step, keep walking until it changes, at most 20 tries.
        var probe = raw
        repeat(20) {
            val achieved = breakdown(probe, profile).achieved
            if (abs((achieved - current).value) > EPS) return achieved
            probe = Weight((probe.value + delta).coerceAtLeast(0.0), current.unit)
        }
        return loadable
    }

    private const val EPS = 1e-6
}
