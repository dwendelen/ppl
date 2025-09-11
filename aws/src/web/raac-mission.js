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

let positionUpdated = () => {}

if(navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition((position) => {
        positionUpdated(position);
    }, null, {
        enableHighAccuracy: true
    })
    positionUpdated = (newPos) => {
        if(false) {
        // if(newPos.altitude == null) {
            error("No Altitude in Geolocation")
        } else {
            startGame(newPos);
        }
    }
} else {
    error("No Geolocation")
}

class GameObj {
    constructor(x, y, alt) {
        this.x = x;
        this.y = y;
        this.alt = alt;
    }
    update() { }
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
        this.selectedWeapon = null
        this.time = 0
    }

    updatePos(time, x, y, alt) {
        let oldX = this.x
        let oldY = this.y
        let oldTime = this.time
        this.x = x;
        this.y = y;
        this.alt = alt;
        this.time = time;

        let dx = this.x - oldX;
        let dy = this.y - oldY;
        let dt = this.time - oldTime;
        this.vel = Math.sqrt(dx * dx + dy * dy) / dt;
        this.heading = Math.PI / 2 - Math.atan2(dy, dx)
        if(this.heading < 0) {
            this.heading += 2 * Math.PI
        }

        for (let weap of this.weapons) {
            if(weap != null) {
                weap.updateFromPlane(time, x, y, alt, this.heading, this.vel)
            }
        }
    }

    drop() {
        if(this.selectedWeapon != null) {
            this.weapons[this.selectedWeapon].drop(this.time)
            this.weapons[this.selectedWeapon] = null
            this.selectedWeapon = null
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
        this.heading = 0
        this.vel = 0
        this.target = null
        this.impactPoint = {
            x: 0,
            y: 0,
            radius: 0,
        }
        this.falling = false
        this.inRange = false
    }
    updateFromPlane(time, x, y, alt, vel) {
        this.x = x
        this.y = y
        this.alt = alt
        this.vel = vel

        let t = Math.sqrt(2 * this.alt / 32.174)
        let v = 0.75 * this.vel

        this.impactPoint = {
            x: this.x + Math.sin(this.heading) * v * t,
            y: this.y + Math.cos(this.heading) * v * t,
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
            this.inRange = true
        }
    }

    update(time) {
        if(this.falling) {
            let deltaTime = time - this.dropTime
            let deltaAlt = 32.174 * deltaTime * deltaTime / 2
            this.alt = this.dropAlt - deltaAlt
            if(this.alt < 0) {
                this.falling = false
            }
            let u = (this.dropAlt - this.alt) / this.dropAlt
            this.x = u * this.target.x + (1 - u) * this.dropX
            this.y = u * this.target.y + (1 - u) * this.dropY
        }
    }

    drop(time) {
        this.falling = true
        this.vel = 0.75 * this.vel
        this.dropX = this.x
        this.dropY = this.y
        this.dropAlt = this.alt
        this.dropTime = time
    }
}

function rotate(xy, angle) {
    return [
        Math.cos(angle) * xy[0] - Math.sin(angle) * xy[1],
        Math.sin(angle) * xy[0] + Math.cos(angle) * xy[1]
    ]
}

function startGame(lastRawPos) {
    let objects = []
    let me = new MyPlane(0, 0, 0, 0);

    let ekere = new Waypoint(lonToX1(4.435213), latToY1(51.284352), 0);
    let hotel = new Waypoint(lonToX1(4.807622), latToY1(51.173261), 0);
    let duffy = new Waypoint(lonToX1(4.494610), latToY1(51.085801), 0);
    let tango = new Waypoint(lonToX1(4.219559), latToY1(51.121318), 0);

    let ehmz = new SAM(lonToX3(3, 43, 52), latToY3(51, 30, 44), 0, 20);
    let ehwo = new SAM(lonToX3(4, 20, 30), latToY3(51, 26, 56), 0, 8);
    let ebbr = new SAM(lonToX3(4, 29,  4), latToY3(50, 54,  5), 0, 10);

    objects.push(me)
    objects.push(...me.weapons)
    objects.push(ekere, hotel, duffy, tango)
    objects.push(ehmz, ehwo, ebbr)

    // TODO clean up
    me.selectedWeapon = 0
    me.weapons[0].target = ekere

    let mapScale = 40
    let scale = 400 / mapScale
    clear(main)

    let canvas = document.createElement("canvas");
    canvas.width = 800
    canvas.height = 800
    let ctx = canvas.getContext("2d");

    main.appendChild(canvas)

    function onGeolocation(pos) {
        me.updatePos(
            pos.timestamp / 1000,
            lonToX1(pos.coords.longitude),
            latToY1(pos.coords.latitude),
            pos.coords.altitude * altScale
        )
        draw()
    }

    positionUpdated = onGeolocation
    onGeolocation(lastRawPos)

    function draw() {
        let c_x = me.x * scale - 400
        let c_y = -me.y * scale - 400

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
        ctx.fillStyle = "lightblue";
        ctx.strokeStyle = "blue";
        ctx.fill()
        ctx.stroke()

        for (let object of objects) {
            if(object instanceof MyPlane) {
                let p1 = rotate([0, 8], -object.heading)
                let t1 = rotate([0, 0], -object.heading)
                let t2 = rotate([8, -14], -object.heading)
                let t3 = rotate([-8, -14], -object.heading)

                ctx.fillStyle = "blue"
                ctx.strokeStyle = "blue"
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
                ctx.fillStyle = "#ffaaaa"
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
                ctx.fillStyle = "black"
                ctx.beginPath()
                ctx.arc(
                    object.x * scale - c_x,
                    -object.y * scale - c_y,
                    2,
                    0, Math.PI * 2
                )
                ctx.fill()
            }
            if(object instanceof Bomb) {
                if(
                    (me.selectedWeapon != null &&
                    me.weapons[me.selectedWeapon] === object &&
                    object.target != null) || object.falling
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
    }
}
