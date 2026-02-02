package wikistats.dtos

data class RevisionsResponseDto(
    val revisions: List<RevisionDto>,
    val latest: String,
    val older: String? = null,
    val newer: String? = null
)

data class RevisionDto(
    val id: Long,
    val timestamp: String,
    val minor: Boolean,
    val size: Int,
    val comment: String? = null,
    val user: UserDto?,
    val delta: Int
)

data class UserDto(
    val id: Long? = null,
    val name: String? = null
)