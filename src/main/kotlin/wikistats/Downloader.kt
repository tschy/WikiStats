package wikistats

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.writeText

fun main(args: Array<String>) {
    val title = args.getOrNull(0) ?: "Earth"
    val limit = args.getOrNull(1)?.toIntOrNull() ?: 5000
    val outputPath = Path.of(args.getOrNull(2) ?: "data/raw/${title}.json")

    val config = WikipediaClientConfig()
    val revisionService = RevisionService(
        api = config.wikipediaApi(),
        restV1Api = config.wikipediaRestV1Api()
    )

    val series = revisionService.fetchSeries(title = title, limit = limit)

    Files.createDirectories(outputPath.parent ?: Path.of("."))
    val moshi = Moshi.Builder()
        .add(InstantJsonAdapter())
        .add(KotlinJsonAdapterFactory())
        .build()
    val adapter = moshi.adapter(wikistats.dtos.frontend.RevisionSeries::class.java)
    outputPath.writeText(adapter.toJson(series))

    println("Wrote ${series.points.size} points for \"$title\" to ${outputPath.toAbsolutePath()}")
}
