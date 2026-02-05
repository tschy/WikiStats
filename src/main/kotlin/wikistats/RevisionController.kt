package wikistats

import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import wikistats.dtos.frontend.ArticlePreview
import wikistats.dtos.frontend.RevisionSeries
import java.time.LocalDate

@RestController
@RequestMapping("/api")
class RevisionController(
    private val service: RevisionService
) {
    @GetMapping("/revisions")
    fun revisions(
        @RequestParam title: String,
        @RequestParam(required = false, defaultValue = "300") limit: Int,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) from: LocalDate?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) to: LocalDate?,
        @RequestParam(required = false) cursor: String?
    ): RevisionSeries {
        println("[API] /revisions title=\"$title\" limit=$limit from=$from to=$to cursor=${if (cursor.isNullOrBlank()) "null" else "set"}")
        return service.fetchSeries(title = title, limit = limit, from = from, to = to, cursor = cursor)
    }

    @GetMapping("/preview")
    fun preview(
        @RequestParam title: String
    ): ArticlePreview =
        service.fetchPreview(title)
}
