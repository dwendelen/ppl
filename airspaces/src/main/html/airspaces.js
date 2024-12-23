const cos51 = Math.cos(51 * Math.PI / 180);

const xLeft = convertLon([2, 15, 0]);
const xRight = convertLon([6, 30, 0]);
const yTop = convertLat([51, 40, 0]);
const hTop = 10000

let lat = convertLat([51, 11, 22]);
let lon = convertLon([4, 27, 37]);
let height = 1200


const colorCtr = {
    "Beauvechain CTR": "salmon",
    "Brussels CTR": "lightgreen",
    "Charleroi CTR": "plum",
    "Florennes CTR": "salmon",
    "Kleine-Brogel CTR One": "salmon",
    "Liège CTR": "lightyellow",
    "Luxembourg CTR": "lightyellow",
    "Oostende CTR": "lightyellow"
}

const colorTma = {
    "BEAUVECHAIN TMA": "darkred",
    "BRUSSELS TMA": "green",
    "CHARLEROI TMA": "violet",
    "FLORENNES TMA": "red",
    "KLEINE-BROGEL TMA": "red",
    "LIÈGE TMA": "yellow",
    "LILLE TMA": "orange",
    "LUXEMBOURG TMA": "yellow",
    "OOSTENDE TMA": "yellow"
}

let topDownCanvas = document.getElementById("top-down");
let heightTopCanvas = document.getElementById("height-top");
let heightSideCanvas = document.getElementById("height-side");

let heightInput = document.getElementById("height")
let latInput = document.getElementById("lat")
let lonInput = document.getElementById("lon")
let applyButton = document.getElementById("apply")

const scale = topDownCanvas.width / (xRight - xLeft)
const hScale = heightTopCanvas.height / hTop

function renderViews() {
    renderTopDownView(topDownCanvas, height);
    renderHeightTopView(heightTopCanvas, lat);
    renderHeightSideView(heightSideCanvas, lon);

    heightInput.value = Math.round(height).toString()
    latInput.value = dispLat(lat)
    lonInput.value = dispLon(lon)
}

renderViews()

topDownCanvas.onclick = ev => {
    let relY = ev.y - topDownCanvas.getBoundingClientRect().y
    let relX = ev.x - topDownCanvas.getBoundingClientRect().x

    lat = yTop - relY / scale
    lon = xLeft + relX / scale

    renderViews()
}

heightTopCanvas.onclick = ev => {
    let relY = ev.y - heightTopCanvas.getBoundingClientRect().y
    let relX = ev.x - heightTopCanvas.getBoundingClientRect().x

    height = hTop - relY / hScale
    lon = xLeft + relX / scale

    renderViews()
}

heightSideCanvas.onclick = ev => {
    let relY = ev.y - heightSideCanvas.getBoundingClientRect().y
    let relX = ev.x - heightSideCanvas.getBoundingClientRect().x

    height = relX / hScale
    lat = yTop - relY / scale

    renderViews()
}

applyButton.onclick = ev => {
    height = parseInt(heightInput.value.replaceAll(" ", ""))
    lat = parseLat(latInput.value)
    lon = parseLon(lonInput.value)

    renderViews()
}

function calcColor(zone) {
    if (zone.type === "CTR" || zone.type === "ATZ") {
        let color = colorCtr[zone.airspace]
        if (!color) {
            color = "lightblue"

        }
        return color
    } else if (zone.type === "TMA") {
        return colorTma[zone.airspace]
    } else if (zone.type === "CTA") {
        return "cyan"
    } else {
        throw "Should not happen"
    }
}

function renderTopDownView(canvas, height) {
    function convX(lon) {
        return (lon - xLeft) * scale
    }
    function convY(lat) {
        return (yTop - lat) * scale
    }

    const ctx = canvas.getContext("2d");
    ctx.reset()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const zone of zones) {
        if (height < zone.verticalLimits[0] || zone.verticalLimits[1] < height) {
            continue;
        }

        let color = calcColor(zone);

        let segments = toSegments(zone.path)

        ctx.beginPath();
        ctx.fillStyle = color;

        let drawing = false
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]
            if (segment.type === "line") {
                if(i + 1 < segments.length && segments[i + 1].type === "circle" ) {
                    // Don't draw the line, if the next segment is an arc
                    continue
                }
                if (!drawing) {
                    ctx.moveTo(convX(segment.from[0]), convY(segment.from[1]));
                    drawing = true;
                }
                ctx.lineTo(convX(segment.to[0]), convY(segment.to[1]));
            } else if (segment.type === "arc") {
                if (!drawing) {
                    drawing = true;
                }
                let startAngle = Math.atan2(segment.start[1] - segment.center[1], segment.start[0] - segment.center[0]);
                let endAngle = Math.atan2(segment.end[1] - segment.center[1], segment.end[0] - segment.center[0]);
                ctx.arc(convX(segment.center[0]), convY(segment.center[1]), segment.radius * scale, -startAngle, -endAngle, segment.ccw);
            } else if (segment.type === "circle") {
                if (drawing) {
                    throw "Should not happen";
                }
                ctx.arc(convX(segment.center[0]), convY(segment.center[1]), segment.radius * scale, 0, 2 * Math.PI);
                drawing = true
            } else {
                throw "Should not happen"
            }
        }
        if (!drawing) {
            throw "Should not happen";
        }
        ctx.fill()
        ctx.stroke()
    }

    ctx.beginPath()
    ctx.setLineDash([5, 15])
    ctx.moveTo(-999999, convY(lat))
    ctx.lineTo(999999, convY(lat))
    ctx.stroke()

    ctx.beginPath()
    ctx.setLineDash([5, 15])
    ctx.moveTo(convX(lon), -999999)
    ctx.lineTo(convX(lon), 999999)
    ctx.stroke()
}

function renderHeightTopView(canvas, y) {
    function convX(lon) {
        return (lon - xLeft) * scale
    }
    function convY(height) {
        return (hTop - height) * hScale
    }
    const ctx = canvas.getContext("2d");
    ctx.reset()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const zone of zones) {
        let applicableSegments = toSegments(zone.path)
            .flatMap(segment => {
                if (segment.type === "line") {
                    let x1 = segment.from[0];
                    let x2 = segment.to[0];
                    let y1 = segment.from[1];
                    let y2 = segment.to[1];
                    let ymn = Math.min(y1, y2);
                    let ymx = Math.max(y1, y2);

                    if(ymn < y && y < ymx) {
                        return [x1 + (y - y1) * (x2 - x1)/(y2 - y1)]
                    } else {
                        return []
                    }
                } else if (segment.type === "arc") {
                    // Based on a circle, but filtered out
                    let y1 = segment.center[1] - segment.radius
                    let y2 = segment.center[1] + segment.radius
                    if(y1 < y && y < y2) {
                        let startAngle = Math.atan2(segment.start[1] - segment.center[1], segment.start[0] - segment.center[0]);
                        let endAngle = Math.atan2(segment.end[1] - segment.center[1], segment.end[0] - segment.center[0]);

                        if(segment.ccw) {
                            if(endAngle < startAngle) {
                                endAngle += 2 * Math.PI
                            }
                        } else {
                            if(startAngle < endAngle) {
                                startAngle += 2 * Math.PI
                            }
                        }

                        let dy = Math.abs(y - segment.center[1])
                        let dx = Math.sqrt(segment.radius*segment.radius - dy*dy)
                        let potentials = [segment.center[0] - dx, segment.center[0] + dx]

                        return potentials
                            .filter(p => {
                                let angle = Math.atan2(lat - segment.center[1], p - segment.center[0])
                                if(segment.ccw) {
                                    if(angle < startAngle) {
                                        angle += 2 * Math.PI
                                    }
                                    return startAngle < angle && angle < endAngle
                                } else {
                                    if(angle < endAngle) {
                                        angle += 2 * Math.PI
                                    }
                                    return endAngle < angle && angle < startAngle
                                }
                            })
                    } else {
                        return []
                    }
                } else if (segment.type === "circle") {
                    let y1 = segment.center[1] - segment.radius
                    let y2 = segment.center[1] + segment.radius
                    if(y1 < y && y < y2) {
                        let dy = Math.abs(y - segment.center[1])
                        let dx = Math.sqrt(segment.radius*segment.radius - dy*dy)
                        return [segment.center[0] - dx, segment.center[0] + dx]
                    } else {
                        return []
                    }
                } else {
                    throw "Should not happen"
                }
            });
        applicableSegments.sort()

        let color = calcColor(zone)

        if(applicableSegments.length % 2 !== 0) {
            throw "Should not happen"
        }
        for (let i = 0; i < applicableSegments.length; i+=2) {
            let x1 = applicableSegments[i]
            let x2 = applicableSegments[i + 1]
            ctx.beginPath()
            ctx.fillStyle = color;
            ctx.moveTo(convX(x1), convY(zone.verticalLimits[0]))
            ctx.lineTo(convX(x1), convY(zone.verticalLimits[1]))
            ctx.lineTo(convX(x2), convY(zone.verticalLimits[1]))
            ctx.lineTo(convX(x2), convY(zone.verticalLimits[0]))
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
        }
    }

    ctx.beginPath()
    ctx.setLineDash([5, 15])
    ctx.moveTo(-99999, convY(height))
    ctx.lineTo(999999, convY(height))
    ctx.stroke()

    ctx.beginPath()
    ctx.setLineDash([])
    ctx.moveTo(-99999, convY(0))
    ctx.lineTo(999999, convY(0))
    ctx.stroke()

    ctx.beginPath()
    ctx.setLineDash([5, 15])
    ctx.moveTo(convX(lon), -999999)
    ctx.lineTo(convX(lon), 999999)
    ctx.stroke()
}

function renderHeightSideView(canvas, x) {
    function convX(height) {
        return height * hScale
    }
    function convY(lat) {
        return (yTop - lat) * scale
    }
    const ctx = canvas.getContext("2d");
    ctx.reset()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const zone of zones) {
        let applicableSegments = toSegments(zone.path)
            .flatMap(segment => {
                if (segment.type === "line") {
                    let x1 = segment.from[0];
                    let x2 = segment.to[0];
                    let y1 = segment.from[1];
                    let y2 = segment.to[1];
                    let xmn = Math.min(x1, x2);
                    let xmx = Math.max(x1, x2);

                    if(xmn < x && x < xmx) {
                        return [y1 + (x - x1) * (y2 - y1)/(x2 - x1)]
                    } else {
                        return []
                    }
                } else if (segment.type === "arc") {
                    // Based on a circle, but filtered out
                    let x1 = segment.center[0] - segment.radius
                    let x2 = segment.center[0] + segment.radius
                    if(x1 < x && x < x2) {
                        let startAngle = Math.atan2(segment.start[1] - segment.center[1], segment.start[0] - segment.center[0]);
                        let endAngle = Math.atan2(segment.end[1] - segment.center[1], segment.end[0] - segment.center[0]);

                        if(segment.ccw) {
                            if(endAngle < startAngle) {
                                endAngle += 2 * Math.PI
                            }
                        } else {
                            if(startAngle < endAngle) {
                                startAngle += 2 * Math.PI
                            }
                        }

                        let dx = Math.abs(x - segment.center[0])
                        let dy = Math.sqrt(segment.radius*segment.radius - dx*dx)
                        let potentials = [segment.center[1] - dy, segment.center[1] + dy]

                        return potentials
                            .filter(p => {
                                let angle = Math.atan2(p - segment.center[1], x - segment.center[0])
                                if(segment.ccw) {
                                    if(angle < startAngle) {
                                        angle += 2 * Math.PI
                                    }
                                    return startAngle < angle && angle < endAngle
                                } else {
                                    if(angle < endAngle) {
                                        angle += 2 * Math.PI
                                    }
                                    return endAngle < angle && angle < startAngle
                                }
                            })
                    } else {
                        return []
                    }
                } else if (segment.type === "circle") {
                    let x1 = segment.center[0] - segment.radius
                    let x2 = segment.center[0] + segment.radius
                    if(x1 < x && x < x2) {
                        let dx = Math.abs(x - segment.center[0])
                        let dy = Math.sqrt(segment.radius*segment.radius - dx*dx)
                        return [segment.center[1] - dy, segment.center[1] + dy]
                    } else {
                        return []
                    }
                } else {
                    throw "Should not happen"
                }
            });
        applicableSegments.sort()

        let color = calcColor(zone)

        if(applicableSegments.length % 2 !== 0) {
            throw "Should not happen"
        }
        for (let i = 0; i < applicableSegments.length; i+=2) {
            let y1 = applicableSegments[i]
            let y2 = applicableSegments[i + 1]
            ctx.beginPath()
            ctx.fillStyle = color;
            ctx.moveTo(convX(zone.verticalLimits[0]), convY(y1))
            ctx.lineTo(convX(zone.verticalLimits[1]), convY(y1))
            ctx.lineTo(convX(zone.verticalLimits[1]), convY(y2))
            ctx.lineTo(convX(zone.verticalLimits[0]), convY(y2))
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
        }
    }

    ctx.beginPath()
    ctx.setLineDash([5, 15])
    ctx.moveTo(convX(height), -9999999)
    ctx.lineTo(convX(height), 999999)
    ctx.stroke()

    ctx.beginPath()
    ctx.setLineDash([])
    ctx.moveTo(convX(0), -9999999)
    ctx.lineTo(convX(0), 999999)
    ctx.stroke()

    ctx.beginPath()
    ctx.setLineDash([5, 15])
    ctx.moveTo(-9999999, convY(lat))
    ctx.lineTo(9999999, convY(lat))
    ctx.stroke()
}

function toSegments(paths) {
    if(paths.length === 1 && paths[0].type === "circle") {
        return [{
            type: "circle",
            center: convertLatLon(paths[0].center),
            radius: paths[0].radius
        }]
    }
    let segments = []

    let previousPoint = null
    let arc = null

    for (const path of paths) {
        if(previousPoint == null) {
            if(path.type !== "point") {
                throw "Should not happen"
            }
            previousPoint = convertLatLon(path.point)
        } else if (path.type === "point") {
            let p = convertLatLon(path.point)
            if (arc) {
                let c = convertLatLon(arc.center)

                segments.push({
                    type: "arc",
                    center: c,
                    radius: arc.radius,
                    start: previousPoint,
                    end: p,
                    ccw: arc.ccw
                })
                arc = null;
            } else {
                segments.push({
                    type: "line",
                    from: previousPoint,
                    to: p
                })
            }
            previousPoint = p
        } else if (path.type === "arc") {
            arc = path;
        } else if (path.type === "border") {
            // Nothing
        } else {
            throw "Should not happen";
        }
    }

    return segments;
}

function convertLatLon(latLon) {
    return [
        convertLon(latLon[1]),
        convertLat(latLon[0])
    ];
}

function convertLon(point) {
    return convertLat(point) * cos51;
}

function convertLat(point) {
    return 60 * point[0] + point[1] + point[2]/60;
}

function revertLon(lon) {
    return revertLat(lon / cos51);
}

function revertLat(lat) {
    return [Math.floor(lat / 60), Math.floor(lat % 60), Math.round((lat * 60) % 60)];
}

function dispLat(lat) {
    let ll = revertLat(lat)
    return pad2(ll[0]) + " " + pad2(ll[1]) + " " + pad2(ll[2]);
}

function dispLon(lon) {
    let ll = revertLon(lon);
    return pad3(ll[0]) + " " + pad2(ll[1]) + " " + pad2(ll[2]);
}

function pad2(str) {
    let str2 = str.toString()
    if(str2.length === 0) {
        return "00";
    } else if(str2.length === 1) {
        return "0" + str2;
    } else if(str2.length === 2) {
        return str2;
    } else {
        throw "Should not happen"
    }
}

function pad3(str) {
    let str2 = str.toString()
    if(str2.length === 0) {
        return "000";
    } else if(str2.length === 1) {
        return "00" + str2;
    } else if(str2.length === 2) {
        return "0" + str2;
    } else if(str2.length === 3) {
        return str2;
    } else {
        throw "Should not happen"
    }
}

function parseLat(text) {
    let cleaned = text.replaceAll(" ", "");
    let p1 = cleaned.slice(0, 2);
    let p2 = cleaned.slice(2, 4);
    let p3 = cleaned.slice(4, 6);
    return convertLat([parseInt(p1), parseInt(p2), parseInt(p3)])
}

function parseLon(text) {
    let cleaned = text.replaceAll(" ", "");
    let p1 = cleaned.slice(0, 3);
    let p2 = cleaned.slice(3, 5);
    let p3 = cleaned.slice(5, 7);
    return convertLon([parseInt(p1), parseInt(p2), parseInt(p3)])
}