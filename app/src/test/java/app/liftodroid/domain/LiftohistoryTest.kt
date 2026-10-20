package app.liftodroid.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class LiftohistoryTest {

    private val sample = """
        // felt strong
        2026-02-28T10:45:30Z / program: "5/3/1 For Beginners" / dayName: "Push Day" / week: 1 / dayInWeek: 5 / duration: 1235s / exercises: {
          // exercise note
          Bench Press, Barbell / 3x8 185lb @7, 1x6 185lb @9 / warmup: 1x10 95lb, 1x5 135lb / target: 3x8-12 185lb @8 90s
          OHP / 3x10 95lb / target: 3x10 95lb 60s
          Pull Ups / 3x8|7 0lb / target: 3x10 0lb 60s
          Wall Sit / 2x1 0kg 60s, 1x1 0kg 52s / target: 3x1 0kg 60s|45s
          Squat, Barbell / 1x5+ 225lb / target: 1x5+ 225lb 180s
        }
    """.trimIndent()

    @Test fun `parses header and completed sets, ignores targets`() {
        val r = Liftohistory.parse(7, sample)
        assertEquals(Instant.parse("2026-02-28T10:45:30Z"), r.date)
        assertEquals("5/3/1 For Beginners", r.program)
        assertEquals("Push Day", r.dayName)
        assertEquals(1235L, r.durationSec)
        assertEquals("felt strong", r.note)

        val bench = r.exercises.first()
        assertEquals("Bench Press", bench.name)
        assertEquals("Barbell", bench.equipment)
        assertEquals(4, bench.sets.size)
        assertEquals(9.0, bench.sets.last().rpe!!, 0.0)
        assertEquals(2, bench.warmups.size)

        val pullUps = r.exercises[2]
        assertEquals(7, pullUps.sets.first().repsLeft)

        val wallSit = r.exercises[3]
        assertEquals(listOf(60, 60, 52), wallSit.sets.map { it.holdSec })

        assertTrue(r.exercises[4].sets.single().isAmrap)
    }

    @Test fun `e1rm trend and rep PRs across records`() {
        val a = Liftohistory.parse(1, "2026-01-01T10:00:00Z / exercises: {\n  Squat, Barbell / 3x5 100kg\n}")
        val b = Liftohistory.parse(2, "2026-01-08T10:00:00Z / exercises: {\n  Squat, Barbell / 3x5 105kg, 1x1 120kg\n}")
        val p = ProgressAnalytics.forExercise(listOf(b, a), "Squat, Barbell", WeightUnit.KG)
        assertEquals(2, p.e1rm.size)
        assertEquals(116.67, p.e1rm[0].value, 0.01) // 100 × (1 + 5/30)
        assertEquals(122.5, p.e1rm[1].value, 0.01)  // 105×5 beats the 120 single
        assertEquals(120.0, p.repPrs[1]!!.value, 0.0)
        assertEquals(105.0, p.repPrs[5]!!.value, 0.0)
        assertTrue(ProgressAnalytics.isE1rmPr(p, LoggedSet(reps = 5, weight = Weight(110.0, WeightUnit.KG))))
    }
}
