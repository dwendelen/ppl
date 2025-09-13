let main = document.getElementById('main');

let watchId = null
let arp = {
    lat: 51 + 11 / 60 + 22 / 3600,
    lon: 4 + 27 / 60 + 37 / 3600,
    alt: 32 // ft
}
let xScale = Math.cos(arp.lat * Math.PI / 180) * 60
let yScale = 60
let altScale = 1/0.3048

// X in nm
function latToY1(lat) {
    return (lat - arp.lat) * yScale
}
function latToY3(deg, min, sec) {
    return latToY1(deg + min / 60 + sec / 3600)
}

// Y in nm
function lonToX1(lon) {
    return (lon - arp.lon) * xScale
}
function lonToX3(deg, min, sec) {
    return lonToX1(deg + min / 60 + sec / 3600)
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

let isTest = location.search === "?test"

let positionUpdated = (time, x, y, alt) => {
    startGame(time, x, y, alt);
}
if(isTest) {
    loadFakeGeo()
} else {
    loadGeoLocation()
}

class GameObj {
    constructor(x, y, alt) {
        this.x = x;
        this.y = y;
        this.alt = alt;
    }
    update(time) { }
}

class MyPlane extends GameObj {
    constructor(x, y, alt, heading) {
        super(x, y, alt);
        this.heading = heading;
        this.weapons = [
            new Bomb(),
            new Bomb(),
            new Bomb(),
            new Bomb(),
        ]
        this.waypoints = []
        this.selectedWeapon = null
        this.time = 0
        this.vx = 0
        this.vy = 0
    }

    update(time) {
    }

    updatePos(time, x, y, alt) {
        let oldX = this.x
        let oldY = this.y
        let oldTime = this.time
        this.x = x;
        this.y = y;
        this.alt = alt;
        this.time = time

        let dx = this.x - oldX;
        let dy = this.y - oldY;
        let dt = this.time - oldTime;
        this.vx = dx / dt
        this.vy = dy / dt
        this.heading = Math.PI / 2 - Math.atan2(dy, dx)
        if(this.heading < 0) {
            this.heading += 2 * Math.PI
        }

        for (let weap of this.weapons) {
            if(weap != null) {
                weap.updateFromPlane(x, y, alt, this.vx, this.vy)
            }
        }
    }

    dropPressed() {
        if(this.selectedWeapon != null) {
            this.weapons[this.selectedWeapon].drop(this.time)
            this.weapons[this.selectedWeapon] = null
            this.selectedWeapon = null
        }
    }

    weaponPressed(i) {
        if(i === this.selectedWeapon) {
            this.selectedWeapon = null
        } else if(this.weapons[i] !== null) {
            this.selectedWeapon = i
        }
    }
    waypointPressed(i) {
        if(this.selectedWeapon != null && this.weapons[this.selectedWeapon] !== null) {
            this.weapons[this.selectedWeapon].target = this.waypoints[i]
        }
    }
}

class SAM extends GameObj {
    constructor(x, y, alt, range) {
        super(x, y, alt);
        this.range = range;
    }
}

class Waypoint extends GameObj {
    constructor(x, y, alt) {
        super(x, y, alt);
    }
}

class Bomb extends GameObj {
    constructor() {
        super(0, 0, 0);
        this.vx = 0
        this.vy = 0
        this.target = null
        this.impactPoint = {
            x: 0,
            y: 0,
            radius: 0,
        }
        this.impactPoint2 = {
            x: 0,
            y: 0,
        }
        this.falling = false
        this.inRange = false
    }
    updateFromPlane(x, y, alt, vx, vy) {
        this.x = x
        this.y = y
        this.alt = alt
        this.vx = vx
        this.vy = vy

        let t = Math.sqrt(2 * this.alt / 32.174)

        this.impactPoint = {
            x: this.x + 0.75 * vx * t,
            y: this.y + 0.75 * vy * t,
            // 0.2 rad = +/- 10 graden
            // 6000 ft per nm
            radius: 0.2 * this.alt / 6000
        }

        if(this.target == null) {
            this.inRange = false
        } else {
            let dx = this.impactPoint.x - this.target.x;
            let dy = this.impactPoint.y - this.target.y;
            let r = this.impactPoint.radius;
            this.inRange = dx * dx + dy * dy < r * r;
        }
    }

    update(time) {
        if(this.falling) {
            let deltaTime = time - this.dropTime
            let deltaAlt = 32.174 * deltaTime * deltaTime / 2
            this.alt = this.dropAlt - deltaAlt
            if(this.alt < 0) {
                this.falling = false
                return
            }

            this.x = this.dropX + this.vx * deltaTime
            this.y = this.dropY + this.vy * deltaTime

            let u = (this.dropAlt - this.alt) / this.dropAlt
            this.x = u * this.impactPoint2.x + (1 - u) * this.dropX
            this.y = u * this.impactPoint2.y + (1 - u) * this.dropY
        }
    }

    drop(time) {
        this.falling = true
        this.dropX = this.x
        this.dropY = this.y
        this.vx = 0.75 * this.vx
        this.vy = 0.75 * this.vy
        this.dropAlt = this.alt
        this.dropTime = time

        if(this.target === null) {
            this.impactPoint2 = this.impactPoint
        } else {
            let ox = this.target.x - this.impactPoint.x;
            let oy = this.target.y - this.impactPoint.y;
            let offset = Math.sqrt(ox * ox + oy * oy)
            if (offset <= this.impactPoint.radius) {
                this.impactPoint2 = {
                    x: this.target.x,
                    y: this.target.y
                }
            } else {
                let adjustedOffset = this.impactPoint.radius
                let u = adjustedOffset / offset
                this.impactPoint2 = {
                    x: u * this.target.x + (1 - u) * this.impactPoint.x,
                    y: u * this.target.y + (1 - u) * this.impactPoint.y
                }
            }
        }
    }
}

function rotate(xy, angle) {
    return [
        Math.cos(angle) * xy[0] - Math.sin(angle) * xy[1],
        Math.sin(angle) * xy[0] + Math.cos(angle) * xy[1]
    ]
}

function startGame(time, x, y, alt) {
    const canvasSize = 560

    let curX = canvasSize / 2
    let curY = canvasSize / 2

    let objects = []
    let me = new MyPlane(x, y, alt, 0);
    let piraeusstraat = new Waypoint(lonToX1(4.413013), latToY1(51.234931), 0);
    let ekere = new Waypoint(lonToX1(4.435213), latToY1(51.284352), 0);
    let hotel = new Waypoint(lonToX1(4.807622), latToY1(51.173261), 0);
    let duffy = new Waypoint(lonToX1(4.494610), latToY1(51.085801), 0);
    let tango = new Waypoint(lonToX1(4.219559), latToY1(51.121318), 0);

    let ehmz = new SAM(lonToX3(3, 43, 52), latToY3(51, 30, 44), 0, 20);
    let ehwo = new SAM(lonToX3(4, 20, 30), latToY3(51, 26, 56), 0, 8);
    let ebbr = new SAM(lonToX3(4, 29,  4), latToY3(50, 54,  5), 0, 10);

    // let waypoints = [piraeusstraat, hotel, duffy, tango]
    let waypoints = [ekere, hotel, duffy, tango]
    me.waypoints = waypoints

    objects.push(me)
    objects.push(...me.weapons)
    objects.push(...waypoints)
    objects.push(ehmz, ehwo, ebbr)

    let mapScales = [40, 20, 10, 5, 2, 1]
    let mapScale = 2

    clear(main)

    let canvas = document.createElement("canvas");
    canvas.width = canvasSize + 1
    canvas.height = canvasSize + 1
    main.appendChild(canvas)
    let ctx = canvas.getContext("2d");

    function onStartMouse(ev) {
        let lastDragX = ev.offsetX
        let lastDragY = ev.offsetY

        function onMoveMouse(ev) {
            curX += ev.offsetX - lastDragX
            curY += ev.offsetY - lastDragY
            if(curX < 0) {
                curX = 0
            }
            if(curY < 0) {
                curY = 0
            }
            if(curX > canvasSize) {
                curX = canvasSize
            }
            if(curY > canvasSize) {
                curY = canvasSize
            }
            lastDragX = ev.offsetX
            lastDragY = ev.offsetY
            draw()
        }

        function onEnd() {
            canvas.onmousemove = null
            canvas.onmouseup = null
            canvas.onmouseleave = null
        }

        canvas.onmousemove = onMoveMouse
        canvas.onmouseup = onEnd
        canvas.onmouseleave = onEnd
    }

    let touchPoints = {}
    function onStartTouch(ev) {
        for (let i = 0; i < ev.changedTouches.length; i++) {
            let touch = ev.changedTouches[i];
            touchPoints[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY
            }
        }
    }
    function onTouchMove(ev) {
        for (let i = 0; i < ev.changedTouches.length; i++) {
            let touch = ev.changedTouches[i];
            let old = touchPoints[touch.identifier]
            curX += touch.clientX - old.x
            curY += touch.clientY - old.y
            if(curX < 0) {
                curX = 0
            }
            if(curY < 0) {
                curY = 0
            }
            if(curX > canvasSize) {
                curX = canvasSize
            }
            if(curY > canvasSize) {
                curY = canvasSize
            }
            touchPoints[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY
            }
        }
        draw()
        // To prevent things like reshaping and refreshing etc
        ev.preventDefault()
    }
    function onTouchEnd(ev) {
        for (let i = 0; i < ev.changedTouches.length; i++) {
            let touch = ev.changedTouches[i];
            delete touchPoints[touch.identifier]
        }
    }
    canvas.onmousedown = onStartMouse
    // canvas.addEventListener("touchstart", onStartTouch)
    canvas.ontouchstart = onStartTouch
    canvas.ontouchmove = onTouchMove
    canvas.ontouchend = onTouchEnd
    canvas.ontouchcancel = onTouchEnd

    let controls = document.createElement("canvas");
    controls.width = canvasSize + 1
    let controlHeight = canvasSize / 4;
    controls.height = controlHeight + 1
    main.appendChild(controls)
    let ctrl = controls.getContext("2d");

    let dropButton = new Path2D();
    dropButton.arc(canvasSize - controlHeight/4 + 0.5, controlHeight / 4 * 3 + 0.5, controlHeight / 5, 0, Math.PI * 2);

    let weaponPath = []
    for (let i = 0; i < 4; i++) {
        let weapPath = new Path2D();
        weapPath.arc(i * controlHeight / 2 + controlHeight / 4 + 0.5, controlHeight / 4 + 0.5, controlHeight / 5, 0, Math.PI * 2);
        weaponPath.push(weapPath)
    }

    let waypointPath = []
    for (let i = 0; i < 4; i++) {
        let wpPath = new Path2D();
        wpPath.arc(i * controlHeight / 2 + controlHeight / 4 + 0.5, controlHeight / 4 * 3 + 0.5, controlHeight / 5, 0, Math.PI * 2);
        waypointPath.push(wpPath)
    }

    let scalePath = new Path2D()
    scalePath.rect(controlHeight * 2.55 + 0.5, controlHeight * 0.05 + 0.5, controlHeight * 0.4, controlHeight * 0.4)

    controls.onclick = (ev) => {
        if(ctrl.isPointInPath(dropButton, ev.offsetX, ev.offsetY)) {
            me.dropPressed()
        }
        for (let i = 0; i < 4; i++) {
            let weapPath = weaponPath[i]
            if(ctrl.isPointInPath(weapPath, ev.offsetX, ev.offsetY)) {
                me.weaponPressed(i)
            }
        }
        for (let i = 0; i < 4; i++) {
            let wpPath = waypointPath[i]
            if(ctrl.isPointInPath(wpPath, ev.offsetX, ev.offsetY)) {
                me.waypointPressed(i)
            }
        }
        if(ctrl.isPointInPath(scalePath, ev.offsetX, ev.offsetY)) {
            mapScale = (mapScale + 1) % mapScales.length
        }
        draw()
    }

    function onGeolocation(time, x, y, alt) {
        me.updatePos(time, x, y, alt)
    }

    positionUpdated = onGeolocation
    onGeolocation(time, x, y, alt)

    setInterval(() => {
        let time = new Date().getTime();
        for (let object of objects) {
            object.update(time / 1000)
        }
        draw()
    }, 100)

    function draw() {
        let scale = canvasSize / (2 * mapScales[mapScale])

        let c_x = me.x * scale - (canvasSize / 2 + 0.5)
        let c_y = -me.y * scale - (canvasSize / 2 + 0.5)

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
        let p1_x =  lonToX3( 4, 16,  0) * scale - c_x;
        let p1_y = -latToY3(51, 16,  6) * scale - c_y;
        let p2_x =  lonToX3( 4, 37, 37) * scale - c_x;
        let p2_y = -latToY3(51, 16,  6) * scale - c_y;
        let p3_x =  lonToX3( 4, 47, 46) * scale - c_x;
        let p3_y = -latToY3(51, 10,  5) * scale - c_y;
        let p4_x =  lonToX3( 4, 18, 45) * scale - c_x;
        let p4_y = -latToY3(51,  4, 32) * scale - c_y;
        let r_x =   lonToX3( 4, 26,  0) * scale - c_x;
        let r_y =  -latToY3(51, 11,  7) * scale - c_y;

        ctx.moveTo(p2_x, p2_y)
        ctx.lineTo(p3_x, p3_y)
        ctx.arc(
            r_x, r_y, 8 * scale,
            Math.atan2(p4_y - r_y, p4_x - r_x),
            Math.atan2(p1_y - r_y, p1_x - r_x),
            false
        )

        ctx.closePath()
        ctx.fillStyle = "#000020";
        // ctx.fillStyle = "lightblue";
        ctx.strokeStyle = "blue";
        ctx.fill()
        ctx.stroke()

        for (let object of objects) {
            if(object instanceof MyPlane) {
                let p1 = rotate([0, 8], -object.heading)
                let t1 = rotate([0, 0], -object.heading)
                let t2 = rotate([8, -14], -object.heading)
                let t3 = rotate([-8, -14], -object.heading)

                ctx.fillStyle = "white"
                ctx.strokeStyle = "white"
                ctx.beginPath()
                ctx.moveTo(
                    object.x * scale - c_x + p1[0],
                    -object.y * scale - c_y - p1[1]
                )
                ctx.lineTo(
                    object.x * scale - c_x,
                    -object.y * scale - c_y
                )
                ctx.stroke()
                ctx.beginPath()
                ctx.moveTo(
                    object.x * scale - c_x + t1[0],
                    -object.y * scale - c_y - t1[1]
                )
                ctx.lineTo(
                    object.x * scale - c_x + t2[0],
                    -object.y * scale - c_y - t2[1]
                )
                ctx.lineTo(
                    object.x * scale - c_x + t3[0],
                    -object.y * scale - c_y - t3[1]
                )
                ctx.closePath()
                ctx.fill()

                if(object.selectedWeapon != null) {
                    let weap = object.weapons[object.selectedWeapon]
                    if(weap.inRange) {
                        ctx.strokeStyle = "green"
                    } else {
                        ctx.strokeStyle = "grey"
                    }
                    ctx.beginPath()
                    ctx.arc(
                        weap.impactPoint.x * scale - c_x,
                        -weap.impactPoint.y * scale - c_y,
                        weap.impactPoint.radius * scale,
                        0, Math.PI * 2
                    )
                    ctx.stroke()
                }
            }
            if(object instanceof SAM) {
                // ctx.fillStyle = "#ffaaaa"
                ctx.fillStyle = "#200000"
                ctx.strokeStyle = "red"
                ctx.beginPath()
                ctx.arc(
                    object.x * scale - c_x,
                    -object.y * scale - c_y,
                    object.range * scale,
                    0, Math.PI * 2
                )
                ctx.fill()
                ctx.stroke()
            }
            if(object instanceof Waypoint) {
                ctx.strokeStyle = "white"
                // ctx.fillStyle = "white"
                ctx.beginPath()
                ctx.arc(
                    object.x * scale - c_x,
                    -object.y * scale - c_y,
                    2,
                    0, Math.PI * 2
                )
                // ctx.fill()
                ctx.stroke()
            }
            if(object instanceof Bomb) {
                if(
                    (me.selectedWeapon != null &&
                    me.weapons[me.selectedWeapon] === object &&
                    object.target != null) ||
                    (object.falling && object.target != null)
                ) {
                    ctx.beginPath()
                    ctx.strokeStyle = "red"
                    ctx.setLineDash([3, 5])
                    ctx.moveTo(
                        object.x * scale - c_x,
                        -object.y * scale - c_y
                    )
                    ctx.lineTo(
                        object.target.x * scale - c_x,
                        -object.target.y * scale - c_y,
                    )
                    ctx.stroke()
                    ctx.setLineDash([])
                }
                if(object.falling) {
                    ctx.fillStyle = "blue"
                    ctx.beginPath()
                    ctx.arc(
                        object.x * scale - c_x,
                        -object.y * scale - c_y,
                        2,
                        0, Math.PI * 2
                    )
                    ctx.fill()
                }
            }
        }

        ctx.strokeStyle = "white"
        ctx.strokeRect(Math.round(curX) - 10 + 0.5, Math.round(curY) - 10 + 0.5, 20, 20)

        ctrl.clearRect(0, 0, controls.width, controls.height)

        ctrl.fillStyle = "red"
        ctrl.fill(dropButton)

        for (let i = 0; i < 4; i++) {
            let weap = me.weapons[i];
            if(weap != null) {
                if(i === me.selectedWeapon) {
                    ctrl.fillStyle = "green"
                    ctrl.fill(weaponPath[i])
                } else {
                    ctrl.strokeStyle = "green"
                    ctrl.stroke(weaponPath[i])
                }
            }
        }

        for (let i = 0; i < 4; i++) {
            ctrl.fillStyle = "white"
            ctrl.fill(waypointPath[i])
        }

        ctrl.strokeStyle = "white"
        ctrl.stroke(scalePath)

        ctrl.font = controlHeight / 5 + "px sans-serif"
        ctrl.textAlign = "center"
        ctrl.textBaseline = "middle"
        ctrl.fillText(mapScales[mapScale].toString(), controlHeight * 2.75, controlHeight / 4)

        ctrl.font = controlHeight / 10 + "px sans-serif"
        ctrl.textAlign = "center"
        ctrl.textBaseline = "middle"
        ctrl.fillText(Math.round(me.heading / Math.PI * 180).toString(), controlHeight * 2.75, controlHeight * 0.6)
        ctrl.fillText(Math.round(Math.sqrt(me.vx * me.vx + me.vy * me.vy) * 3600).toString(), controlHeight * 2.75, controlHeight * 0.75)
        ctrl.fillText(Math.round(me.alt).toString(), controlHeight * 2.75, controlHeight * 0.9)
    }
}

function loadGeoLocation() {
    if (navigator.geolocation) {
        error("Waiting for Geolocation...");
        watchId = navigator.geolocation.watchPosition((pos) => {
            positionUpdated(
                pos.timestamp / 1000,
                lonToX1(pos.coords.longitude),
                latToY1(pos.coords.latitude),
                pos.coords.altitude * altScale
            );
        }, null, {
            enableHighAccuracy: true
        })
    } else {
        error("No Geolocation")
    }
}

function loadFakeGeo() {
    let x = 0
    let y = 0
    let alt = arp.alt
    let heading = 0
    let velocity = 0
    let horizontalVelocity = 0
    let time = 0

    setInterval(() => {
        time = new Date().getTime() / 1000
        x += Math.sin(heading * Math.PI / 180) * velocity / 3600
        y += Math.cos(heading * Math.PI / 180) * velocity / 3600
        alt += horizontalVelocity / 60
        positionUpdated(time, x, y, alt)
    }, 1000)

    let body = document.getElementsByTagName("body")[0]

    function addControl(initVal, onUpdate, step) {
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
        divH.appendChild(buttonHmmm)
        divH.appendChild(buttonHmm)
        divH.appendChild(buttonHm)
        divH.appendChild(textH)
        divH.appendChild(buttonHp)
        divH.appendChild(buttonHpp)
        divH.appendChild(buttonHppp)

        body.appendChild(divH)
    }

    addControl(heading, (newHead) => {
        heading = newHead
        if(heading < 0) {
            heading += 360
        }
        if(heading >= 360) {
            heading -= 360
        }
        return heading
    }, 1)
    addControl(velocity, (newVel) => {
        velocity = newVel
        if(velocity < 0) {
            velocity = 0
        }
        return velocity
    }, 1)
    addControl(horizontalVelocity, (newHVel) => {
        horizontalVelocity = newHVel
        return horizontalVelocity
    }, 10)
}
