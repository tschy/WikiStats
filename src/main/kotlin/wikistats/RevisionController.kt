package wikistats

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class RevisionController(
    private val service: RevisionService
) {
    @GetMapping("/revisions")
    fun revisions(
        @RequestParam title: String,
        @RequestParam(required = false, defaultValue = "300") limit: Int
    ): RevisionService.RevisionSeries =
        service.fetchSeries(title = title, limit = limit)
}