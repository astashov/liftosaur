package app.liftodroid.data.remote

import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject

// Every success body is wrapped as { "data": ... }; every failure as { "error": ... }.
@Serializable
data class Envelope<T>(val data: T)

@Serializable
data class ErrorEnvelope(val error: ApiErrorBody)

@Serializable
data class ApiErrorBody(val code: String, val message: String? = null)

// ---------------------------------------------------------------- workout

@Serializable
data class WorkoutPayload(val workout: WorkoutDto?)

@Serializable
data class DayData(val day: Int, val week: Int? = null, val dayInWeek: Int? = null)

@Serializable
data class WorkoutDto(
    val programId: String? = null,
    val programName: String? = null,
    val dayName: String? = null,
    val dayData: DayData? = null,
    /** Unix ms. Identifies the live workout for finish/DELETE and becomes the history record id. */
    val startTime: Long,
    val entries: List<EntryDto> = emptyList(),
)

@Serializable
data class EntryDto(
    /** NOT unique within a workout. Always address sets by [SetDto.setId]. */
    val entryId: String,
    val exerciseId: String,
    val equipment: String? = null,
    val name: String,
    val imageUrl: String? = null,
    val superset: String? = null,
    val notes: String? = null,
    val description: String? = null,
    /** True: completing a set may rewrite the remaining sets. Adopt the server's list, don't guess. */
    val hasUpdateScript: Boolean = false,
    val promptedVars: List<JsonElement> = emptyList(),
    val warmupSets: List<SetDto> = emptyList(),
    val sets: List<SetDto> = emptyList(),
)

@Serializable
data class PlateDto(val weight: String, val num: Int)

@Serializable
data class SetDto(
    val setId: String,
    val index: Int,
    val isWarmup: Boolean = false,
    val reps: Int? = null,
    val minReps: Int? = null,
    val isAmrap: Boolean = false,
    /** Already resolved and rounded to the current gym's equipment. */
    val weight: String? = null,
    /** Display only, e.g. "80%". */
    val originalWeight: String? = null,
    val plates: List<PlateDto>? = null,
    val rpe: Double? = null,
    val logRpe: Boolean = false,
    val askWeight: Boolean = false,
    val isUnilateral: Boolean = false,
    /** Rest after this set, seconds. */
    val timer: Int? = null,
    /** Non-null for timed holds, seconds. */
    val setTimer: Int? = null,
    val completed: CompletedSet? = null,
)

/** What the lifter actually did. The server decides what it means. */
@Serializable
data class CompletedSet(
    val reps: Int? = null,
    val repsLeft: Int? = null,
    val weight: String? = null,
    val rpe: Double? = null,
    val setTimer: Int? = null,
    val setTimerLeft: Int? = null,
    val userVars: JsonObject? = null,
)

/**
 * One set write. [completed] is a [JsonElement] rather than `CompletedSet?` because the API gives
 * `"completed": null` a meaning (un-complete the set), so it must always be encoded, even as null,
 * while every other absent field is omitted.
 */
@OptIn(ExperimentalSerializationApi::class)
@Serializable
data class SetWrite(
    val setId: String,
    val entryId: String? = null,
    @EncodeDefault(EncodeDefault.Mode.ALWAYS) val completed: JsonElement = JsonNull,
    val append: Boolean? = null,
)

@Serializable
data class SetBatch(val sets: List<SetWrite>)

@Serializable
data class StartRequest(
    val programId: String? = null,
    val week: Int? = null,
    val dayInWeek: Int? = null,
    val startTime: Long? = null,
)

@Serializable
data class FinishRequest(
    val startTime: Long,
    val endTime: Long? = null,
    val notes: String? = null,
    val intervals: List<List<Long>>? = null,
)

@Serializable
data class DiscardRequest(val startTime: Long)

@Serializable
data class FinishPayload(val workout: FinishedWorkoutDto)

@Serializable
data class FinishedWorkoutDto(
    val id: Long,
    val startTime: Long,
    val endTime: Long? = null,
    val programId: String? = null,
    val programName: String? = null,
    val dayName: String? = null,
    val nextDay: NextDayDto? = null,
)

@Serializable
data class NextDayDto(val day: Int, val week: Int? = null, val dayInWeek: Int? = null, val dayName: String? = null)

// ---------------------------------------------------------------- history & analytics

@Serializable
data class HistoryPage(
    val records: List<HistoryRecordDto>,
    val hasMore: Boolean = false,
    val nextCursor: JsonElement? = null,
)

@Serializable
data class HistoryRecordDto(val id: Long, val text: String)

@Serializable
data class ExerciseDataPayload(val exerciseData: List<ExerciseDataDto>)

@Serializable
data class ExerciseDataDto(
    val key: String,
    val exerciseName: String? = null,
    val rm1: String? = null,
    val rounding: Double? = null,
    val isUnilateral: Boolean? = null,
)

@Serializable
data class MeasurementsOverview(val measurements: List<MeasurementSummary>)

@Serializable
data class MeasurementSummary(val key: String, val category: String, val count: Int, val latest: MeasurementValue? = null)

@Serializable
data class MeasurementValue(val timestamp: Long, val date: String? = null, val value: String)

@Serializable
data class MeasurementSeries(
    val key: String,
    val category: String,
    val values: List<MeasurementValue>,
    val hasMore: Boolean = false,
    val nextCursor: JsonElement? = null,
)

// ---------------------------------------------------------------- gyms & settings

@Serializable
data class GymsPayload(val currentGymId: String, val gyms: List<GymDto>)

@Serializable
data class GymDto(val id: String, val name: String, val isCurrent: Boolean = false, val equipmentCount: Int = 0)

@Serializable
data class GymUpdate(val name: String? = null, val setCurrent: Boolean? = null)

@Serializable
data class EquipmentPayload(val equipment: List<EquipmentDto>)

@Serializable
data class EquipmentDto(
    val id: String,
    val name: String? = null,
    val bar: BarDto? = null,
    val multiplier: Int = 2,
    val isFixed: Boolean = false,
    val plates: List<PlateDto> = emptyList(),
    val fixed: List<String> = emptyList(),
    val isDeleted: Boolean = false,
)

@Serializable
data class BarDto(val lb: String? = null, val kg: String? = null)

@Serializable
data class SettingsPayload(val settings: SettingsDto? = null)

@Serializable
data class SettingsDto(val units: String? = null, @SerialName("timers") val timers: JsonElement? = null)
