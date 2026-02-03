package wikistats

import org.springframework.stereotype.Service
import retrofit2.Call
import wikistats.dtos.RevisionDto
import wikistats.dtos.RevisionsResponseDto
import wikistats.WikipediaApi
import wikistats.dtos.WikipediaRestV1Api
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@Service
class RevisionService(
    private val api: WikipediaApi,
    private val restV1Api: WikipediaRestV1Api
) {
    data class RevisionPoint(
        val id: Long,
        val timestamp: Instant,
        val size: Int,
        val delta: Int,
        val user: String?
    )

    data class RevisionSeries(
        val title: String,
        val points: List<RevisionPoint>
    )

    data class ArticlePreview(
        val title: String,
        val description: String?,
        val extract: String?,
        val thumbnailUrl: String?,
        val pageUrl: String?
    )

    fun fetchSeries(title: String, limit: Int, from: LocalDate? = null, to: LocalDate? = null): RevisionSeries {
        val safeLimit = limit.coerceIn(1, 5000)

        val (fromInstant, toExclusive) = if (from != null && to != null) {
            require(!to.isBefore(from)) { "`to` must be the same as or after `from`" }

            val start = from.atStartOfDay().toInstant(ZoneOffset.UTC)
            val endExclusive = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC)
            start to endExclusive
        } else {
            null to null
        }

        val points = ArrayList<RevisionPoint>(minOf(safeLimit, 1024))
        val seen = HashSet<Long>(safeLimit * 2)

        var next: Call<RevisionsResponseDto> = api.getPageHistory(title)
        var reachedFromBoundary = false

        while (points.size < safeLimit && !reachedFromBoundary) {
            val resp = next.execute()
            if (!resp.isSuccessful) {
                val err = resp.errorBody()?.string()
                error("Wikipedia HTTP ${resp.code()} ${resp.message()}\n${err ?: "(no error body)"}")
            }

            val body = resp.body() ?: error("Empty Wikipedia response body")

            for (rev: RevisionDto in body.revisions) {
                if (points.size >= safeLimit) break

                val ts = Instant.parse(rev.timestamp)

                // If we're fetching a date window, and we've gone older than `from`, we can stop paging.
                if (fromInstant != null && ts.isBefore(fromInstant)) {
                    reachedFromBoundary = true
                    break
                }

                // If we have a window, only include points inside it.
                if (fromInstant != null && toExclusive != null) {
                    if (ts.isBefore(fromInstant)) continue
                    if (!ts.isBefore(toExclusive)) continue
                }

                if (!seen.add(rev.id)) continue

                points.add(
                    RevisionPoint(
                        id = rev.id,
                        timestamp = ts,
                        size = rev.size,
                        delta = rev.delta,
                        user = rev.user?.name
                    )
                )
            }

            if (reachedFromBoundary) break

            val olderUrl = body.older
            if (olderUrl.isNullOrBlank()) break
            next = api.getPageHistoryByUrl(olderUrl)
        }

        points.reverse() // oldest -> newest for charts
        return RevisionSeries(title = title, points = points)
    }

    fun fetchPreview(title: String): ArticlePreview {
        val resp = restV1Api.getSummary(title).execute()
        if (!resp.isSuccessful) {
            val err = resp.errorBody()?.string()
            error("Wikipedia summary HTTP ${resp.code()} ${resp.message()}\n${err ?: "(no error body)"}")
        }

        val body = resp.body() ?: error("Empty Wikipedia summary response body")

        return ArticlePreview(
            title = body.title,
            description = body.description,
            extract = body.extract,
            thumbnailUrl = body.thumbnail?.source,
            pageUrl = body.contentUrls?.desktop?.page
        )
    }
}