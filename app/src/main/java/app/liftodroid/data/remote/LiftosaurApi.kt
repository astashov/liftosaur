package app.liftodroid.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.api.createClientPlugin
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/** Everything the API can tell us went wrong, plus the transport failure we treat as "offline". */
sealed class ApiException(message: String) : Exception(message) {
    class Http(val status: Int, val code: String, message: String) : ApiException("$status $code: $message") {
        val isAuth get() = status == 401 || status == 403
    }
    class Offline(cause: Throwable) : ApiException("offline: ${cause.message}")
}

/** Per-installation identity the API requires on every write. */
data class ClientIdentity(val deviceId: String, val client: String)

class LiftosaurApi(
    engine: HttpClientEngine,
    baseUrl: String,
    private val apiKey: suspend () -> String?,
    private val identity: suspend () -> ClientIdentity,
) {
    private val http = HttpClient(engine) {
        expectSuccess = false
        install(ContentNegotiation) { json(LiftoJson) }
        install(HttpTimeout) {
            connectTimeoutMillis = 8_000
            requestTimeoutMillis = 20_000
        }
        defaultRequest {
            url(baseUrl)
            contentType(ContentType.Application.Json)
        }
        install(createClientPlugin("LiftosaurHeaders") {
            onRequest { request, _ ->
                apiKey()?.let { request.header(HttpHeaders.Authorization, "Bearer $it") }
                if (request.method != HttpMethod.Get) {
                    val id = identity()
                    request.header("X-Liftosaur-Device-Id", id.deviceId)
                    request.header("X-Liftosaur-Client", id.client)
                }
            }
        })
    }

    // ---- workout cycle
    suspend fun next(): WorkoutDto? = call<WorkoutPayload> { get("workout/next") }.workout
    suspend fun current(): WorkoutDto? = call<WorkoutPayload> { get("workout/current") }.workout
    suspend fun start(req: StartRequest): WorkoutDto =
        call<WorkoutPayload> { post("workout/start") { setBody(req) } }.workout!!
    suspend fun logSet(write: SetWrite): WorkoutDto =
        call<WorkoutPayload> { post("workout/set") { setBody(write) } }.workout!!
    suspend fun logSets(batch: SetBatch): WorkoutDto =
        call<WorkoutPayload> { post("workout/sets") { setBody(batch) } }.workout!!
    suspend fun finish(req: FinishRequest): FinishedWorkoutDto =
        call<FinishPayload> { post("workout/finish") { setBody(req) } }.workout
    suspend fun discard(req: DiscardRequest) {
        call<kotlinx.serialization.json.JsonElement> { delete("workout/current") { setBody(req) } }
    }

    // ---- reads
    suspend fun history(limit: Int = 200, cursor: String? = null, startDate: String? = null): HistoryPage =
        call {
            get("history") {
                parameter("limit", limit)
                cursor?.let { parameter("cursor", it) }
                startDate?.let { parameter("startDate", it) }
            }
        }

    suspend fun exerciseData(): List<ExerciseDataDto> = call<ExerciseDataPayload> { get("exercise-data") }.exerciseData
    suspend fun measurements(): List<MeasurementSummary> = call<MeasurementsOverview> { get("measurements") }.measurements
    suspend fun measurementSeries(key: String, limit: Int = 200, cursor: String? = null): MeasurementSeries =
        call { get("measurements/$key") { parameter("limit", limit); cursor?.let { parameter("cursor", it) } } }

    suspend fun gyms(): GymsPayload = call { get("gyms") }
    suspend fun setCurrentGym(id: String) {
        call<kotlinx.serialization.json.JsonElement> { put("gyms/$id") { setBody(GymUpdate(setCurrent = true)) } }
    }
    suspend fun equipment(gymId: String): List<EquipmentDto> =
        call<EquipmentPayload> { get("gyms/$gymId/equipment") }.equipment

    suspend fun settings(): SettingsDto? = call<SettingsPayload> { get("settings") }.settings

    private suspend inline fun <reified T> call(block: HttpClient.() -> HttpResponse): T {
        val response = try {
            http.block()
        } catch (e: ApiException) {
            throw e
        } catch (e: Exception) {
            // Socket/DNS/timeout: no signal in the gym. Callers queue and retry, never surface raw.
            throw ApiException.Offline(e)
        }
        if (!response.status.isSuccess()) {
            val text = runCatching { response.bodyAsText() }.getOrDefault("")
            val err = runCatching { LiftoJson.decodeFromString<ErrorEnvelope>(text).error }.getOrNull()
            throw ApiException.Http(response.status.value, err?.code ?: "http_${response.status.value}", err?.message ?: text.take(200))
        }
        return response.body<Envelope<T>>().data
    }

    companion object {
        /**
         * Nullable request fields default to null and are omitted (encodeDefaults = false), so absent
         * means "not sent". explicitNulls stays on so the one null the API gives meaning to,
         * `"completed": null`, is actually written (see SetWrite).
         */
        val LiftoJson = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
        }
    }
}
