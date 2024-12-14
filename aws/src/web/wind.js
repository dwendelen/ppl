let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d");

drawBoard(ctx, 100, -30, 100, 20)

function drawBoard(ctx, speed, direction, windArmDirection, windSpeed) {
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