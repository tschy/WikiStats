package wikistats

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class WikiStatsApplication

fun main(args: Array<String>) {
    runApplication<WikiStatsApplication>(*args)
}