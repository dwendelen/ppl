let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d");

drawBoard(ctx, 100)

function drawBoard(ctx, speed) {
    const scale = 4
    const centerX = 100
    const centerY = 100
    const zeroY = centerY + speed

    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX * scale, centerY * scale, 75 * scale, 0, 2 * Math.PI)
    ctx.clip()

    for (let a = -65; a <= 65; a++) {
        ctx.beginPath()
        if(a % 5 === 0) {
            ctx.lineWidth = 2
        } else {
            ctx.lineWidth = 1
        }
        if(a % 2 === 0) {
            let fortyX = Math.sin(a * Math.PI / 180) * 40
            let fortY = Math.cos(a * Math.PI / 180) * 40

            ctx.moveTo((centerX + fortyX) * scale, (zeroY - fortY) * scale)
        } else {
            let hundredX = Math.sin(a * Math.PI / 180) * 100
            let hundredY = Math.cos(a * Math.PI / 180) * 100

            ctx.moveTo((centerX + hundredX) * scale, (zeroY - hundredY) * scale)
        }
        let threeHundredX = Math.sin(a * Math.PI / 180) * 300
        let threeHundredY = Math.cos(a * Math.PI / 180) * 300
        ctx.lineTo((centerX + threeHundredX) * scale, (zeroY - threeHundredY) * scale)
        ctx.stroke()
    }

    for(let s = 40; s <= 300; s+= 2) {
        ctx.beginPath()
        if(s % 10 === 0) {
            ctx.lineWidth = 2
        } else {
            ctx.lineWidth = 1
        }
        ctx.arc(scale * centerX, (centerY + speed) * scale, s * scale, 1.15 * Math.PI, 1.85 * Math.PI)
        ctx.stroke()
    }

    ctx.font = 4 * scale + "px Arial"
    ctx.lineWidth = 1
    ctx.textAlign = "center"

    function drawTextAt(text, speed, angle) {
        ctx.beginPath()
        let box = ctx.measureText(text);

        let x = Math.sin(angle * Math.PI / 180) * speed
        let y = Math.cos(angle * Math.PI / 180) * speed

        ctx.clearRect((x + centerX) * scale - box.width / 2, (zeroY - y - 1) * scale - box.actualBoundingBoxAscent, box.width, box.actualBoundingBoxAscent - box.actualBoundingBoxDescent)
        ctx.fillText(text, (x + centerX) * scale, (zeroY - y - 1) * scale)
    }

    for (let a = -40; a <= 40; a+=5) {
        if(a !== 0) {
            if(a % 10 === 0) {
                drawTextAt(Math.abs(a).toString(), 100, a)
            }
            drawTextAt(Math.abs(a).toString(), 150, a)
            drawTextAt(Math.abs(a).toString(), 200, a)
            drawTextAt(Math.abs(a).toString(), 250, a)
        }
    }

    for(let s = 40; s <= 300; s += 10) {
        drawTextAt(s.toString(), s, 0)
    }
    ctx.restore()
}