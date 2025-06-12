let canvas1 = document.getElementById("canvas1");
let ctx1 = canvas1.getContext("2d");

ctx1.save();
ctx1.scale(canvas1.width / 0.5, -canvas1.height / 400);
ctx1.translate(-0.1, -400-650);
ctx1.beginPath();
ctx1.moveTo(0.205, 650);
ctx1.lineTo(0.205, 720);
ctx1.lineTo(0.41, 980);
ctx1.lineTo(0.564, 980);
ctx1.lineTo(0.564, 650);
ctx1.restore();
ctx1.stroke();


// // drawFuel(940);
// drawFuel(900);
// // drawFuel(840);
// // drawFuel(780);
// drawFuel(800);
// drawFuel(700);
//
// drawFuel2(700, 0.41);
// drawFuel2(800, 0.41);
// drawFuel2(900, 0.41);

drawFuel3(980, 0.410, 15)
drawFuel3(980, 0.460, 19)
drawFuel3(980, 0.510, 21)
drawFuel3(980, 0.560, 21)
drawFuel3(910, 0.564, 17)
drawFuel3(830, 0.564, 12)
drawFuel3(750, 0.564, 7)
drawFuel3(670, 0.564, 2)

function drawFuel(w0) {
    let a0 = (0.41 - 0.205)/(980 - 720)*(w0 - 720) + 0.205;
    drawFuel2(w0, a0);
}

function drawFuel2(w0, a0) {
    let m0 = a0 * w0;

    let points = [-20, 0, 20, 40, 60, 80, 100]
        .map(fuel => {
            let w = w0 + fuel * 0.81
            let m = fuel * 0.81 * 1.12 + m0
            let a = m / w;
            return [a, w]
        });

    drawPoints(ctx1, points)
}

function drawFuel3(w0, a0, n) {
    let m0 = a0 * w0;
    let points = [...Array(n).keys()]
        .map(i => {
            let w_f = i * 20 * 0.81;
            let w = w0 - w_f
            let m = m0 - w_f * 1.12
            let a = m / w;
            return [a, w]
        })
    drawPoints(ctx1, points)
}

let canvas2 = document.getElementById("canvas2");
let ctx2 = canvas2.getContext("2d");

ctx2.save();
ctx2.scale(canvas2.width / 0.5, -canvas2.height / 400);
ctx2.translate(-0.1, -400-650);
ctx2.beginPath();
ctx2.moveTo(0.205, 650);
ctx2.lineTo(0.205, 720);
ctx2.lineTo(0.41, 980);
ctx2.lineTo(0.564, 980);
ctx2.lineTo(0.564, 650);
ctx2.restore();
ctx2.stroke();

drawTail(550, 980, 22)
drawTail(500, 980, 27)
drawTail(450, 980, 25)
drawTail(400, 980, 22)
drawTail(350, 860, 22)
drawTail(300, 740, 22)
drawTail(265, 655, 2)

function drawTail(m, w0, n) {
    let a0 = 0.97 - m/w0
    let points = [...Array(n).keys()]
        .map(i => {
            let a = a0 - i * 0.01
            let w = m / (0.97 - a)
            return [a, w]
        })
    drawPoints(ctx2, points)
    let xy = transform(a0 + 0.003, w0 + 10)
    ctx2.fillText(m + " m.kg", xy[0], xy[1])
}

function drawPoints(ctx, points) {
    drawCircle(ctx, points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
        drawLine(ctx, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
        drawCircle(ctx, points[i][0], points[i][1]);
    }
}

function drawLines(ctx, points) {
    for (let i = 1; i < points.length; i++) {
        drawLine(ctx, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    }
}

function drawLine(ctx, x1, y1, x2, y2) {
    let xy1 = transform(x1, y1);
    let xy2 = transform(x2, y2);

    ctx.beginPath();
    ctx.moveTo(xy1[0], xy1[1]);
    ctx.lineTo(xy2[0], xy2[1]);
    ctx.stroke();
}

function drawCircle(ctx, x, y) {
    let xy = transform(x, y);

    ctx.beginPath();
    ctx.arc(xy[0], xy[1], 3, 0, Math.PI * 2 )
    ctx.fill();
}

function transform(x, y) {
    return [(x - 0.1) * canvas1.width / 0.5, -(y - 1050) * canvas1.height / 400];
}
