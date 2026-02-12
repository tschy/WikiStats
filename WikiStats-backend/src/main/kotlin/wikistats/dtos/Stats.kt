package wikistats.dtos

import java.time.Instant

data class Stats(
    val intervalStart: Instant,
    val userStats: List<UserStats>,
)

data class UserStats(
    val user: String,
    val count: Long,
    val delta: Long,
)