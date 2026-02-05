package wikistats

import retrofit2.Call
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.Query
import wikistats.dtos.MediaWikiRevisionsResponse

interface MediaWikiApi {
    @Headers("User-Agent: MyApp/1.0")
    @GET("api.php")
    fun getRevisions(
        @Query("action") action: String = "query",
        @Query("format") format: String = "json",
        @Query("formatversion") formatVersion: Int = 2,
        @Query("prop") prop: String = "revisions",
        @Query("rvprop") rvprop: String = "ids|timestamp|size|user",
        @Query("rvdir") rvdir: String = "older",
        @Query("redirects") redirects: Int = 1,
        @Query("continue") cont: String? = null,
        @Query("titles") title: String,
        @Query("rvlimit") limit: Int,
        @Query("rvstart") start: String? = null,
        @Query("rvend") end: String? = null,
        @Query("rvcontinue") continueToken: String? = null
    ): Call<MediaWikiRevisionsResponse>
}
