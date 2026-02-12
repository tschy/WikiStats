package wikistats.dtos.frontend

data class ArticlePreview(
    val title: String,
    val description: String?,
    val extract: String?,
    val thumbnailUrl: String?,
    val pageUrl: String?
)