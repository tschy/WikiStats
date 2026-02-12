package wikistats

import java.nio.file.Path

fun frontendDataDir(): Path {
    val backendDir = Path.of(System.getProperty("user.dir"))
    return backendDir.resolveSibling("WikiStats-frontend")
        .resolve("public")
        .resolve("data")
}

fun frontendRawDir(): Path = frontendDataDir().resolve("raw")
