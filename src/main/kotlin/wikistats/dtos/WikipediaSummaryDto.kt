package wikistats.dtos

import com.squareup.moshi.Json

data class WikipediaSummaryDto(
    val title: String,
    val description: String? = null,
    val extract: String? = null,
    val thumbnail: ThumbnailDto? = null,
    @Json(name = "content_urls")
    val contentUrls: ContentUrlsDto? = null
) {
    data class ThumbnailDto(
        val source: String? = null,
        val width: Int? = null,
        val height: Int? = null
    )

    data class ContentUrlsDto(
        val desktop: DesktopDto? = null
    ) {
        data class DesktopDto(
            val page: String? = null
        )
    }
}