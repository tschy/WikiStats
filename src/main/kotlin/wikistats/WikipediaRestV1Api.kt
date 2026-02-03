package wikistats.dtos

import retrofit2.Call
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.Path

interface WikipediaRestV1Api {
    @Headers("User-Agent: MyApp/1.0")
    @GET("page/summary/{title}")
    fun getSummary(@Path("title") title: String): Call<WikipediaSummaryDto>
}

