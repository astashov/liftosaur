package app.liftodroid.data

import app.liftodroid.data.local.CacheDao
import app.liftodroid.data.local.CacheEntity
import app.liftodroid.data.remote.ApiException
import app.liftodroid.data.remote.EquipmentDto
import app.liftodroid.data.remote.GymsPayload
import app.liftodroid.data.remote.HistoryRecordDto
import app.liftodroid.data.remote.LiftosaurApi
import app.liftodroid.data.remote.LiftosaurApi.Companion.LiftoJson
import app.liftodroid.data.remote.MeasurementValue
import app.liftodroid.domain.HistoryRecord
import app.liftodroid.domain.Liftohistory
import app.liftodroid.domain.LoadingProfile
import app.liftodroid.domain.PlateCount
import app.liftodroid.domain.Weight
import app.liftodroid.domain.WeightUnit
import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/**
 * Read side: history feed, measurement series, gyms and equipment. Every read is
 * network-then-cache, so the analytics tabs open instantly and still work with no signal.
 */
class InsightsRepository(
    private val api: LiftosaurApi,
    private val cache: CacheDao,
    private val now: () -> Long = System::currentTimeMillis,
) {
    /** Up to [maxPages] × 200 records, newest first, parsed from Liftohistory. */
    suspend fun history(maxPages: Int = 5): List<HistoryRecord> {
        val raw = cached(KEY_HISTORY, ListSerializer(HistoryRecordDto.serializer())) {
            val out = mutableListOf<HistoryRecordDto>()
            var cursor: String? = null
            repeat(maxPages) {
                val page = api.history(limit = 200, cursor = cursor)
                out += page.records
                cursor = (page.nextCursor as? JsonPrimitive)?.contentOrNull
                if (!page.hasMore || cursor == null) return@cached out
            }
            out
        }
        return raw.orEmpty().map { Liftohistory.parse(it.id, it.text) }
    }

    suspend fun bodyweight(): List<Pair<Long, Weight>> =
        cached("measure_weight", ListSerializer(MeasurementValue.serializer())) {
            api.measurementSeries("weight").values
        }.orEmpty().mapNotNull { v -> Weight.parse(v.value)?.let { v.timestamp to it } }.sortedBy { it.first }

    suspend fun gyms(): GymsPayload? = cached("gyms", GymsPayload.serializer()) { api.gyms() }

    /** Switching gyms re-rounds every target to the new equipment, so callers must refetch the workout. */
    suspend fun switchGym(id: String) {
        api.setCurrentGym(id)
        cache.put(CacheEntity("gyms", "", 0)) // invalidate
    }

    suspend fun loadingProfiles(gymId: String, unit: WeightUnit): Map<String, LoadingProfile> =
        cached("equipment_$gymId", ListSerializer(EquipmentDto.serializer())) { api.equipment(gymId) }
            .orEmpty()
            .filterNot { it.isDeleted }
            .associate { it.id to it.toProfile(unit) }

    suspend fun units(): WeightUnit =
        runCatching { api.settings()?.units }.getOrNull()?.let(WeightUnit::fromSuffix) ?: WeightUnit.KG

    private suspend fun <T> cached(key: String, serializer: KSerializer<T>, fetch: suspend () -> T): T? = try {
        fetch().also { cache.put(CacheEntity(key, LiftoJson.encodeToString(serializer, it), now())) }
    } catch (e: ApiException) {
        if (e is ApiException.Http && e.isAuth) throw e
        cache.get(key)?.json?.takeIf { it.isNotEmpty() }?.let { runCatching { LiftoJson.decodeFromString(serializer, it) }.getOrNull() }
    }

    private companion object {
        const val KEY_HISTORY = "history"
    }
}

fun EquipmentDto.toProfile(unit: WeightUnit) = LoadingProfile(
    bar = Weight.parse(if (unit == WeightUnit.KG) bar?.kg else bar?.lb) ?: Weight.zero(unit),
    multiplier = multiplier,
    plates = plates.mapNotNull { p -> Weight.parse(p.weight)?.let { PlateCount(it, p.num) } },
    isFixed = isFixed,
    fixed = fixed.mapNotNull(Weight::parse),
)
