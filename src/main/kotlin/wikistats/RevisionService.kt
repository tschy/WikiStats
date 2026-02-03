package wikistats

import org.springframework.stereotype.Service
import retrofit2.Call
import wikistats.dtos.RevisionDto
import wikistats.dtos.RevisionsResponseDto
import wikistats.dtos.WikipediaApi
import java.time.Instant

@Service
class RevisionService(
    private val api: WikipediaApi
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

    fun fetchSeries(title: String, limit: Int): RevisionSeries {
        val safeLimit = limit.coerceIn(1, 5000)
        val points = ArrayList<RevisionPoint>(minOf(safeLimit, 1024))
        val seen = HashSet<Long>(safeLimit * 2)

        var next: Call<RevisionsResponseDto> = api.getPageHistory(title)

        while (points.size < safeLimit) {
            val resp = next.execute()
            if (!resp.isSuccessful) {
                val err = resp.errorBody()?.string()
                error("Wikipedia HTTP ${resp.code()} ${resp.message()}\n${err ?: "(no error body)"}")
            }

            val body = resp.body() ?: error("Empty Wikipedia response body")

            body.revisions.forEach { rev: RevisionDto ->
                if (points.size >= safeLimit) return@forEach
                if (!seen.add(rev.id)) return@forEach

                points.add(
                    RevisionPoint(
                        id = rev.id,
                        timestamp = Instant.parse(rev.timestamp),
                        size = rev.size,
                        delta = rev.delta,
                        user = rev.user?.name
                    )
                )
            }

            val olderUrl = body.older
            if (olderUrl.isNullOrBlank()) break
            next = api.getPageHistoryByUrl(olderUrl)
        }

        points.reverse() // oldest -> newest for charts
        return RevisionSeries(title = title, points = points)
    }
}