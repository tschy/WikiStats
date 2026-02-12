package wikistats

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import wikistats.MediaWikiApi
import wikistats.dtos.WikipediaRestV1Api

@Configuration
class WikipediaClientConfig {

    @Bean
    fun wikipediaApi(): MediaWikiApi = wikipediaApi("https://en.wikipedia.org/w/")

    @Bean
    fun wikipediaRestV1Api(): WikipediaRestV1Api =
        wikipediaRestV1Api("https://en.wikipedia.org/api/rest_v1/")

    private fun wikipediaApi(url: String): MediaWikiApi {
        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        val logging = HttpLoggingInterceptor { msg -> println("[HTTP] $msg") }
            .apply { level = HttpLoggingInterceptor.Level.BODY }

        val okHttp = OkHttpClient.Builder()
//            .addInterceptor(logging)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(url)
            .client(okHttp)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

        return retrofit.create(MediaWikiApi::class.java)
    }

    private fun wikipediaRestV1Api(url: String): WikipediaRestV1Api {
        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        val logging = HttpLoggingInterceptor { msg -> println("[HTTP] $msg") }
            .apply { level = HttpLoggingInterceptor.Level.BASIC }

        val okHttp = OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(url)
            .client(okHttp)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

        return retrofit.create(WikipediaRestV1Api::class.java)
    }
}
