package wikistats

data class CacheEntry<T>(
    val storedAt: Long,
    val payload: T
)
