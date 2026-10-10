let main = document.getElementById('main');
let watchId = null

function run() {
    let p1 = null;
    let p2 = null;

    const canvasSize = 560
    let canvas = document.createElement("canvas");
    canvas.width = canvasSize// + 1
    canvas.height = canvasSize// + 1
    clear(main)
    main.appendChild(canvas)

    function positionUpdated(time, lat, lon, alt)  {
        p2 = p1;
        p1 = {
            t: time,
            lat: lat,
            lon: lon,
            alt: alt
        }
    }

    function onFrame(frameTime) {
        let time = performance.timeOrigin + frameTime
        let angles = calculate(p1, p2, runways, time)
        if(angles == null) {
            drawAngles(canvas, null, null)
        } else {
            drawAngles(canvas, angles[0], angles[1])
        }
        requestAnimationFrame(onFrame)
    }

    drawAngles(canvas, null, null)
    requestAnimationFrame(onFrame)

    // loadGeoLocation(positionUpdated)
    startFakeGeo(positionUpdated)
}

function calculate(p1, p2, runways, time) {
    if(p1 == null || p2 == null) {
        return null
    }

    let point = extrapolate(p1, p2, time)
    let runway = closestRunway(runways, p1)
    return toAngles(point, runway)
}

function extrapolate(p1, p2, time) {
    let xyz = toXYZ(p1, p2)
    let dT = p1.t - p2.t

    let alpha = (time - p1.t) / dT

    let x = -alpha * xyz.x
    let y = -alpha * xyz.y
    let z = -alpha * xyz.z

    // 3 degrees / sec in radian per milisecond
    const radPerMSec = 3 * Math.PI / 180 / 1000
    // Note: p1 = 0 -> x and y are relative to p1
    // Note: we use sin as approximation, should be good enough for small angles
    //       then we divide by two, because the change is not instant, but gradual
    let dXy = Math.sqrt(x * x + y * y) * Math.sin(radPerMSec * (time - p1.t)) / 2

    // 100 ft/min in nautical mile / milisec
    const dZPerMSec = 100 * 0.3048 / 1852 / 60000
    let dZ = dZPerMSec * (time - p1.t)

    return {x: x, y: y, z: z, dXy: dXy, dZ: dZ};
}

function closestRunway(runways, point) {
    let runway = null;
    let distSq = 10e10;
    for (let runway2 of runways) {
        let xYZ = toXYZ(point, runway2);
        let distSq2 = xYZ.x * xYZ.x + xYZ.y * xYZ.y
        if(distSq2 < distSq) {
            runway = {
                bearing: runway2.bearing,
                angle: runway2.angle,
                x: xYZ.x,
                y: xYZ.y,
                z: xYZ.z
            }
            distSq = distSq2
        }
    }
    return runway;
}

function toAngles(point, runway) {
    let x = runway.x - point.x
    let y = runway.y - point.y
    let z = runway.z - point.z

    let dist = Math.sqrt(x*x + y*y);
    let angle1 = Math.atan2(x, y) * 180 / Math.PI
    let angle2 = Math.atan2(z, dist) * 180 / Math.PI

    let res1 = angle1 - runway.bearing
    while(res1 > 180) {
        res1 -= 360
    }
    while(res1 < -180) {
        res1 += 360
    }

    let dAngle1 = Math.atan2(point.dXy, dist) * 180 / Math.PI
    let dAngle2 = Math.atan2(point.dZ, dist) * 180 / Math.PI

    return [{base: res1, spread: dAngle1}, {base: angle2 - -runway.angle, spread: dAngle2}]
}

// x, y, z in nautical miles
// lat, lon in degrees, alt in meters
function toXYZ(reference, point) {
    let y = (point.lat - reference.lat) * 60
    let x = (point.lon - reference.lon) * 60 * Math.cos(reference.lat * Math.PI / 180)
    let z = (point.alt - reference.alt) / 1852
    return { x: x, y: y, z: z}
}

function drawAngles(canvas, angleX, angleY) {
    let ctx = canvas.getContext("2d");
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "grey";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, 0.45 * canvas.width, 0, 2 * Math.PI)
    ctx.fill()

    ctx.setLineDash([0.8 * canvas.width / 25])
    ctx.strokeStyle = "white"
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.moveTo(0.1 * canvas.width, canvas.height / 2)
    ctx.lineTo(0.9 * canvas.width, canvas.height / 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, 0.1 * canvas.height)
    ctx.lineTo(canvas.width / 2, 0.9 * canvas.height)
    ctx.stroke()

    ctx.setLineDash([])
    if(angleX != null) {
        let lineWidth = 2 * angleX.spread / 2.5 * 0.4 * canvas.width
        if(lineWidth < 4) {
            lineWidth = 4
        }
        ctx.lineWidth = lineWidth

        if(angleX.base > 2.5) {
            angleX.base = 2.5
        }
        if(angleX.base < -2.5) {
            angleX.base = -2.5
        }
        let x = angleX.base / 2.5 * 0.4 * canvas.width + canvas.width / 2
        ctx.beginPath()
        ctx.moveTo(x, 0.2 * canvas.height)
        ctx.lineTo(x, 0.8 * canvas.height)
        ctx.stroke()
    }

    if(angleY != null) {
        let lineWidth = 2 * angleY.spread / 0.7 * 0.4 * canvas.height
        if(lineWidth < 4) {
            lineWidth = 4
        }
        ctx.lineWidth = lineWidth

        if(angleY.base > 0.7) {
            angleY.base = 0.7
        }
        if(angleY.base < -0.7) {
            angleY.base = -0.7
        }
        let y = -angleY.base / 0.7 * 0.4 * canvas.height + canvas.height / 2
        ctx.beginPath()
        ctx.moveTo(0.2 * canvas.width, y)
        ctx.lineTo(0.8 * canvas.width, y)
        ctx.stroke()
    }
}

function loadGeoLocation(positionUpdated) {
    if (navigator.geolocation) {
        error("Waiting for Geolocation...");
        watchId = navigator.geolocation.watchPosition((pos) => {
            if(pos.coords.altitude === null) {
                error("No altitude data")
                navigator.geolocation.clearWatch(watchId)
            } else {
                positionUpdated(
                    pos.timestamp,
                    pos.coords.latitude,
                    pos.coords.longitude,
                    pos.coords.altitude
                );
            }
        }, null, {
            enableHighAccuracy: true
        })
    } else {
        error("No Geolocation")
    }
}

function clear(elem) {
    while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
    }
}

function error(msg) {
    clear(main);
    main.appendChild(document.createTextNode(msg));
    if(watchId != null) {
        navigator.geolocation.clearWatch(watchId)
    }
}

let runways = [
    {
        lat: toDecimal("511130.70"),
        lon: toDecimal("0042717.19"),
        alt: 28.7 * 0.3048, //ft
        bearing: 109.80, //degrees, true
        angle: 3.5 // degrees
    },
    {
        lat: toDecimal("511115.75"),
        lon: toDecimal("0042823.45"),
        alt: 31.3 * 0.3048, //ft
        bearing: 289.8, //degrees, true
        angle: 3 // degrees
    },
]

function toDecimal(string) {
    let decimal = string.indexOf(".");
    if(decimal === -1) {
        decimal = string.length
    }
    let sec = parseFloat(string.substring(decimal - 2))
    let min = parseFloat(string.substring(decimal - 4, decimal - 2))
    let deg = parseFloat(string.substring(0, decimal - 4))
    return deg + min / 60 + sec / 3600
}

// From degrees from N to radians
function degreeToRadian(degrees) {
    let res = (90 - degrees) * Math.PI / 180
    if(res < 0) {
        return -res
    } else {
        return res
    }
}

run()


function startFakeGeo(callback) {
    let body = document.getElementsByTagName("body")[0]
    fakeGeo(
        {
            lat: toDecimal("511115.75"),
            lon: toDecimal("0042823.45"),
        },
        1000,
        callback,
        body
    )
}

function fakeGeo(start, interval, callback, parent) {
    let x = 0 // nm
    let y = 0 // nm
    let alt = 0 // ft
    let heading = 0 // degrees true
    let velocity = 0 // kt
    let verticalVelocity = 0 // ft/min
    let time = 0 // epoch (ms)

    let onUpdated = () => {}

    setInterval(() => {
        let newTime = new Date().getTime()
        let delta = newTime - time
        time = newTime

        let distance = velocity / 3600000 * delta;
        x += Math.sin(heading * Math.PI / 180) * distance
        y += Math.cos(heading * Math.PI / 180) * distance
        alt += verticalVelocity / 60000 * delta

        let lat = start.lat + y / 60
        let lon = start.lon + x / 60 / Math.cos(start.lat)
        let alt2 = alt * 0.3048

        onUpdated()
        callback(time, lat, lon, alt2)
    }, interval)

    let updateX = addPositionElement("X")
    let updateY = addPositionElement("Y")
    let updateAlt = addPositionElement("Altitude")

    onUpdated = () => {
        updateX(x)
        updateY(y)
        updateAlt(alt)
    }

    addControl("Heading", heading, (newHead) => {
        heading = newHead
        if(heading < 0) {
            heading += 360
        }
        if(heading >= 360) {
            heading -= 360
        }
        return heading
    }, 1)
    addControl("Velocity", velocity, (newVel) => {
        velocity = newVel
        if(velocity < 0) {
            velocity = 0
        }
        return velocity
    }, 1)
    addControl("Climb", verticalVelocity, (newHVel) => {
        verticalVelocity = newHVel
        return verticalVelocity
    }, 10)

    function addControl(label, initVal, onUpdate, step) {
        let labelDiv = document.createElement("div")
        let labelText = document.createTextNode(label)
        labelDiv.style.display = "inline-block"
        labelDiv.style.width = "75px"
        labelDiv.appendChild(labelText)

        let val = initVal
        let textH = document.createTextNode(val)
        let buttonHmmm = document.createElement("button");
        buttonHmmm.textContent = "---"
        buttonHmmm.onclick = () => {
            val = onUpdate(val - 100 * step)
            textH.textContent = val
        }
        let buttonHmm = document.createElement("button");
        buttonHmm.textContent = "--"
        buttonHmm.onclick = () => {
            val = onUpdate(val - 10 * step)
            textH.textContent = val
        }
        let buttonHm = document.createElement("button");
        buttonHm.textContent = "-"
        buttonHm.onclick = () => {
            val = onUpdate(val - 1 * step)
            textH.textContent = val
        }
        let buttonHp = document.createElement("button");
        buttonHp.textContent = "+"
        buttonHp.onclick = () => {
            val = onUpdate(val + 1 * step)
            textH.textContent = val
        }
        let buttonHpp = document.createElement("button");
        buttonHpp.textContent = "++"
        buttonHpp.onclick = () => {
            val = onUpdate(val + 10 * step)
            textH.textContent = val
        }
        let buttonHppp = document.createElement("button");
        buttonHppp.textContent = "+++"
        buttonHppp.onclick = () => {
            val = onUpdate(val + 100 * step)
            textH.textContent = val
        }

        let divH = document.createElement("div");
        divH.appendChild(labelDiv)
        divH.appendChild(buttonHmmm)
        divH.appendChild(buttonHmm)
        divH.appendChild(buttonHm)
        divH.appendChild(textH)
        divH.appendChild(buttonHp)
        divH.appendChild(buttonHpp)
        divH.appendChild(buttonHppp)

        parent.appendChild(divH)
    }

    function addPositionElement(label) {
        let labelDiv = document.createElement("div")
        let labelText = document.createTextNode(label)
        labelDiv.style.display = "inline-block"
        labelDiv.style.width = "75px"
        labelDiv.appendChild(labelText)

        let textH = document.createTextNode("")

        let divH = document.createElement("div");
        divH.appendChild(labelDiv)
        divH.appendChild(textH)

        parent.appendChild(divH)

        return (newVal) => textH.textContent = newVal
    }
}