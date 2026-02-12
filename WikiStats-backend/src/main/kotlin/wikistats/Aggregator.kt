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
import java.time.DayOfWeek
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import java.nio.file.Files
import java.nio.file.Path

class Aggregator {
    fun aggregate(revisions: List<RevisionPoint>, period: Period): List<Stats> {
        if (revisions.isEmpty()) return emptyList()
        require(!period.isZero && !period.isNegative) { "period must be positive" }

        val sorted = revisions.sortedBy { it.timestamp }
        val zone = ZoneId.systemDefault()

        var intervalStartDate = alignIntervalStart(sorted.first().timestamp.atZone(zone).toLocalDate(), period)
        var intervalStartInstant = intervalStartDate.atStartOfDay(zone).toInstant()
        var intervalEndInstant = intervalStartDate.plus(period).atStartOfDay(zone).toInstant()

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
                intervalStartInstant = intervalStartDate.atStartOfDay(zone).toInstant()
                intervalEndInstant = intervalStartDate.plus(period).atStartOfDay(zone).toInstant()
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

        val outputDir = frontendDataDir()
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

private fun alignIntervalStart(date: java.time.LocalDate, period: Period): java.time.LocalDate {
    return when {
        period.years > 0 && period.months == 0 && period.days == 0 ->
            java.time.LocalDate.of(date.year, 1, 1)
        period.months > 0 && period.years == 0 && period.days == 0 ->
            java.time.LocalDate.of(date.year, date.month, 1)
        period.days == 7 && period.years == 0 && period.months == 0 ->
            date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        else -> date
    }
}

private data class MutableUserStats(
    var count: Long = 0,
    var delta: Long = 0
)
