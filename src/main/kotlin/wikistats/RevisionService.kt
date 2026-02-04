package wikistats

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import retrofit2.Call
import retrofit2.Response
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
            val body = executeWithRetry(next)

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
        val body = executeWithRetry(restV1Api.getSummary(title))

        return ArticlePreview(
            title = body.title,
            description = body.description,
            extract = body.extract,
            thumbnailUrl = body.thumbnail?.source,
            pageUrl = body.contentUrls?.desktop?.page
        )
    }

    private fun <T> executeWithRetry(initialCall: Call<T>, maxAttempts: Int = 3): T {
        var attempt = 0
        var call: Call<T> = initialCall
        var lastError: String? = null
        while (attempt < maxAttempts) {
            attempt++
            try {
                val resp: Response<T> = call.execute()
                if (resp.isSuccessful) {
                    return resp.body() ?: throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty Wikipedia response body")
                }
                val code = resp.code()
                val errBody = resp.errorBody()?.string()
                lastError = "Wikipedia HTTP $code ${resp.message()}\n${errBody ?: "(no error body)"}"
                // Retry on 429/503 with backoff; otherwise propagate
                if (code == 429 || code == 503) {
                    val retryAfterSeconds = resp.headers()["Retry-After"]?.toLongOrNull()
                    val backoffMillis = retryAfterSeconds?.times(1000)
                        ?: (500L * attempt * attempt)
                    try {
                        Thread.sleep(backoffMillis.coerceAtMost(5000))
                    } catch (_: InterruptedException) {
                        // ignore
                    }
                    call = call.clone()
                    continue
                } else {
                    val status = when (code) {
                        in 400..499 -> HttpStatus.valueOf(code)
                        in 500..599 -> HttpStatus.BAD_GATEWAY
                        else -> HttpStatus.BAD_GATEWAY
                    }
                    throw ResponseStatusException(status, lastError)
                }
            } catch (e: ResponseStatusException) {
                throw e
            } catch (e: Exception) {
                lastError = e.message ?: e.toString()
                // retry network exceptions a couple times
                if (attempt < maxAttempts) {
                    try { Thread.sleep(300L * attempt) } catch (_: InterruptedException) {}
                    call = call.clone()
                    continue
                } else {
                    throw ResponseStatusException(HttpStatus.BAD_GATEWAY, lastError)
                }
            }
        }
        // Exhausted attempts: treat as Too Many Requests if lastError came from 429/503 else Bad Gateway
        throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, lastError ?: "Upstream error")
    }
}