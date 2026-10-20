package app.liftodroid.data.local

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

/**
 * The single live workout as this device believes it to be: the last server snapshot with
 * optimistic local writes applied on top. There is at most one row (id = 0).
 */
@Entity(tableName = "active_workout")
data class ActiveWorkoutEntity(
    @PrimaryKey val id: Int = 0,
    val startTime: Long,
    /** WorkoutDto JSON. */
    val snapshotJson: String,
    /** True once POST /workout/start succeeded. False = started offline from a cached preview. */
    val startConfirmed: Boolean,
    /** Set ids whose targets may still be rewritten by an update script once the queue drains. */
    val pendingRewriteSetIds: String = "",
    /** Rest timer survives process death: absolute wall-clock deadline, 0 = not resting. */
    val restEndsAtMs: Long = 0,
    val restTotalSec: Int = 0,
    val finishRequestedAtMs: Long = 0,
    val updatedAtMs: Long,
)

enum class OutboxKind { START, SET, FINISH, DISCARD }
enum class OutboxState { PENDING, FAILED }

/**
 * Ordered write-ahead log of everything the lifter did that the server hasn't acknowledged.
 * Drained strictly in [seq] order; consecutive SET rows go out as one `POST /workout/sets`.
 */
@Entity(tableName = "outbox")
data class OutboxEntity(
    @PrimaryKey(autoGenerate = true) val seq: Long = 0,
    val kind: OutboxKind,
    val startTime: Long,
    val setId: String? = null,
    /** Request body JSON (StartRequest / SetWrite / FinishRequest / DiscardRequest). */
    val payloadJson: String,
    val createdAtMs: Long,
    val attempts: Int = 0,
    val state: OutboxState = OutboxState.PENDING,
    val lastError: String? = null,
)

/** Read-through cache so Up Next, History and Progress render instantly with no signal. */
@Entity(tableName = "cache")
data class CacheEntity(@PrimaryKey val key: String, val json: String, val fetchedAtMs: Long)

@Dao
interface WorkoutDao {
    @Query("SELECT * FROM active_workout WHERE id = 0")
    fun observeActive(): Flow<ActiveWorkoutEntity?>

    @Query("SELECT * FROM active_workout WHERE id = 0")
    suspend fun active(): ActiveWorkoutEntity?

    @Upsert
    suspend fun upsertActive(e: ActiveWorkoutEntity)

    @Query("DELETE FROM active_workout")
    suspend fun clearActive()

    @Insert
    suspend fun enqueue(op: OutboxEntity): Long

    @Query("SELECT * FROM outbox WHERE state = 'PENDING' ORDER BY seq")
    suspend fun pending(): List<OutboxEntity>

    @Query("SELECT COUNT(*) FROM outbox WHERE state = 'PENDING'")
    fun observePendingCount(): Flow<Int>

    @Query("SELECT * FROM outbox WHERE state = 'FAILED' ORDER BY seq")
    fun observeFailed(): Flow<List<OutboxEntity>>

    @Query("DELETE FROM outbox WHERE seq IN (:seqs)")
    suspend fun ack(seqs: List<Long>)

    @Query("UPDATE outbox SET attempts = attempts + 1, lastError = :error WHERE seq IN (:seqs)")
    suspend fun bumpAttempts(seqs: List<Long>, error: String)

    @Query("UPDATE outbox SET state = 'FAILED', lastError = :error WHERE seq = :seq")
    suspend fun markFailed(seq: Long, error: String)

    @Query("UPDATE outbox SET payloadJson = :payload, setId = :setId WHERE seq = :seq")
    suspend fun rewrite(seq: Long, setId: String?, payload: String)

    @Query("DELETE FROM outbox WHERE startTime = :startTime")
    suspend fun dropWorkout(startTime: Long)

    @Transaction
    suspend fun replaceActiveAndEnqueue(e: ActiveWorkoutEntity, op: OutboxEntity) {
        upsertActive(e)
        enqueue(op)
    }
}

@Dao
interface CacheDao {
    @Query("SELECT * FROM cache WHERE `key` = :key")
    suspend fun get(key: String): CacheEntity?

    @Query("SELECT * FROM cache WHERE `key` = :key")
    fun observe(key: String): Flow<CacheEntity?>

    @Upsert
    suspend fun put(e: CacheEntity)
}

@Database(entities = [ActiveWorkoutEntity::class, OutboxEntity::class, CacheEntity::class], version = 1)
abstract class LiftoDatabase : RoomDatabase() {
    abstract fun workoutDao(): WorkoutDao
    abstract fun cacheDao(): CacheDao

    companion object {
        fun create(context: Context): LiftoDatabase =
            Room.databaseBuilder(context, LiftoDatabase::class.java, "liftodroid.db").build()
    }
}
