package wikistats

import wikistats.dtos.Stats
import wikistats.dtos.UserStats
import wikistats.dtos.frontend.RevisionPoint
import wikistats.dtos.frontend.RevisionSeries
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okio.buffer
import okio.source
import java.time.Period
import java.time.ZoneOffset
import java.nio.file.Files
import java.nio.file.Path

class Aggregator {
    fun aggregate(revisions: List<RevisionPoint>, period: Period): List<Stats> {
        if (revisions.isEmpty()) return emptyList()
        require(!period.isZero && !period.isNegative) { "period must be positive" }

        val sorted = revisions.sortedBy { it.timestamp }
        val zone = ZoneOffset.UTC

        var intervalStartDate = sorted.first().timestamp.atZone(zone).toLocalDate()
        var intervalStartInstant = intervalStartDate.atStartOfDay().toInstant(zone)
        var intervalEndInstant = intervalStartDate.plus(period).atStartOfDay().toInstant(zone)

        val results = ArrayList<Stats>()
        val bucket = LinkedHashMap<String, MutableUserStats>()

        fun flushBucket() {
            if (bucket.isEmpty()) return
            val stats = bucket.entries
                .map { (user, value) -> UserStats(user = user, count = value.count, delta = value.delta) }
                .sortedWith(
                    compareByDescending<UserStats> { it.count }
                        .thenByDescending { it.delta }
                        .thenBy { it.user }
                )
            results.add(Stats(intervalStart = intervalStartInstant, userStats = stats))
            bucket.clear()
        }

        for (revision in sorted) {
            val ts = revision.timestamp
            while (ts >= intervalEndInstant) {
                flushBucket()
                intervalStartDate = intervalStartDate.plus(period)
                intervalStartInstant = intervalStartDate.atStartOfDay().toInstant(zone)
                intervalEndInstant = intervalStartDate.plus(period).atStartOfDay().toInstant(zone)
            }

            val user = revision.user ?: "Unknown"
            val entry = bucket.getOrPut(user) { MutableUserStats() }
            entry.count += 1
            entry.delta += revision.delta.toLong()
        }

        flushBucket()
        return results
    }

    val allPeriods = listOf(
        "daily" to Period.ofDays(1),
        "weekly" to Period.ofDays(7),
        "monthly" to Period.ofMonths(1),
        "yearly" to Period.ofYears(1),
    )
    fun writeAggregations(filename: String) {
        val rawPath = Path.of(filename)
        val inputPath = if (rawPath.parent == null) {
            Path.of("data", "raw", filename)
        } else {
            rawPath
        }
        if (!Files.exists(inputPath)) return

        val outputDir = Path.of("data", "aggregated")
        Files.createDirectories(outputDir)

        val moshi = Moshi.Builder()
            .add(InstantJsonAdapter())
            .add(KotlinJsonAdapterFactory())
            .build()
        val seriesAdapter = moshi.adapter(RevisionSeries::class.java)
        val listType = Types.newParameterizedType(List::class.java, Stats::class.java)
        val statsAdapter = moshi.adapter<List<Stats>>(listType).indent("  ")

        val series = Files.newInputStream(inputPath).use { input ->
            seriesAdapter.fromJson(input.source().buffer())
        } ?: return

        val title = series.title.ifBlank {
            inputPath.fileName.toString().removeSuffix(".json")
        }
        for ((label, period) in allPeriods) {
            val aggregated = aggregate(series.points, period)
            val outputPath = outputDir.resolve("${title}-${label}.json")
            Files.newBufferedWriter(outputPath).use { writer ->
                writer.write(statsAdapter.toJson(aggregated))
            }
        }
    }
}

private data class MutableUserStats(
    var count: Long = 0,
    var delta: Long = 0
)
