let main = document.getElementById('main');

let watchId = null
let arp = {
    lat: 51 + 11 / 60 + 22 / 3600,
    lon: 4 + 27 / 60 + 37 / 3600,
    alt: 32
}
let altAmsl = 148
let xScale = Math.cos(arp.lat * Math.PI / 180) * 60
let yScale = 60
let altScale = 1/0.3048

let bombOffsetPerFoot = Math.tan(10 / 180 * Math.PI) / 6076
let bombSpeedFactor = 0.75

const canvasSize = 560
const blockSize = canvasSize / 7

// X in nm
function latToY1(lat) {
    return (lat - arp.lat) * yScale
}
function latToY3(deg, min, sec) {
    return latToY1(deg + min / 60 + sec / 3600)
}

function yToLat1(y) {
    return y / yScale + arp.lat
}
function yToLat3(y) {
    let lat = yToLat1(y);
    let deg = Math.floor(lat)
    lat = (lat - deg) * 60
    let min = Math.floor(lat)
    lat = (lat - min) * 60
    let sec = Math.round(lat)
    return [deg, min, sec]
}

// Y in nm
function lonToX1(lon) {
    return (lon - arp.lon) * xScale
}
function lonToX3(deg, min, sec) {
    return lonToX1(deg + min / 60 + sec / 3600)
}

function xToLon1(x) {
    return x / xScale + arp.lon
}
function xToLon3(x) {
    let lon = xToLon1(x);
    let deg = Math.floor(lon)
    lon = (lon - deg) * 60
    let min = Math.floor(lon)
    lon = (lon - min) * 60
    let sec = Math.round(lon)
    return [deg, min, sec]
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

let isTest = location.search.includes("test")

let positionUpdated = (time, x, y, alt) => {
    startGame(time, x, y, alt);
}
if(isTest) {
    loadFakeGeo()
} else {
    loadGeoLocation()
}

function rotate(xy, angle) {
    return [
        Math.cos(angle) * xy[0] - Math.sin(angle) * xy[1],
        Math.sin(angle) * xy[0] + Math.cos(angle) * xy[1]
    ]
}

function startGame(time, x, y, alt) {
    let world = new World();
    let me = new MyPlane(time, x, y, alt, world);
    world.add(me)
    world.add(me.weapons[0])
    world.add(me.weapons[1])
    world.add(me.weapons[2])
    world.add(me.weapons[3])
    let avionics = new Avionics(me, world);
    avionics.loadWeapons()

    let piraeusstraat = new Waypoint(lonToX1(4.413013), latToY1(51.234931), 0);
    let ekere = new Waypoint(lonToX1(4.435213), latToY1(51.284352), 0);
    let hotel = new Waypoint(lonToX1(4.807622), latToY1(51.173261), 0);
    let duffy = new Waypoint(lonToX1(4.494610), latToY1(51.085801), 0);
    let tango = new Waypoint(lonToX1(4.219559), latToY1(51.121318), 0);

    avionics.waypoints.push(ekere, hotel, duffy, tango)

    // Ekere
    world.add(new Structure(
        lonToX1(4.435279), latToY1(51.284138), 0,
        0.012, 0.03, Math.PI / 4
    ))
    // Hotel
    world.add(new Structure(
        lonToX1(4.806521), latToY1(51.172870), 0,
        0.006, 0.085, -Math.PI / 3
    ))
    // Duffy
    world.add(new Structure(
        lonToX1(4.494610), latToY1(51.085260), 0,
        0.012, 0.06, 0.2
    ))
    // Tango
    world.add(new Structure(
        lonToX1(4.218908), latToY1(51.119683), 0,
         0.02, 0.2, -Math.PI / 18
    ))
    let ehmz = new SAM(lonToX3(3, 43, 52), latToY3(51, 30, 44), 0, 20);
    let ehwo = new SAM(lonToX3(4, 20, 30), latToY3(51, 26, 56), 0, 8);
    let ebbr = new SAM(lonToX3(4, 29,  4), latToY3(50, 54,  5), 0, 10);

    world.add(ehmz);
    world.add(ehwo);
    world.add(ebbr);

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
            avionics.moveCursor(
                ev.offsetX - lastDragX,
                ev.offsetY - lastDragY
            )
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

            avionics.moveCursor(
                touch.clientX - old.x,
                touch.clientY - old.y
            )

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
    canvas.ontouchstart = onStartTouch
    canvas.ontouchmove = onTouchMove
    canvas.ontouchend = onTouchEnd
    canvas.ontouchcancel = onTouchEnd

    canvas.onclick = (ev) => {
        let x = Math.floor(ev.offsetX / blockSize)
        let y = Math.floor(ev.offsetY / blockSize)

        if(y === 0) {
            avionics.onButton('N', x - 1)
        } else if(y === 6) {
            avionics.onButton('S', x - 1)
        } else if(x === 0) {
            avionics.onButton('W', y - 1)
        } else if(x === 6) {
            avionics.onButton('E', y - 1)
        }
        draw()
    }

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

    controls.onclick = (ev) => {
        if(ctrl.isPointInPath(dropButton, ev.offsetX, ev.offsetY)) {
            avionics.dropPressed()
        }
        for (let i = 0; i < 4; i++) {
            let weapPath = weaponPath[i]
            if(ctrl.isPointInPath(weapPath, ev.offsetX, ev.offsetY)) {
                avionics.weaponPressed(i)
            }
        }
        for (let i = 0; i < 4; i++) {
            let wpPath = waypointPath[i]
            if(ctrl.isPointInPath(wpPath, ev.offsetX, ev.offsetY)) {
                avionics.waypointPressed(i + 1)
            }
        }
        draw()
    }

    function onGeolocation(time, x, y, alt) {
        me.updatePos(time, x, y, alt)
        avionics.update()
        draw()
    }

    positionUpdated = onGeolocation

    setInterval(() => {
        let time = new Date().getTime();
        world.update(time / 1000)
        draw()
    }, 100)

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        avionics.selectedPage.draw(ctx)

        ctrl.clearRect(0, 0, controls.width, controls.height)

        ctrl.fillStyle = "red"
        ctrl.fill(dropButton)

        for (let i = 0; i < 4; i++) {
            let weap = avionics.weapons[i];
            if(weap != null) {
                if(i === avionics.selectedWeapon) {
                    ctrl.fillStyle = "green"
                    ctrl.fill(weaponPath[i])
                } else {
                    ctrl.strokeStyle = "green"
                    ctrl.stroke(weaponPath[i])
                }
            }
        }

        for (let i = 0; i < 4; i++) {
            if(i + 1 === avionics.selectedWaypoint) {
                ctrl.fillStyle = "white"
                ctrl.fill(waypointPath[i])
            } else {
                ctrl.strokeStyle = "white"
                ctrl.stroke(waypointPath[i])
            }
        }

        ctrl.font = controlHeight / 10 + "px sans-serif"
        ctrl.fillStyle = "white"
        ctrl.textAlign = "center"
        ctrl.textBaseline = "middle"
        ctrl.fillText(Math.round(avionics.heading()).toString(), controlHeight * 2.75, controlHeight * 0.6)
        ctrl.fillText(Math.round(avionics.speed()).toString(), controlHeight * 2.75, controlHeight * 0.75)
        ctrl.fillText(Math.round(avionics.alt).toString(), controlHeight * 2.75, controlHeight * 0.9)

        if(location.search.includes("grid")) {
            ctx.strokeStyle = "#404040"
            for (let i = 0; i < 8; i++) {
                ctx.beginPath()
                ctx.moveTo(0, i * blockSize + 0.5)
                ctx.lineTo(canvasSize + 1, i * blockSize + 0.5)
                ctx.stroke()
                ctx.beginPath()
                ctx.moveTo(i * blockSize + 0.5, 0)
                ctx.lineTo(i * blockSize + 0.5, canvasSize + 1)
                ctx.stroke()
            }
        }
    }
    draw()
}

// Avionics

class Avionics {
    mapScales = [40, 20, 10, 5, 2, 1]

    constructor(me, world) {
        this.me = me

        this.weapons = [null, null, null, null]
        this.selectedWeapon = null

        this.waypoints = []
        this.selectedWaypoint = 0
        this.flightplan = []

        this.canvasSize = canvasSize
        this.curX = canvasSize / 2
        this.curY = canvasSize / 2
        this.mapScale = 2

        this.hsd = new HsdPage(this, world)
        this.wpt = new WptPage(this)
        this.selectedPage = this.hsd

        this.update()
        this.waypoints.push(new Waypoint(
            this.x,
            this.y
        ))
    }

    update() {
        this.x = this.me.x
        this.y = this.me.y
        this.alt = this.me.alt
        this.vx = this.me.vx
        this.vy = this.me.vy
    }

    loadWeapons() {
        for (let i = 0; i < 4; i++) {
            if(this.me.weapons[i] === null) {
                this.weapons[i] = null
            } else {
                this.weapons[i] = new BombInfo()
            }
        }
    }

    heading() {
        let heading = 90 - Math.atan2(this.vy, this.vx) / Math.PI * 180
        if(heading < 0) {
            heading += 360
        }
        return heading
    }

    speed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 3600
    }

    moveCursor(dx, dy) {
        this.curX += dx
        this.curY += dy

        if(this.curX < 0) {
            this.curX = 0
        }
        if(this.curY < 0) {
            this.curY = 0
        }
        if(this.curX > this.canvasSize) {
            this.curX = this.canvasSize
        }
        if(this.curY > this.canvasSize) {
            this.curY = this.canvasSize
        }
    }

    dropPressed() {
        if(this.selectedWeapon != null) {
            this.me.drop(this.selectedWeapon, this.weapons[this.selectedWeapon].target)
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
        if(i === this.selectedWaypoint) {
            this.selectedWaypoint = 0
        } else {
            this.selectedWaypoint = i
            if(this.selectedWeapon != null && this.weapons[this.selectedWeapon] !== null) {
                this.weapons[this.selectedWeapon].target = this.waypoints[i]
            }
        }
    }

    incrScale() {
        if(this.mapScale > 0) {
            this.mapScale--
        }
    }

    decrScale() {
        if(this.mapScale < this.mapScales.length - 1) {
            this.mapScale++
        }
    }

    incrWaypoint() {
        if(this.selectedWaypoint < this.waypoints.length - 1) {
            this.selectedWaypoint++
        }
    }

    decrWaypoint() {
        if(this.selectedWaypoint > 0) {
            this.selectedWaypoint--
        }
    }

    moveUp() {
        let idx = this.flightplan.indexOf(this.selectedWaypoint)
        if (idx === -1) {
            this.flightplan.push(this.selectedWaypoint)
        } else if(idx === 0) {
            this.flightplan.shift()
        } else {
            this.flightplan[idx] = this.flightplan[idx - 1]
            this.flightplan[idx - 1] = this.selectedWaypoint
        }
    }

    moveDown() {
        let idx = this.flightplan.indexOf(this.selectedWaypoint)
        if (idx === -1) {
            this.flightplan.unshift(this.selectedWaypoint)
        } else if(idx === this.flightplan.length - 1) {
            this.flightplan.pop()
        } else {
            this.flightplan[idx] = this.flightplan[idx + 1]
            this.flightplan[idx + 1] = this.selectedWaypoint
        }
    }

    onButton(row, button) {
        this.selectedPage.onButton(row, button)
    }
}

class Waypoint {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
}

function solveQuadratic(a, b, c) {
    let d = b * b - 4 * a * c
    if(d < 0) {
        return []
    } else if(d === 0) {
        return [-b / (2 * a)]
    } else {
        return [
            (-b + Math.sqrt(d)) / (2 * a),
            (-b - Math.sqrt(d)) / (2 * a),
        ]
    }
}

function calcImpactPoint(x, y, alt, vx, vy, valt) {
    let q = solveQuadratic(32.174 / 2, valt, -alt)
    let maybeT = q.filter(t => t >= 0)
    if(maybeT.length === 0) {
        return null
    } else {
        let t = maybeT[0]
        return {
            x: x + t * vx,
            y: y + t * vy,
        }
    }
}

class BombInfo {
    constructor() {
        this.target = null
    }

    impactPoint(x, y, alt, vx, vy) {
        let impPoint = calcImpactPoint(x, y, alt, vx * bombSpeedFactor, vy * bombSpeedFactor, 0);

        let r = alt * bombOffsetPerFoot

        let inRange
        if(this.target == null) {
            inRange = false
        } else {
            let dx = impPoint.x - this.target.x;
            let dy = impPoint.y - this.target.y;
            inRange = dx * dx + dy * dy < r * r;
        }

        return {
            x: impPoint.x,
            y: impPoint.y,
            r: r,
            inRange: inRange
        }
    }
}

// Simulation

class World {
    constructor() {
        this.objects = []
    }

    add(object) {
        this.objects.push(object)
    }

    update(time) {
        for (let object of this.objects) {
            object.update(time)
        }
    }
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
    constructor(time, x, y, alt, world) {
        super(x, y, alt);
        this.weapons = [
            new Bomb(world),
            new Bomb(world),
            new Bomb(world),
            new Bomb(world),
        ]
        this.waypoints = []
        this.time = time
        this.vx = 0
        this.vy = 0
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

        for (let weap of this.weapons) {
            if(weap != null) {
                weap.updateFromPlane(x, y, alt, this.vx, this.vy)
            }
        }
    }

    drop(weapon, target) {
        this.weapons[weapon].drop(this.time, target)
        this.weapons[weapon] = null
    }
}

class SAM extends GameObj {
    constructor(x, y, alt, range) {
        super(x, y, alt);
        this.range = range;
    }
}

class Bomb extends GameObj {
    constructor(world) {
        super(0, 0, 0);
        this.vx = 0
        this.vy = 0
        this.valt = 0
        this.falling = false
        this.world = world
    }

    updateFromPlane(x, y, alt, vx, vy) {
        this.x = x
        this.y = y
        this.alt = alt
        this.vx = vx
        this.vy = vy
    }

    update(time) {
        if(this.falling) {
            let dt = time - this.time
            this.time = time
            let oldAlt = this.alt
            let oldValt = this.valt

            // This order is mathematically correct
            let dalt = this.valt * dt + 32.174 * dt * dt / 2
            this.alt -= dalt
            this.valt += 32.174 * dt

            let dx = 0
            let dy = 0

            if(this.target !== null) {
                let maxOffset = dalt * bombOffsetPerFoot
                let impPoint = calcImpactPoint(this.x, this.y, oldAlt, this.vx, this.vy, oldValt)
                let dxx = this.target.x - impPoint.x
                let dyy = this.target.y - impPoint.y
                if(dxx * dxx + dyy + dyy <= maxOffset * maxOffset) {
                    dx = dxx
                    dy = dyy
                } else {
                    let angle = Math.atan2(dyy, dxx)
                    dx = Math.cos(angle) * maxOffset
                    dy = Math.sin(angle) * maxOffset
                }
            }

            let oldX = this.x
            let oldY = this.y

            this.x += this.vx * dt + dx
            this.y += this.vy * dt + dy

            let toDelete = null
            for (let object of this.world.objects) {
                if(object instanceof Structure &&
                    this.alt <= object.alt && object.alt <= oldAlt
                ) {
                    let u = (oldAlt - object.alt) / (oldAlt - this.alt)
                    let xAtAlt = this.x * u + oldX * (1 - u)
                    let yAtAlt = this.y * u + oldY * (1 - u)

                    if(object.isInside(xAtAlt, yAtAlt)) {
                        toDelete = object
                        break
                    }
                }
            }
            if(toDelete !== null) {
                let idx = this.world.objects.indexOf(toDelete)
                this.world.objects.splice(idx, 1)
                idx = this.world.objects.indexOf(this)
                if(idx !== -1) {
                    this.world.objects.splice(idx, 1)
                }
            }


            if(this.alt < 0) {
                let idx = this.world.objects.indexOf(this)
                if(idx !== -1) {
                    this.world.objects.splice(idx, 1)
                }
            }
        }
    }

    drop(time, target) {
        this.falling = true
        this.time = time
        this.vx = bombSpeedFactor * this.vx
        this.vy = bombSpeedFactor * this.vy
        this.target = target
    }
}

class Structure extends GameObj {
    constructor(x, y, alt, dx, dy, rotation) {
        super(x, y, alt);
        this.dx = dx
        this.dy = dy
        this.rotation = rotation
    }

    isInside(x, y) {
        let xy2 = rotate([x - this.x, y - this.y], -this.rotation)
        return 0 <= xy2[0] && xy2[0] <= this.dx &&
                0 <= xy2[1] && xy2[1] <= this.dy
    }
}

// Geolocation

function loadGeoLocation() {
    if (navigator.geolocation) {
        error("Waiting for Geolocation...");
        watchId = navigator.geolocation.watchPosition((pos) => {
            if(pos.coords.altitude === null) {
                error("No altitude data")
                navigator.geolocation.clearWatch(watchId)
            } else {
                positionUpdated(
                    pos.timestamp / 1000,
                    lonToX1(pos.coords.longitude),
                    latToY1(pos.coords.latitude),
                    pos.coords.altitude * altScale - altAmsl
                );
            }
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

// TODO
if ("wakeLock" in navigator) {
    navigator.wakeLock.request()
}
document.onvisibilitychange = (ev) => {
    if(!document.hidden) {
        navigator.wakeLock.request()
    }
}

class Page {
    constructor(avionics) {
        this.north = [() => {}, () => {}, () => {}, () => {}, () => {}]
        this.east = [() => {}, () => {}, () => {}, () => {}, () => {}]
        this.south = [() => {}, () => {}, () => {}, () => {}, () => {}]
        this.west = [() => {}, () => {}, () => {}, () => {}, () => {}]
        this.toDraw = []
        this.avionics = avionics
    }
    addPageButtons() {
        this.addButton('S', 1, "WPN",
            () => false,
            () => {}
        )
        // this.addButton('S', 1, "RDR",
        //     () => false,
        //     () => {}
        // )
        this.addButton('S', 2, "HSD",
            () => this.avionics.selectedPage === this.avionics.hsd,
            () => this.avionics.selectedPage = this.avionics.hsd
        )
        this.addButton('S', 3, "WPT",
            () => this.avionics.selectedPage === this.avionics.wpt,
            () => this.avionics.selectedPage = this.avionics.wpt
        )
    }
    onButton(row, button) {
        this.resolveRow(row)[button]()
    }
    resolveRow(row) {
        switch (row) {
            case 'N':
                return this.north
            case 'E':
                return this.east
            case 'S':
                return this.south
            case 'W':
                return this.west
        }
        throw "Invalid row " + row
    }
    addRocker(row, firstButton, getText, onIncr, onDecr) {
        let x;
        switch (row) {
            case 'W':
                x = 0
                break
            case 'E':
                x = 6
                break
            default:
                throw "Invalid row " + row
        }
        this.resolveRow(row)[firstButton] = onIncr;
        this.resolveRow(row)[firstButton + 1] = onDecr;
        this.toDraw.push((ctx) => {
            ctx.font = "30px courier"
            ctx.fillStyle = "white"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"

            ctx.fillText(getText(), blockSize * (x + 0.5) + 0.5, blockSize * (firstButton + 2) + 0.5)
            ctx.beginPath()
            ctx.moveTo(blockSize * (x + 0.5) + 0.5, blockSize * (firstButton + 1.25) + 0.5)
            ctx.lineTo(blockSize * (x + 0.2) + 0.5, blockSize * (firstButton + 1.5) + 0.5)
            ctx.lineTo(blockSize * (x + 0.8) + 0.5, blockSize * (firstButton + 1.5) + 0.5)
            ctx.closePath()
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(blockSize * (x + 0.5) + 0.5, blockSize * (firstButton + 2.75) + 0.5)
            ctx.lineTo(blockSize * (x + 0.2) + 0.5, blockSize * (firstButton + 2.5) + 0.5)
            ctx.lineTo(blockSize * (x + 0.8) + 0.5, blockSize * (firstButton + 2.5) + 0.5)
            ctx.closePath()
            ctx.stroke()
        })
    }
    addButton(row, button, text, getSelected, onPressed) {
        let x, y;
        switch (row) {
            case 'N':
                x = button + 1.5
                y = 0.25
                break
            case 'E':
                x = 6.5
                y = button + 1.5
                break
            case 'S':
                x = button + 1.5
                y = 6.75
                break
            case 'W':
                x = 0.5
                y = button + 1.5
                break
            default:
                throw "Invalid row " + row
        }
        this.resolveRow(row)[button] = onPressed
        this.toDraw.push((ctx) => {
            ctx.font = "30px courier"
            ctx.fillStyle = "white"
            ctx.strokeStyle = "white"
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"

            ctx.fillText(text, blockSize * x + 0.5, blockSize * y + 0.5)
            if(getSelected()) {
                ctx.strokeRect(blockSize * (x - 0.45) + 0.5, blockSize * (y - 0.2) + 0.5, blockSize * 0.9, blockSize * 0.4)
            }
        })
    }

    drawWidgets(ctx) {
        for (let toDraw of this.toDraw) {
            toDraw(ctx)
        }
    }
}

class HsdPage extends Page {
    constructor(avionics, world) {
        super(avionics)
        this.world = world;
        this.addPageButtons()
        this.addRocker('W', 0,
            () => avionics.mapScales[avionics.mapScale].toString(),
            () => this.avionics.incrScale(),
            () => this.avionics.decrScale()
        )
        this.addRocker('E', 0,
            () => avionics.selectedWaypoint.toString(),
            () => this.avionics.incrWaypoint(),
            () => this.avionics.decrWaypoint()
        )
        this.addButton('N', 0, "TRK", () => false, () => {})
        this.addButton('N', 1, "NTH", () => true, () => {})
    }
    draw(ctx) {
        let scale = canvasSize / (2 * this.avionics.mapScales[this.avionics.mapScale])

        let c_x = this.avionics.x * scale - (canvasSize / 2 + 0.5)
        let c_y = -this.avionics.y * scale - (canvasSize / 2 + 0.5)

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
        ctx.strokeStyle = "blue";
        ctx.fill()
        ctx.stroke()

        let heading = Math.atan2(this.avionics.vy, this.avionics.vx)
        let p1 = rotate([8, 0], heading)
        let t1 = rotate([0, 0], heading)
        let t2 = rotate([-14, 8], heading)
        let t3 = rotate([-14, -8], heading)

        ctx.fillStyle = "white"
        ctx.strokeStyle = "white"
        ctx.beginPath()
        ctx.moveTo(
            this.avionics.x * scale - c_x + p1[0],
            -this.avionics.y * scale - c_y - p1[1]
        )
        ctx.lineTo(
            this.avionics.x * scale - c_x,
            -this.avionics.y * scale - c_y
        )
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(
            this.avionics.x * scale - c_x + t1[0],
            -this.avionics.y * scale - c_y - t1[1]
        )
        ctx.lineTo(
            this.avionics.x * scale - c_x + t2[0],
            -this.avionics.y * scale - c_y - t2[1]
        )
        ctx.lineTo(
            this.avionics.x * scale - c_x + t3[0],
            -this.avionics.y * scale - c_y - t3[1]
        )
        ctx.closePath()
        ctx.fill()

        if(this.avionics.selectedWeapon != null) {
            let weapon = this.avionics.weapons[this.avionics.selectedWeapon];
            let impact = weapon.impactPoint(
                this.avionics.x,
                this.avionics.y,
                this.avionics.alt,
                this.avionics.vx,
                this.avionics.vy,
            )
            if(impact.inRange) {
                ctx.strokeStyle = "green"
            } else {
                ctx.strokeStyle = "grey"
            }
            ctx.beginPath()
            ctx.arc(
                impact.x * scale - c_x,
                -impact.y * scale - c_y,
                impact.r * scale,
                0, Math.PI * 2
            )
            ctx.stroke()

            if(weapon.target !== null) {
                ctx.beginPath()
                ctx.strokeStyle = "red"
                ctx.setLineDash([3, 5])
                ctx.moveTo(
                    this.avionics.x * scale - c_x,
                    -this.avionics.y * scale - c_y
                )
                ctx.lineTo(
                    weapon.target.x * scale - c_x,
                    -weapon.target.y * scale - c_y,
                )
                ctx.stroke()
                ctx.setLineDash([])
            }
        }

        for (let i = 0; i < this.avionics.waypoints.length; i++) {
            let waypoint = this.avionics.waypoints[i]
            ctx.strokeStyle = "white"
            ctx.fillStyle = "white"
            ctx.beginPath()
            ctx.arc(
                waypoint.x * scale - c_x,
                -waypoint.y * scale - c_y,
                2,
                0, Math.PI * 2
            )
            if(i === this.avionics.selectedWaypoint) {
                ctx.fill()
            } else {
                ctx.stroke()
            }
        }

        if(this.avionics.flightplan.length !== 0) {
            let wp0 = this.avionics.waypoints[this.avionics.flightplan[0]]
            ctx.beginPath()
            ctx.moveTo(
                wp0.x * scale - c_x,
                -wp0.y * scale - c_y,
            )
            for (let i = 1; i < this.avionics.flightplan.length; i++) {
                let wp = this.avionics.waypoints[this.avionics.flightplan[i]]
                ctx.lineTo(
                    wp.x * scale - c_x,
                    -wp.y * scale - c_y,
                )
            }
            ctx.strokeStyle = "white"
            ctx.setLineDash([3, 5])
            ctx.stroke()
            ctx.setLineDash([])
        }

        for (let object of this.world.objects) {
            if(object instanceof SAM) {
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
            if(object instanceof Bomb) {
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
            if(object instanceof Structure) {
                ctx.strokeStyle = "red"

                let xy1 = rotate([0, object.dy], object.rotation)
                let xy2 = rotate([object.dx, object.dy], object.rotation)
                let xy3 = rotate([object.dx, 0], object.rotation)

                ctx.beginPath()
                ctx.moveTo(object.x * scale - c_x, -object.y * scale - c_y)
                ctx.lineTo((object.x + xy1[0]) * scale - c_x, -(object.y + xy1[1]) * scale - c_y)
                ctx.lineTo((object.x + xy2[0]) * scale - c_x, -(object.y + xy2[1]) * scale - c_y)
                ctx.lineTo((object.x + xy3[0]) * scale - c_x, -(object.y + xy3[1]) * scale - c_y)
                ctx.closePath()
                ctx.stroke()
            }
        }

        ctx.strokeStyle = "white"
        ctx.strokeRect(Math.round(this.avionics.curX) - 10 + 0.5, Math.round(this.avionics.curY) - 10 + 0.5, 20, 20)

        ctx.font = "20px courier"
        ctx.fillStyle = "white"
        ctx.strokeStyle = "white"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        ctx.fillText(Math.round(this.avionics.heading()).toString().padStart(3, '0'), blockSize * 0.5 + 0.5, blockSize * 0.35 + 0.5)
        ctx.fillText(Math.round(this.avionics.speed()).toString().padStart(3, ' '), blockSize * 0.5 + 0.5, blockSize * 0.65 + 0.5)

        super.drawWidgets(ctx)
    }
}

class WptPage extends Page {
    constructor(avionics) {
        super(avionics);
        this.addPageButtons()
        this.addRocker('E', 0,
            () => avionics.selectedWaypoint.toString(),
            () => this.avionics.incrWaypoint(),
            () => this.avionics.decrWaypoint()
        )
        this.addRocker('E', 3,
            () => "MOV",
            () => this.avionics.moveUp(),
            () => this.avionics.moveDown(),
        )
        this.addButton('W', 0, "LAT", () => false, () => {})
        this.addButton('W', 1, "LON", () => false, () => {})
        this.addButton('W', 2, "ALT", () => false, () => {})
    }

    draw(ctx) {
        ctx.font = "30px courier"
        ctx.fillStyle = "white"
        ctx.strokeStyle = "white"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"

        let wp = this.avionics.waypoints[this.avionics.selectedWaypoint]
        let lat = yToLat3(wp.y)
        let latTxt = "N  " +
            lat[0].toString().padStart(2, "0") + " " +
            lat[1].toString().padStart(2, "0") + " " +
            lat[2].toString().padStart(2, "0")
        let lon = xToLon3(wp.x)
        let lonTxt = "E " +
            lon[0].toString().padStart(3, "0") + " " +
            lon[1].toString().padStart(2, "0") + " " +
            lon[2].toString().padStart(2, "0")

        ctx.fillText(latTxt, 2 * blockSize + 0.5, blockSize * 1.5 + 0.5)
        ctx.fillText(lonTxt, 2 * blockSize + 0.5, blockSize * 2.5 + 0.5)
        ctx.fillText("0", 2 * blockSize + 0.5, blockSize * 3.5 + 0.5)

        ctx.fillText("Flight plan", blockSize + 0.5, blockSize * 4.5 + 0.5)

        ctx.textAlign = "center"

        for (let i = 0; i < this.avionics.flightplan.length && i < 6; i++) {
            ctx.fillText(this.avionics.flightplan[i].toString(), blockSize * (1.25 + i * 0.75) + 0.5, blockSize * 5 + 0.5)
            if(this.avionics.flightplan[i] === this.avionics.selectedWaypoint) {
                ctx.strokeRect(blockSize * (1.25 + i * 0.75 - 0.3) + 0.5, blockSize * (5 - 0.2) + 0.5, 0.6 * blockSize, 0.4 * blockSize)
            }
        }
        for (let i = 6; i < this.avionics.flightplan.length && i < 12; i++) {
            ctx.fillText(this.avionics.flightplan[i].toString(), blockSize * (1.25 + i * 0.75), blockSize * 5.5 + 0.5)
            if(this.avionics.flightplan[i] === this.avionics.selectedWaypoint) {
                ctx.strokeRect(blockSize * (1.25 + i * 0.75 - 0.3) + 0.5, blockSize * (5.5 - 0.2) + 0.5, 0.6 * blockSize, 0.4 * blockSize)
            }
        }

        super.drawWidgets(ctx)
    }
}
