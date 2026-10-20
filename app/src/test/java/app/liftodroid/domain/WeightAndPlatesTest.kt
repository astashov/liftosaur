package app.liftodroid.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class WeightAndPlatesTest {

    @Test fun `parses and formats API weight strings`() {
        assertEquals(Weight(102.5, WeightUnit.KG), Weight.parse("102.5kg"))
        assertEquals("185lb", Weight.parse("185lb")!!.toApi())
        assertEquals("100kg", Weight(100.0, WeightUnit.KG).toApi())
        assertNull(Weight.parse("80%"))
        assertNull(Weight.parse(null))
    }

    @Test fun `converts units`() {
        assertEquals(220.46, Weight(100.0, WeightUnit.KG).to(WeightUnit.LB).value, 0.01)
    }

    private val kgBarbell = LoadingProfile(
        bar = Weight(20.0, WeightUnit.KG),
        multiplier = 2,
        plates = listOf(25.0 to 4, 20.0 to 4, 10.0 to 4, 5.0 to 4, 2.5 to 4, 1.25 to 4).map { (w, n) -> PlateCount(Weight(w, WeightUnit.KG), n) },
    )

    @Test fun `greedy breakdown per side`() {
        val b = PlateCalculator.breakdown(Weight(102.5, WeightUnit.KG), kgBarbell)
        assertTrue(b.isExact)
        assertEquals(listOf(25.0 to 1, 10.0 to 1, 5.0 to 1, 1.25 to 1), b.perSide.map { it.weight.value to it.num })
    }

    @Test fun `respects inventory and reports closest loadable`() {
        val small = kgBarbell.copy(plates = listOf(PlateCount(Weight(20.0, WeightUnit.KG), 2)))
        val b = PlateCalculator.breakdown(Weight(100.0, WeightUnit.KG), small)
        assertFalse(b.isExact)
        assertEquals(60.0, b.achieved.value, 0.0)
    }

    @Test fun `stepper skips to the next loadable weight`() {
        val coarse = kgBarbell.copy(plates = listOf(PlateCount(Weight(5.0, WeightUnit.KG), 8)))
        // 2.5 kg steps can't be loaded with only 5s: one tap must still move the bar, to 30.
        assertEquals(30.0, PlateCalculator.step(Weight(20.0, WeightUnit.KG), coarse, 2.5, up = true).value, 0.0)
    }

    @Test fun `bar weight in lb profile when lifting in lb`() {
        val lb = LoadingProfile(Weight(45.0, WeightUnit.LB), 2, listOf(PlateCount(Weight(45.0, WeightUnit.LB), 8)))
        assertEquals(225.0, PlateCalculator.breakdown(Weight(225.0, WeightUnit.LB), lb).achieved.value, 0.0)
    }
}
