package wikistats.dtos.frontend

import java.time.Instant

data class RevisionPoint(
    val id: Long,
    val timestamp: Instant,
    val size: Int,
    val delta: Int,
    val user: String?
)