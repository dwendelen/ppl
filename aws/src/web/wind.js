let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d");

generate()

function populateTable() {
    function disp(val) {
        if(val == null) {
            return ""
        } else {
            return (Math.round(val * 10) / 10).toString()
        }
    }

    document.getElementById("heading").textContent = disp(shown.heading)
    document.getElementById("tas").textContent = disp(shown.tas)
    document.getElementById("drift").textContent = disp(shown.drift)
    document.getElementById("wind").textContent = disp(shown.windDirection) + " / " + disp(shown.windVelocity)
    document.getElementById("course").textContent = disp(shown.course)
    document.getElementById("gs").textContent = disp(shown.gs)
}

function generate() {
    drawBoard(ctx, 100, 0, 0, 0)

    function rand(min, max, step) {
        return Math.ceil(Math.random() * (max - min) / step ) * step + min
    }
    problem = {}
    shown = {}
    if(Math.random() < 0.2) {
        // Find wind
        problem.heading = rand(0, 360, 5)
        problem.tas = rand(80, 140, 5)
        problem.course = rand(problem.heading - 20, problem.heading + 20, 5)
        problem.gs = rand(80, 140, 5)

        shown.heading = problem.heading
        shown.tas = problem.tas
        shown.course = problem.course
        shown.gs = problem.gs

        shown.windDirection = null
        shown.windVelocity = null

        let windX = problem.gs * Math.cos(problem.course * Math.PI / 180) - problem.tas * Math.cos(problem.heading * Math.PI / 180)
        let windY = problem.gs * Math.sin(problem.course * Math.PI / 180) - problem.tas * Math.sin(problem.heading * Math.PI / 180)
        let windDirection = Math.atan2(windY, windX) * 180 / Math.PI
        if(windDirection < 0) {
            windDirection += 360
        }
        if(windDirection <= 180) {
            windDirection += 180
        } else {
            windDirection -= 180
        }
        problem.windVelocity = Math.sqrt(windX * windX + windY * windY)
        problem.windDirection = windDirection
    } else {
        problem.windDirection = rand(0, 360, 10)
        problem.windVelocity = Math.ceil(Math.random() * 35) + 5
        shown.windDirection = problem.windDirection
        shown.windVelocity = problem.windVelocity

        let windDir = problem.windDirection - 180

        if(Math.random() < 0.5) {
            // Course given
            problem.course = rand(0, 360, 10)
            shown.course = problem.course
            shown.heading = null
            if(Math.random() < 0.5) {
                // TAS given
                problem.tas = rand(80, 140, 5)
                shown.tas = problem.tas
                shown.gs = null

                let crossWind = Math.sin((problem.course - windDir) * Math.PI / 180) * problem.windVelocity
                let backWind = Math.cos((problem.course - windDir) * Math.PI / 180) * problem.windVelocity
                let drift = Math.asin(crossWind / problem.tas)
                problem.drift = drift * 180 / Math.PI
                problem.heading = problem.course - problem.drift
                problem.gs = problem.tas * Math.cos(drift) + backWind
            } else {
                // GS given
                problem.gs = rand(80, 140, 5)
                shown.gs = problem.gs
                shown.tas = null

                let groundX = Math.cos(problem.course * Math.PI / 180) * problem.gs;
                let groundY = Math.sin(problem.course * Math.PI / 180) * problem.gs;
                let windX = problem.windVelocity * Math.cos(windDir * Math.PI / 180);
                let windY = problem.windVelocity * Math.sin(windDir * Math.PI / 180);
                let airX = groundX - windX
                let airY = groundY - windY
                let heading = Math.atan2(airY, airX) * 180 / Math.PI;
                if(heading < 0) {
                    heading += 360
                }
                problem.heading = heading
                problem.tas = Math.sqrt(airX * airX + airY * airY)
                problem.drift = problem.course - problem.heading
            }
        } else {
            // Heading given
            problem.heading = rand(0, 360, 10)
            shown.heading = problem.heading
            shown.course = null
            if(Math.random() < 0.5) {
                // TAS given
                problem.tas = rand(80, 140, 5)
                shown.tas = problem.tas
                shown.gs = null

                let airX = Math.cos(problem.heading * Math.PI / 180) * problem.tas;
                let airY = Math.sin(problem.heading * Math.PI / 180) * problem.tas;
                let windX = problem.windVelocity * Math.cos(windDir * Math.PI / 180);
                let windY = problem.windVelocity * Math.sin(windDir * Math.PI / 180);
                let groundX = airX + windX
                let groundY = airY + windY
                let course = Math.atan2(groundY, groundX) * 180 / Math.PI;
                if(course < 0) {
                    course += 360
                }
                problem.course = course
                problem.gs = Math.sqrt(groundX * groundX + groundY * groundY)
                problem.drift = problem.course - problem.heading
            } else {
                // GS given
                problem.gs = rand(80, 140, 5)
                shown.gs = problem.gs
                shown.tas = null

                let crossWind = Math.sin((windDir - problem.heading) * Math.PI / 180) * problem.windVelocity
                let backWind = Math.cos((windDir - problem.heading) * Math.PI / 180) * problem.windVelocity
                let drift = Math.asin(crossWind / problem.gs)
                problem.drift = drift * 180 / Math.PI
                problem.course = problem.heading + problem.drift
                problem.tas = problem.gs * Math.cos(drift) - backWind
            }
        }
        shown.drift = null
    }
    populateTable()
}

function solution() {
    if(shown.course !== null) {
        drawBoard(ctx, problem.gs, problem.course, problem.windDirection, problem.windVelocity)
    } else {
        drawBoard(ctx, problem.tas, problem.heading, 180 + problem.windDirection, problem.windVelocity)
    }
    shown = problem
    populateTable()
}

function drawBoard(ctx, speed, direction, windArmDirection, windSpeed) {
    ctx.reset()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const scale = 4
    const centerX = 100
    const centerY = 100
    ctx.save()

    ctx.scale(scale, scale)
    ctx.translate(centerX, centerY)

    // Draw board
    ctx.save()

    ctx.beginPath()
    ctx.arc(0, 0, 75, 0, 2 * Math.PI)
    ctx.clip()

    ctx.translate(0, speed)

    for (let a = -65; a <= 65; a++) {
        ctx.save()
        ctx.beginPath()
        if(a % 5 === 0) {
            ctx.lineWidth = 0.5
        } else {
            ctx.lineWidth = 0.25
        }
        ctx.rotate(a * Math.PI / 180)
        if(a % 2 === 0) {
            ctx.moveTo(0, -40)
        } else {
            ctx.moveTo(0, -100)
        }
        ctx.lineTo(0, -300)
        ctx.stroke()
        ctx.restore()
    }

    for(let s = 40; s <= 300; s+= 2) {
        ctx.beginPath()
        if(s % 10 === 0) {
            ctx.lineWidth = 0.5
        } else {
            ctx.lineWidth = 0.25
        }
        ctx.arc(0, 0, s, 1.15 * Math.PI, 1.85 * Math.PI)
        ctx.stroke()
    }

    ctx.font = 4 + "px Arial"
    ctx.textAlign = "center"

    function drawTextAt(text, x, y) {
        ctx.beginPath()
        let box = ctx.measureText(text);

        ctx.clearRect(x - box.width / 2, y - 1 - box.actualBoundingBoxAscent, box.width, box.actualBoundingBoxAscent - box.actualBoundingBoxDescent)
        ctx.fillText(text, x, y - 1)
    }

    for (let a = -40; a <= 40; a+=5) {
        if(a !== 0) {
            ctx.save()
            ctx.rotate(a * Math.PI / 180)
            let text = Math.abs(a).toString();
            if(a % 10 === 0) {
                drawTextAt(text, 0, -100)
            }
            drawTextAt(text, 0, -150)
            drawTextAt(text, 0, -200)
            drawTextAt(text, 0, -250)
            ctx.restore()
        }
    }

    for(let s = 40; s <= 300; s += 10) {
        drawTextAt(s.toString(), 0, -s)
    }
    ctx.restore()

    // Draw disk on top
    ctx.save()
    ctx.beginPath()
    ctx.lineWidth = 1
    ctx.strokeStyle = "#B59410"
    ctx.arc(0, 0, 2, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.restore()

    ctx.beginPath()
    ctx.lineWidth = 1/scale
    ctx.arc(0, 0, 75, 0, 2 * Math.PI)
    ctx.stroke()

    ctx.beginPath()
    ctx.lineWidth = 1/scale
    ctx.arc(0, 0, 95, 0, 2 * Math.PI)
    ctx.stroke()

    ctx.font = 4 + "px Arial"
    ctx.textAlign = "center"

    for (let i = 0; i < 360; i++) {
        ctx.save()
        ctx.rotate((i - direction) * Math.PI / 180)
        ctx.beginPath()
        ctx.lineWidth = 0.25
        ctx.moveTo(0, 75)
        if(i % 5 === 0) {
            ctx.lineTo(0, 81)
        } else {
            ctx.lineTo(0, 79)
        }
        ctx.stroke()
        if(i % 5 === 0) {
            ctx.moveTo(0, 89)
        } else {
            ctx.moveTo(0, 91)
        }
        ctx.lineTo(0, 95)
        ctx.stroke()

        if(i % 10 === 0) {
            drawTextAt(i.toString(), 0, -84)
        }
        ctx.restore()
    }

    // Draw wind direction
    ctx.save()
    ctx.font = 4 + "px Arial"
    ctx.textAlign = "center"
    ctx.fillStyle = "blue"
    ctx.strokeStyle = "blue"

    ctx.rotate((windArmDirection - direction) * Math.PI / 180)
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, -2)
    ctx.lineTo(0, -75)
    ctx.stroke()
    for (let w = 2; w <= 60; w += 2) {
        ctx.beginPath()
        ctx.moveTo(0, -w)
        if(w % 10 === 0) {
            ctx.lineTo(3, -w)
            ctx.stroke()
            drawTextAt((w/10).toString(), 5, -w + 3)
        } else {
            ctx.lineTo(2, -w)
            ctx.stroke()
        }
    }

    ctx.beginPath()
    ctx.strokeStyle = "red"
    ctx.moveTo(0, -windSpeed)
    ctx.lineTo(-3, -windSpeed)
    ctx.stroke()

    ctx.restore()
    ctx.restore()
}