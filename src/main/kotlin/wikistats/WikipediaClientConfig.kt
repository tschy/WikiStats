package wikistats

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import wikistats.dtos.WikipediaApi


@Configuration
class WikipediaClientConfig {

    @Bean
    fun wikipediaApi(): WikipediaApi = wikipediaApi("https://en.wikipedia.org/w/rest.php/")

    private fun wikipediaApi(url: String): WikipediaApi {
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

        return retrofit.create(WikipediaApi::class.java)
    }
}

