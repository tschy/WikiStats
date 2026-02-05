package wikistats.dtos

data class MediaWikiRevisionsResponse(
    val batchcomplete: Boolean? = null,
    val `continue`: MediaWikiContinueDto? = null,
    val query: MediaWikiQueryDto? = null,
    val error: MediaWikiErrorDto? = null
)

data class MediaWikiErrorDto(
    val code: String? = null,
    val info: String? = null
)

data class MediaWikiContinueDto(
    val rvcontinue: String? = null,
    val `continue`: String? = null
)

data class MediaWikiQueryDto(
    val pages: List<MediaWikiPageDto>? = null
)

data class MediaWikiPageDto(
    val pageid: Long? = null,
    val title: String? = null,
    val missing: Boolean? = null,
    val revisions: List<MediaWikiRevisionDto>? = null
)

data class MediaWikiRevisionDto(
    val revid: Long,
    val timestamp: String,
    val size: Int,
    val user: String? = null
)
