package wikistats

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okio.buffer
import okio.source
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import wikistats.dtos.frontend.RevisionSeries
import java.time.Instant
import java.time.Period
import java.time.ZoneId
import java.time.DayOfWeek
import java.nio.file.Files
import java.nio.file.Path
import com.squareup.moshi.Types

class AggregatorTest {
    @Test
    fun `aggregate uses Earth json data`() {
        val stream = this::class.java.classLoader.getResourceAsStream("Earth.json")
        assertNotNull(stream, "Earth.json should be on the test classpath")

        val moshi = Moshi.Builder()
            .add(InstantJsonAdapter())
            .add(KotlinJsonAdapterFactory())
            .build()
        val adapter = moshi.adapter(RevisionSeries::class.java)
        val series: RevisionSeries = stream!!.use { input ->
            adapter.fromJson(input.source().buffer())
        } ?: error("Failed to parse Earth.json")

        val aggregator = Aggregator()
        val stats = aggregator.aggregate(series.points, Period.ofDays(7))

        assertTrue(stats.isNotEmpty(), "Expected aggregated stats to be non-empty")

        val first = stats.first()
        val zone = ZoneId.systemDefault()
        val firstLocal = first.intervalStart.atZone(zone)
        assertEquals(DayOfWeek.MONDAY, firstLocal.dayOfWeek)

        val totalCount = stats.sumOf { bucket -> bucket.userStats.sumOf { it.count } }
        assertEquals(series.points.size.toLong(), totalCount)

        val outputDir = frontendDataDir()
        Files.createDirectories(outputDir)
        val outputPath = outputDir.resolve("Earth-weekly.json")
        val listType = Types.newParameterizedType(List::class.java, wikistats.dtos.Stats::class.java)
        val statsAdapter = moshi.adapter<List<wikistats.dtos.Stats>>(listType).indent("  ")
        Files.newBufferedWriter(outputPath).use { writer ->
            writer.write(statsAdapter.toJson(stats))
        }
    }

    @Test
    fun `writeAggregations writes files for Earth raw data`() {
        val aggregator = Aggregator()
        aggregator.writeAggregations("data/raw/Earth.json")

        val outputDir = frontendDataDir()
        assertTrue(Files.exists(outputDir.resolve("Earth-daily.json")))
        assertTrue(Files.exists(outputDir.resolve("Earth-weekly.json")))
        assertTrue(Files.exists(outputDir.resolve("Earth-monthly.json")))
        assertTrue(Files.exists(outputDir.resolve("Earth-yearly.json")))
    }

    @Test
    fun `monthly and yearly intervals start on first day`() {
        val stream = this::class.java.classLoader.getResourceAsStream("Earth.json")
        assertNotNull(stream, "Earth.json should be on the test classpath")

        val moshi = Moshi.Builder()
            .add(InstantJsonAdapter())
            .add(KotlinJsonAdapterFactory())
            .build()
        val adapter = moshi.adapter(RevisionSeries::class.java)
        val series: RevisionSeries = stream!!.use { input ->
            adapter.fromJson(input.source().buffer())
        } ?: error("Failed to parse Earth.json")

        val aggregator = Aggregator()

        val zone = ZoneId.systemDefault()

        val monthly = aggregator.aggregate(series.points, Period.ofMonths(1))
        val expectedMonthly = java.time.LocalDate.of(2010, 8, 1).atStartOfDay(zone).toInstant()
        assertEquals(expectedMonthly, monthly.first().intervalStart)

        val yearly = aggregator.aggregate(series.points, Period.ofYears(1))
        val expectedYearly = java.time.LocalDate.of(2010, 1, 1).atStartOfDay(zone).toInstant()
        assertEquals(expectedYearly, yearly.first().intervalStart)
    }
}
