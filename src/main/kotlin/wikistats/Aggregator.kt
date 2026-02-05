package wikistats

import wikistats.dtos.Stats
import wikistats.dtos.frontend.RevisionPoint
import java.time.Duration
import java.time.Period

class Aggregator {
    fun aggregate(revisions: List<RevisionPoint>, period: Period): List<Stats> {
        return emptyList()
    }
}