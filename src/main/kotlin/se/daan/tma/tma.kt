package se.daan.tma

import org.w3c.dom.NodeList
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.StandardOpenOption
import javax.xml.XMLConstants
import javax.xml.parsers.DocumentBuilder
import javax.xml.parsers.DocumentBuilderFactory
import javax.xml.xpath.XPath
import javax.xml.xpath.XPathConstants
import javax.xml.xpath.XPathExpression
import javax.xml.xpath.XPathFactory
import kotlin.io.path.*

val documentBuilder: DocumentBuilder = DocumentBuilderFactory.newDefaultInstance()
    .let {
        it.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)
        it.setFeature("http://xml.org/sax/features/namespaces", false);
        it.setFeature("http://xml.org/sax/features/validation", false);
        it.setFeature("http://apache.org/xml/features/nonvalidating/load-dtd-grammar", false);
        it.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        it.isValidating = false
        it.isNamespaceAware = true
        it.isExpandEntityReferences = false
        it
    }
    .newDocumentBuilder()

val xPath: XPath = XPathFactory.newInstance().newXPath()
val enrTablesExpression: XPathExpression = xPath.compile("//table[@class=\"FirUirTma\"]")
val enrNameExpression: XPathExpression = xPath.compile("./caption")
val adNameExpression: XPathExpression = xPath.compile("./tbody/tr/td/strong[text()=\"Designation\"]/../../td[3]")
val lateralExpression: XPathExpression = xPath.compile("./tbody/tr/td/strong[text()=\"Lateral limits\"]/../../td[2]")
val enrVerticalExpression: XPathExpression = xPath.compile("./tbody/tr/td/strong[text()=\"Vertical limits\"]/../../td[2]")
val adVerticalExpression: XPathExpression = xPath.compile("./tbody/tr/td/strong[text()=\"Vertical limits\"]/../../td[3]")

val aerodromes = listOf(
    "EBAW",
    "EBBR",
    "EBCI",
    "EBKT",
    "EBLG",
    "ELLX",
    "EBOS",
    "EBBE",
    "EBBX",
    "EBMB",
    "EBCV",
    "EBDT",
    "EBFS",
    "EBBL",
    "EBFN",
    "EBSU",
    "EBUL",
    "EBWE"
)

fun main() {
    download("ENR.html", "https://ops.skeyes.be/html/belgocontrol_static/eaip/eAIP_Main/html/eAIP/EB-ENR-2.1-en-GB.html")
    aerodromes.forEach {
        download("$it.html", "https://ops.skeyes.be/html/belgocontrol_static/eaip/eAIP_Main/html/eAIP/EB-AD-2.$it-en-GB.html")
    }
    val enrRawTables = extractEnrRawTables()
    val aerodromeRawTables = aerodromes
        .map { extractAdRawTables(it) }
        .flatten()

    val zones = (aerodromeRawTables + enrRawTables)
        .mapNotNull { parse(it) }

    Path("/tmp/zones.js").writer(Charsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING).use { wr ->
        wr.write("var zones = [")
        var firstZone = true
        zones.forEach { z ->
            if(firstZone) {
                firstZone = false
            } else {
                wr.write(",")
            }
            wr.write("\n  {\n")
            wr.write("    name: \"${z.name}\",\n")
            wr.write("    airspace: \"${z.airspace}\",\n")
            wr.write("    type: \"${z.type}\",\n")
            wr.write("    verticalLimits: ${z.verticalLimit.toJs()},\n")
            wr.write("    path: [")
            var firstPath = true
            z.path.forEach { p ->
                if(firstPath) {
                    firstPath = false
                } else {
                    wr.write(",")
                }
                wr.write("\n      {\n")
                when (p) {
                    is Arc -> {
                        wr.write("        type: \"arc\",\n")
                        wr.write("        center: ${p.center.toJs()},\n")
                        wr.write("        radius: ${p.radius},\n")
                        wr.write("        ccw: ${p.counterClockWise}\n")
                    }
                    is Circle -> {
                        wr.write("        type: \"circle\",\n")
                        wr.write("        center: ${p.center.toJs()},\n")
                        wr.write("        radius: ${p.radius}\n")
                    }
                    Border -> {
                        wr.write("        type: \"border\"\n")
                    }
                    is Point -> {
                        wr.write("        type: \"point\",\n")
                        wr.write("        point: ${p.toJs()}\n")
                    }
                    else -> throw IllegalStateException()
                }
                wr.write("      }")
            }
            wr.write("\n    ]\n")
            wr.write("  }")
        }
        wr.write("\n];\n")
    }
}

private fun Point.toJs(): String {
    return "[${this.lat.toJs()}, ${this.lon.toJs()}]"
}

private fun LatLon.toJs(): String {
    return "[${this.degrees}, ${this.minutes}, ${this.seconds}]"
}

private fun VerticalLimit.toJs(): String {
    return "[${this.lower.toJs()}, ${this.upper.toJs()}]"
}

private fun Vertical.toJs(): String {
    return when(this) {
        is Altitude -> this.altitude.toString()
        is FlightLevel -> (this.flightLevel * 100).toString()
        Ground -> "0"
        Unlimited -> "99999"
    }
}

private fun extractEnrRawTables(): List<RawTable> {
    return extractRawTables("ENR", enrTablesExpression, enrNameExpression, enrVerticalExpression)
}

private fun extractAdRawTables(aerodrome: String): List<RawTable> {
    val adTablesExpression: XPathExpression = xPath.compile("//div[@id=\"${aerodrome}-AD-2.17\"]/table")
    val extractRawTables = extractRawTables(aerodrome, adTablesExpression, adNameExpression, adVerticalExpression)

    return extractRawTables
}

private fun extractRawTables(local: String, tableExpression: XPathExpression, nameExpression: XPathExpression, verticalExpression: XPathExpression): List<RawTable> {
    val document = documentBuilder.parse(Path("/tmp/$local.html").inputStream())
    val tables = tableExpression.evaluate(document, XPathConstants.NODESET) as NodeList

    val rawTables = (0 until (tables.length)).map { tables.item(it) }
        .map { table ->
            val name = nameExpression.evaluate(table, XPathConstants.STRING) as String
            val lateral = lateralExpression.evaluate(table, XPathConstants.STRING) as String
            val vertical = verticalExpression.evaluate(table, XPathConstants.STRING) as String
            RawTable(
                name.replace('\u00a0', ' ').replace('\u2009', ' '),
                lateral.replace('\u00a0', ' ').replace('\u2009', ' '),
                vertical.replace('\u00a0', ' ').replace('\u2009', ' ')
            )
        }
    return rawTables
}

private fun download(local: String, uri: String) {
    val path = Path("/tmp/$local")
    if(path.notExists()) {
        val outputStream = path.outputStream()
        val getRequest =
            HttpRequest.newBuilder(URI.create(uri))
                .GET()
                .build()
        val client = HttpClient.newHttpClient()
        val inputStream = client.send(getRequest, HttpResponse.BodyHandlers.ofInputStream())
            .body()

        inputStream.copyTo(outputStream)
    }
}

private val lateralRegex = "(\\d{6})N (\\d{7})E|an arc of circle, (\\d+(?:\\.\\d+)?) NM radius, centred (?:on|at) (\\d{6})N (\\d{7})E and traced (clockwise|counterclockwise)|a (clockwise|counterclockwise) arc radius (\\d+(?:\\.\\d+)?) NM centered on (\\d{6})N (\\d{7})E|A circle, (\\d+(?:\\.\\d+)?) NM radius, centred on (\\d{6})N (\\d{7})E|along the .* border".toRegex()

private fun parse(table: RawTable): Zone? {
    val path = table.lateralLimits
        .trimRemarks()
        .trimEnd('.')
        .replace("  ", " ")
        .replace("E, an arc of circle", "E - an arc of circle")
        .replace("E then a clock", "E - a clock")
        .replace("clockwise to ", "clockwise - ")
        .split(" -")
        .map {
            val trimmed = it.trim()
            val matchEntire = lateralRegex.matchEntire(trimmed)
            if (matchEntire == null) {
                return null
                //throw IllegalArgumentException()
            } else if (matchEntire.groups[1] != null) {
                Point(
                    parseLat(matchEntire.groups[1]!!.value),
                    parseLon(matchEntire.groups[2]!!.value)
                )
            } else if(matchEntire.groups[3] != null) {
                Arc(
                    matchEntire.groups[3]!!.value.toFloat(),
                    Point(
                        parseLat(matchEntire.groups[4]!!.value),
                        parseLon(matchEntire.groups[5]!!.value)
                    ),
                    matchEntire.groups[6]!!.value == "counterclockwise"
                )
            } else if(matchEntire.groups[7] != null) {
                Arc(
                    matchEntire.groups[8]!!.value.toFloat(),
                    Point(
                        parseLat(matchEntire.groups[9]!!.value),
                        parseLon(matchEntire.groups[10]!!.value)
                    ),
                    matchEntire.groups[7]!!.value == "counterclockwise"
                )
            } else if(matchEntire.groups[11] != null) {
                Circle(
                    matchEntire.groups[11]!!.value.toFloat(),
                    Point(
                        parseLat(matchEntire.groups[12]!!.value),
                        parseLon(matchEntire.groups[13]!!.value)
                    )
                )
            } else {
                Border
            }
        }

    val name = table.name.trimRemarks()

    val type = ZoneType.entries
        .firstOrNull { name.contains(" " + it.name) }
        ?: ZoneType.OTHER

    val airspace = if(type == ZoneType.TMA) {
        name.split(" TMA")[0] + " TMA"
    } else {
        name
    }

    val vLimits = table.verticalLimits.replace(" ", "")
    val limitPieces = vLimits.split("/")
    val heightPieces = limitPieces.map {
        val trimmed = it.trimRemarks()
        if(trimmed.startsWith("FL")) {
            FlightLevel(trimmed.substring(2).toInt())
        } else if(trimmed.endsWith("FTAMSL")) {
            Altitude(trimmed.substring(0, trimmed.length - 6).toInt())
        } else if(trimmed == "GND") {
            Ground
        } else if(trimmed == "UNL") {
            Unlimited
        } else {
            throw UnsupportedOperationException()
        }
    }

    val verticalLimits = if(heightPieces.size == 1) {
        VerticalLimit(Ground, heightPieces[0])
    } else {
        VerticalLimit(heightPieces[1], heightPieces[0])
    }

    return Zone(
        name,
        airspace,
        type,
        verticalLimits,
        path,
    )
}

private fun String.trimRemarks(): String {
    return this
        // trim("(3)")
        .trim()
        .trimEnd(')')
        .trimEnd('3')
        .trimEnd('(')
        // trim("(2)")
        .trim()
        .trimEnd(')')
        .trimEnd('2')
        .trimEnd('(')
        // trim("(1)")
        .trim()
        .trimEnd(')')
        .trimEnd('1')
        .trimEnd('(')
        .trim()
}

data class RawTable(
    val name: String,
    val lateralLimits: String,
    val verticalLimits: String
)

enum class ZoneType {
    FIR,
    CTR,
    ATZ,
    CTA,
    TMA,
    OTHER
}

data class Zone(
    val name: String,
    val airspace: String,
    val type: ZoneType,
    val verticalLimit: VerticalLimit,
    val path: List<Path>
)

sealed interface Vertical
data class Altitude(val altitude: Int): Vertical
data class FlightLevel(val flightLevel: Int): Vertical
data object Unlimited: Vertical
data object Ground: Vertical

data class VerticalLimit(
    val lower: Vertical,
    val upper: Vertical
)

data class LatLon(
    val degrees: Int,
    val minutes: Int,
    val seconds: Int
)
fun parseLat(lat: String): LatLon {
    return LatLon(
        lat.substring(0, 2).toInt(),
        lat.substring(2, 4).toInt(),
        lat.substring(4, 6).toInt(),
    )
}
fun parseLon(lon: String): LatLon {
    return LatLon(
        lon.substring(0, 3).toInt(),
        lon.substring(3, 5).toInt(),
        lon.substring(5, 7).toInt(),
    )
}

sealed interface Path
data class Point(
    val lat: LatLon,
    val lon: LatLon
): Path
data class Arc(
    val radius: Float,
    val center: Point,
    val counterClockWise: Boolean
) : Path
data class Circle(
    val radius: Float,
    val center: Point,
) : Path
data object Border: Path