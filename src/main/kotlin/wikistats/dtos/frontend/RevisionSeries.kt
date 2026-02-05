package wikistats.dtos.frontend

data class RevisionSeries(
    val title: String,
    val points: List<RevisionPoint>,
    val olderCursor: String? = null
)