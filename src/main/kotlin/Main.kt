package org.example

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.example.wikistats.dtos.WikipediaApi
import retrofit2.Call
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import wikistats.dtos.RevisionDto
import wikistats.dtos.RevisionsResponseDto
import kotlin.time.Duration.Companion.milliseconds

fun main() {
    val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    val logging = HttpLoggingInterceptor { message ->
        println("[HTTP] $message")
    }.apply {
        // Consider BODY while debugging; HEADERS is fine once stable.
        level = HttpLoggingInterceptor.Level.HEADERS
    }

    val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(logging)
        .build()

    val retrofit = Retrofit.Builder()
        .baseUrl("https://en.wikipedia.org/w/rest.php/")
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    val api = retrofit.create(WikipediaApi::class.java)

    val title = "Earth"

    val allRevisions = mutableListOf<RevisionDto>()
    val seenIds = HashSet<Long>(4096)

    var nextCall: Call<RevisionsResponseDto> = api.getPageHistory(title)
    var page = 0

    while (true) {
        val response = nextCall.execute()

        if (!response.isSuccessful) {
            val err = response.errorBody()?.string()
            error("HTTP ${response.code()} ${response.message()}\n${err ?: "(no error body)"}")
        }

        val body = response.body() ?: error("Empty response body")

        for (rev in body.revisions) {
            val userLabel = rev.user?.name ?: "(unknown)"
            val userId = rev.user?.id
            val comment = rev.comment ?: ""

            println("revId=${rev.id} user=$userLabel userId=${userId ?: "-"} comment=$comment")
        }

        val addedThisPage = body.revisions.count { rev ->
            if (seenIds.add(rev.id)) {
                allRevisions.add(rev)
                true
            } else {
                false
            }
        }

        page += 1
        println("page=$page received=${body.revisions.size} added=$addedThisPage older=${body.older}")

        val olderUrl = body.older
        if (olderUrl.isNullOrBlank()) break

        nextCall = api.getPageHistoryByUrl(olderUrl)

        // Be polite to the API; adjust as needed.
        Thread.sleep(150.milliseconds.inWholeMilliseconds)
    }

    println("Total unique revisions fetched: ${allRevisions.size}")
    println("Newest fetched revision id: ${allRevisions.firstOrNull()?.id}")
    println("Oldest fetched revision id: ${allRevisions.lastOrNull()?.id}")
}