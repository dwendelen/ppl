plugins {
    kotlin("jvm") version "2.0.21"
}

group = "se.daan"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}
kotlin {
    jvmToolchain(17)
}

val webDir = layout.buildDirectory.dir("web").get()

val generateZones = tasks.register<JavaExec>("generateZones") {
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass = "se.daan.airspaces.AirspacesKt"
    val zonesFile = webDir.file("zones.js")
    args = listOf(webDir.toString())
    outputs.file(zonesFile)
}

val copyHtml = tasks.register<Copy>("copyHtml") {
    from("src/main/html")
    into(webDir)
}

tasks.register("assembleWeb") {
    dependsOn(generateZones, copyHtml)
    outputs.dir(webDir)
}