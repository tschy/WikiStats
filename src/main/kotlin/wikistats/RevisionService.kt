package wikistats

import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import retrofit2.Call
import retrofit2.Response
import wikistats.dtos.mediawiki.MediaWikiRevisionDto
import wikistats.dtos.mediawiki.MediaWikiRevisionsResponse
import wikistats.dtos.WikipediaRestV1Api
import wikistats.dtos.frontend.ArticlePreview
import wikistats.dtos.frontend.RevisionPoint
import wikistats.dtos.frontend.RevisionSeries
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.Base64
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import kotlin.io.path.readText
import kotlin.io.path.writeText

@Service
class RevisionService(
    private val api: MediaWikiApi,
    private val restV1Api: WikipediaRestV1Api
) {
    private val wikipediaStart: Instant = LocalDate.of(2001, 1, 15).atStartOfDay().toInstant(ZoneOffset.UTC)
    private val cacheDir: Path = Path.of(System.getProperty("user.dir"), "cache", "mediawiki")
        .also {
            it.createDirectories()
            println("[CACHE] Using cache dir: ${it.toAbsolutePath()}")
        }
    private val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()
    private val cacheEntryAdapter: JsonAdapter<CacheEntry<MediaWikiRevisionsResponse>> =
        moshi.adapter(
            Types.newParameterizedType(CacheEntry::class.java, MediaWikiRevisionsResponse::class.java)
        )
    private val cacheTtlMillis: Long = 6 * 60 * 60 * 1000L

    fun fetchSeries(title: String, limit: Int, from: LocalDate? = null, to: LocalDate? = null, cursor: String? = null): RevisionSeries {
        val safeLimit = limit.coerceIn(1, 500000)

        val (fromInstant, toInstant) = if (from != null && to != null) {
            require(!to.isBefore(from)) { "`to` must be the same as or after `from`" }

            val requestedStart = from.atStartOfDay().toInstant(ZoneOffset.UTC)
            val requestedEnd = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC).minusSeconds(1)
            val start = if (requestedStart.isBefore(wikipediaStart)) wikipediaStart else requestedStart
            start to requestedEnd
        } else {
            null to null
        }

        if (fromInstant != null && toInstant != null && toInstant.isBefore(wikipediaStart)) {
            return RevisionSeries(title = title, points = emptyList())
        }

        val points = ArrayList<RevisionPoint>(minOf(safeLimit, 1024))
        val seen = HashSet<Long>(safeLimit * 2)

        val parsedCursor = parseCursor(cursor)
        var continueToken: String? = parsedCursor.rvcontinue
        var continueParam: String? = parsedCursor.cont
        var lastCursor: String? = null
        var reachedFromBoundary = false

        while (points.size < safeLimit && !reachedFromBoundary) {
            val page = fetchRevisionsPage(
                title = title,
                limit = minOf(500, safeLimit - points.size),
                from = fromInstant,
                to = toInstant,
                continueToken = continueToken,
                continueParam = continueParam
            )
            val nextContinueToken = page.continueToken
            val nextContinueParam = if (nextContinueToken.isNullOrBlank()) null else (page.continueParam ?: "||")
            if (nextContinueToken.isNullOrBlank()) {
                println("[MW] no rvcontinue; stopping. lastCursor=null")
            } else if (page.continueParam.isNullOrBlank()) {
                println("[MW] rvcontinue present but continue missing; using continue=||")
            }
            lastCursor = encodeCursor(nextContinueToken, nextContinueParam)

            val revisions = page.revisions
            if (revisions.isEmpty()) {
                break
            }

            for (rev in revisions) {
                if (points.size >= safeLimit) break
                val ts = Instant.parse(rev.timestamp)

                if (fromInstant != null && ts.isBefore(fromInstant)) {
                    reachedFromBoundary = true
                    break
                }
                if (fromInstant != null && toInstant != null) {
                    if (ts.isBefore(fromInstant)) continue
                    if (ts.isAfter(toInstant)) continue
                }

                if (!seen.add(rev.revid)) continue
                points.add(
                    RevisionPoint(
                        id = rev.revid,
                        timestamp = ts,
                        size = rev.size,
                        delta = 0,
                        user = rev.user
                    )
                )
            }

            if (reachedFromBoundary) break
            if (nextContinueToken.isNullOrBlank()) break
            continueToken = nextContinueToken
            continueParam = nextContinueParam
        }

        points.sortBy { it.timestamp }
        for (i in points.indices) {
            val prev = if (i > 0) points[i - 1] else null
            val delta = if (prev == null) 0 else points[i].size - prev.size
            points[i] = points[i].copy(delta = delta)
        }

        return RevisionSeries(title = title, points = points, olderCursor = lastCursor)
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
                if (attempt < maxAttempts) {
                    try { Thread.sleep(300L * attempt) } catch (_: InterruptedException) {}
                    call = call.clone()
                    continue
                } else {
                    throw ResponseStatusException(HttpStatus.BAD_GATEWAY, lastError)
                }
            }
        }
        throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, lastError ?: "Upstream error")
    }

    private data class PageResult(
        val revisions: List<MediaWikiRevisionDto>,
        val continueToken: String?,
        val continueParam: String?
    )

    private data class ParsedCursor(
        val rvcontinue: String?,
        val cont: String?
    )

    private fun encodeCursor(rvcontinue: String?, cont: String?): String? {
        if (rvcontinue.isNullOrBlank()) return null
        val safeCont = cont ?: "||"
        val raw = "rvcontinue=$rvcontinue&continue=$safeCont"
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.toByteArray())
    }

    private fun parseCursor(cursor: String?): ParsedCursor {
        if (cursor.isNullOrBlank()) return ParsedCursor(null, null)
        return try {
            val decoded = String(Base64.getUrlDecoder().decode(cursor))
            val parts = decoded.split("&")
                .mapNotNull {
                    val idx = it.indexOf('=')
                    if (idx <= 0) null else it.substring(0, idx) to it.substring(idx + 1)
                }
                .toMap()
            ParsedCursor(parts["rvcontinue"], parts["continue"])
        } catch (_: Exception) {
            // Backward-compat: older cursors were raw rvcontinue with no continue param.
            if (cursor.contains("|")) {
                ParsedCursor(cursor, "||")
            } else {
                ParsedCursor(null, null)
            }
        }
    }

    private fun fetchRevisionsPage(
        title: String,
        limit: Int,
        from: Instant?,
        to: Instant?,
        continueToken: String?,
        continueParam: String?
    ): PageResult {
        val rvstart = if (continueToken == null && to != null) to.toString() else null
        val rvend = if (continueToken == null && from != null) from.toString() else null
        val contParam = if (continueToken == null) null else continueParam

        val cacheKey = buildCacheKey(title, limit, rvstart, rvend, continueToken, contParam)
        val cached = readCache(cacheKey)
        if (cached != null) {
            val revisions = cached.query?.pages?.firstOrNull()?.revisions ?: emptyList()
            val cont = cached.`continue`?.rvcontinue
            val contParamResp = cached.`continue`?.`continue`
            println("[MW] cache hit title=\"$title\" limit=$limit rvstart=$rvstart rvend=$rvend rvcontinue=$continueToken -> returned=${revisions.size} rvcontinue=${cont ?: "null"} continue=${contParamResp ?: "null"}")
            return PageResult(revisions = revisions, continueToken = cont, continueParam = contParamResp)
        }

        println("[MW] request title=\"$title\" limit=$limit rvstart=$rvstart rvend=$rvend rvcontinue=$continueToken continue=$contParam")
        val call = api.getRevisions(
            title = title,
            limit = limit,
            start = rvstart,
            end = rvend,
            continueToken = continueToken,
            cont = contParam
        )
        val body = executeWithRetry(call)
        if (body.error != null) {
            val code = body.error.code ?: "unknown"
            val info = body.error.info ?: "unknown"
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "MediaWiki error $code: $info")
        }
        writeCache(cacheKey, body)
        val revisions = body.query?.pages?.firstOrNull()?.revisions ?: emptyList()
        val cont = body.`continue`?.rvcontinue
        val contParamResp = body.`continue`?.`continue`
        val firstTs = revisions.firstOrNull()?.timestamp
        val lastTs = revisions.lastOrNull()?.timestamp
        println("[MW] response title=\"$title\" returned=${revisions.size} rvcontinue=${cont ?: "null"} continue=${contParamResp ?: "null"} first=$firstTs last=$lastTs")
        return PageResult(revisions = revisions, continueToken = cont, continueParam = contParamResp)
    }

    private fun buildCacheKey(
        title: String,
        limit: Int,
        rvstart: String?,
        rvend: String?,
        rvcontinue: String?,
        cont: String?
    ): String {
        val raw = "title=$title|limit=$limit|rvstart=$rvstart|rvend=$rvend|rvcontinue=$rvcontinue|continue=$cont"
        val digest = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun readCache(key: String): MediaWikiRevisionsResponse? {
        val path = cacheDir.resolve("$key.json")
        if (!path.exists()) return null
        return try {
            val entry = cacheEntryAdapter.fromJson(path.readText()) ?: return null
            val expired = System.currentTimeMillis() - entry.storedAt > cacheTtlMillis
            if (expired) {
                Files.deleteIfExists(path)
                null
            } else {
                val revisions = entry.payload.query?.pages?.firstOrNull()?.revisions ?: emptyList()
                val cont = entry.payload.`continue`?.rvcontinue
                if (revisions.isEmpty() && cont.isNullOrBlank()) {
                    // Treat empty, terminal responses as a cache miss to avoid poisoning.
                    null
                } else {
                    entry.payload
                }
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun writeCache(key: String, payload: MediaWikiRevisionsResponse) {
        val path = cacheDir.resolve("$key.json")
        try {
            val revisions = payload.query?.pages?.firstOrNull()?.revisions ?: emptyList()
            val cont = payload.`continue`?.rvcontinue
            if (revisions.isEmpty() && cont.isNullOrBlank()) {
                return
            }
            val entry = CacheEntry(System.currentTimeMillis(), payload)
            val json = cacheEntryAdapter.toJson(entry)
            path.writeText(json)
        } catch (_: Exception) {
            // best-effort cache
        }
    }
}
