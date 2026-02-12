package wikistats

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import wikistats.dtos.mediawiki.MediaWikiRevisionDto

// Renamed from `main` to avoid having 2 entry points in the project.
fun runWikipediaFetchDemo() {
    val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    val logging = HttpLoggingInterceptor { message ->
        println("[HTTP] $message")
    }.apply {
        level = HttpLoggingInterceptor.Level.HEADERS
    }

    val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(logging)
        .build()

    val retrofit = Retrofit.Builder()
        .baseUrl("https://en.wikipedia.org/w/")
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    val api = retrofit.create(MediaWikiApi::class.java)

    val title = "Earth"

    val allRevisions = mutableListOf<MediaWikiRevisionDto>()
    val seenIds = HashSet<Long>(4096)

    var continueToken: String? = null
    var page = 0

    while (true) {
        val response = api.getRevisions(
            title = title,
            limit = 500,
            continueToken = continueToken
        ).execute()

        if (!response.isSuccessful) {
            val err = response.errorBody()?.string()
            error("HTTP ${response.code()} ${response.message()}\n${err ?: "(no error body)"}")
        }

        val body = response.body() ?: error("Empty response body")
        val revisions = body.query?.pages?.firstOrNull()?.revisions ?: emptyList()

        for (rev in revisions) {
            val userLabel = rev.user ?: "(unknown)"
            println("revId=${rev.revid} user=$userLabel")
        }

        val addedThisPage = revisions.count { rev ->
            if (seenIds.add(rev.revid)) {
                allRevisions.add(rev)
                true
            } else {
                false
            }
        }

        page += 1
        continueToken = body.`continue`?.rvcontinue
        println("page=$page received=${revisions.size} added=$addedThisPage continue=$continueToken")

        if (continueToken.isNullOrBlank()) break
        Thread.sleep(150)
    }

    println("Total unique revisions fetched: ${allRevisions.size}")
    println("Newest fetched revision id: ${allRevisions.firstOrNull()?.revid}")
    println("Oldest fetched revision id: ${allRevisions.lastOrNull()?.revid}")
}
