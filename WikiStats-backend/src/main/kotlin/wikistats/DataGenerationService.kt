package wikistats

import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import org.springframework.stereotype.Service
import wikistats.dtos.Stats
import wikistats.dtos.frontend.ArticlePreview
import java.nio.file.Path
import kotlin.io.path.createDirectories
import kotlin.io.path.writeText

data class GenerateResponse(
    val title: String,
    val slug: String,
    val files: List<String>
)

@Service
class DataGenerationService(
    private val revisionService: RevisionService
) {
    fun generate(title: String, limit: Int = 200000): GenerateResponse {
        val cleanTitle = title.trim()
        require(cleanTitle.isNotEmpty()) { "title must not be blank" }

        val outputDir = defaultOutputDir().also { it.createDirectories() }
        val slug = slugify(cleanTitle)

        val series = revisionService.fetchSeries(title = cleanTitle, limit = limit)
        val preview = revisionService.fetchPreview(cleanTitle)

        val aggregator = Aggregator()
        val moshi = Moshi.Builder()
            .add(InstantJsonAdapter())
            .add(KotlinJsonAdapterFactory())
            .build()
        val statsListType = Types.newParameterizedType(List::class.java, Stats::class.java)
        val statsAdapter = moshi.adapter<List<Stats>>(statsListType).indent("  ")
        val previewAdapter = moshi.adapter(ArticlePreview::class.java).indent("  ")

        val files = ArrayList<String>(aggregator.allPeriods.size + 1)

        for ((label, period) in aggregator.allPeriods) {
            val aggregated = aggregator.aggregate(series.points, period)
            val filename = "${slug}-${label}.json"
            outputDir.resolve(filename).writeText(statsAdapter.toJson(aggregated))
            files.add(filename)
        }

        val previewFile = "${slug}-preview.json"
        outputDir.resolve(previewFile).writeText(previewAdapter.toJson(preview))
        files.add(previewFile)

        return GenerateResponse(
            title = preview.title.ifBlank { cleanTitle },
            slug = slug,
            files = files
        )
    }
}

private fun defaultOutputDir(): Path {
    val backendDir = Path.of(System.getProperty("user.dir"))
    return backendDir.resolveSibling("WikiStats-frontend")
        .resolve("public")
        .resolve("data")
}

private fun slugify(title: String): String {
    val normalized = title.trim().replace("\\s+".toRegex(), "_")
    val builder = StringBuilder()
    for (ch in normalized) {
        val c = ch.lowercaseChar()
        when {
            c.isLetterOrDigit() -> builder.append(c)
            c == '_' || c == '-' -> builder.append(c)
            else -> builder.append('-')
        }
    }
    return builder.toString().trim('-')
}
