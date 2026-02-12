package wikistats

private data class CliConfig(
    val titles: List<String>,
    val limit: Int
)

fun main(args: Array<String>) {
    val config = parseArgs(args)
    val clientConfig = WikipediaClientConfig()
    val revisionService = RevisionService(
        api = clientConfig.wikipediaApi(),
        restV1Api = clientConfig.wikipediaRestV1Api()
    )
    val generator = DataGenerationService(revisionService)

    for (title in config.titles) {
        try {
            val result = generator.generate(title = title, limit = config.limit)
            val files = result.files.joinToString(", ")
            println("Generated ${result.title} -> $files")
        } catch (e: Exception) {
            System.err.println("Failed to generate \"$title\": ${e.message}")
        }
    }
}

private fun parseArgs(args: Array<String>): CliConfig {
    var limit = 200000
    val titles = ArrayList<String>()

    for (arg in args) {
        when {
            arg.startsWith("--limit=") -> {
                limit = arg.removePrefix("--limit=").toIntOrNull() ?: limit
            }
            arg.isNotBlank() -> titles.add(arg)
        }
    }

    if (titles.isEmpty()) {
        titles.addAll(listOf("Earth", "Moon", "Horse"))
    }

    return CliConfig(titles = titles, limit = limit)
}
