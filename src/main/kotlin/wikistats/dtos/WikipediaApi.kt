package org.example.wikistats.dtos

import retrofit2.Call
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.Path
import retrofit2.http.Url
import wikistats.dtos.RevisionsResponseDto

interface WikipediaApi {
    @Headers("User-Agent: MyApp/1.0")
    @GET("v1/page/{title}/history")
    fun getPageHistory(
        @Path("title") title: String,
    ): Call<RevisionsResponseDto>

    @Headers("User-Agent: MyApp/1.0")
    @GET
    fun getPageHistoryByUrl(
        @Url url: String,
    ): Call<RevisionsResponseDto>
}