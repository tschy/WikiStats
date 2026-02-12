plugins {
    kotlin("jvm") version "2.2.21"
    kotlin("plugin.spring") version "2.2.21"

    id("org.springframework.boot") version "3.4.2"
    id("io.spring.dependency-management") version "1.1.7"
}

group = ""
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")

    // JSON (Spring uses Jackson by default; this makes Jackson understand Kotlin nullability/data classes well)
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")

    // Your existing HTTP client stack (still fine in Spring Boot)
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.2")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

kotlin {
    jvmToolchain(17)
}

springBoot {
    mainClass.set("wikistats.WikiStatsApplicationKt")
}

// Add this:
tasks.test {
    useJUnitPlatform()
}

// Frontend (Vite/React) integration

val frontendDir = file("frontend")
