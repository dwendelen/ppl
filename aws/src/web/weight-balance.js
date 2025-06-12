function main() {
    let envelope = [
        [0.205, 650],
        [0.205, 720],
        [0.41, 980],
        [0.564, 980],
        [0.564, 650],
    ];

    let fuelGraph1 = new Graph(document.getElementById("fuelGraph1"), 0.1, 0.6, 650, 1050)
    fuelGraph1.drawLines(envelope)
    let fuelGraph2 = new Graph(document.getElementById("fuelGraph2"), 100, 650, 650, 1050)
    fuelGraph2.drawLines(envelope.map(p => [p[0] * p[1], p[1]]))

    drawFuel(980, 0.410, 15)
    drawFuel(980, 0.460, 19)
    drawFuel(980, 0.510, 21)
    drawFuel(980, 0.560, 21)
    drawFuel(910, 0.564, 17)
    drawFuel(830, 0.564, 12)
    drawFuel(750, 0.564, 7)
    drawFuel(670, 0.564, 2)

    function drawFuel(w0, a0, n) {
        let m0 = a0 * w0;
        let points1 = [...Array(n).keys()]
            .map(i => {
                let w_f = i * 20 * 0.81;
                let w = w0 - w_f
                let m = m0 - w_f * 1.12
                let a = m / w;
                return [a, w]
            })
        fuelGraph1.drawPoints(points1)

        let points2 = points1.map(p => [p[0] * p[1], p[1]])
        fuelGraph2.drawPoints(points2)
    }

    let momentGraph1 = new Graph(document.getElementById("momentGraph1"), 0.1, 0.6, 650, 1050)
    momentGraph1.drawLines(envelope)
    let momentGraph2 = new Graph(document.getElementById("momentGraph2"), 100, 650, 650, 1050)
    momentGraph2.drawLines(envelope.map(p => [p[0] * p[1], p[1]]))

    drawTail(550, 980, 22)
    drawTail(500, 980, 27)
    drawTail(450, 980, 25)
    drawTail(400, 980, 22)
    drawTail(350, 860, 22)
    drawTail(300, 740, 22)
    drawTail(265, 655, 2)

    function drawTail(m, w0, n) {
        let a0 = 0.97 - m / w0
        let points1 = [...Array(n).keys()]
            .map(i => {
                let a = a0 - i * 0.01
                let w = m / (0.97 - a)
                return [a, w]
            })
        momentGraph1.drawPoints(points1)
        momentGraph1.drawText(m + " m.kg", a0 + 0.003, w0 + 10)

        let points2 = points1.map(p => [p[0] * p[1], p[1]])
        momentGraph2.drawPoints(points2)
        momentGraph2.drawText(m + " m.kg", (a0 + 0.003)*(w0 + 10), w0 + 10)
    }

    let comparingGraph1 = new Graph(document.getElementById("comparingGraph1"), 0.1, 0.6, 650, 1050)
    comparingGraph1.drawLines(envelope)

    let comparingPoints1 = [720, 740, 760, 780, 800, 820, 840, 860, 880, 900, 920, 940, 960, 980]
        .map(w => {
            let m0 = 720 * 0.205
            let m1 = 980 * 0.410
            let dm = (m1 - m0)/(980 - 720)
            let m = m0 + dm * (w - 720)
            let a = m / w
            return [a, w]
        })
    comparingGraph1.drawPoints(comparingPoints1)

    let comparingGraph2 = new Graph(document.getElementById("comparingGraph2"), 100, 650, 650, 1050)
    comparingGraph2.drawLines(envelope.map(p => [p[0] * p[1], p[1]]))

    let comparingPoints2 = [720, 740, 760, 780, 800, 820, 840, 860, 880, 900, 920, 940, 960, 980]
        .map(w => {
            let da = (0.410 - 0.205)/(980 - 720)
            let a = 0.205 + da * (w - 720)
            let m = a * w
            return [m, w]
        })
    comparingGraph2.drawPoints(comparingPoints2)
}


class Graph {
    constructor(canvas, x0, x1, y0, y1) {
        this.ctx = canvas.getContext("2d");
        this.tranX = -x0;
        this.scaleX = canvas.width / (x1 - x0);
        this.tranY = -y1;
        this.scaleY = -canvas.height / (y1 - y0);
    }

    drawPoints(points) {
        this.drawLines(points);
        for (let point of points) {
            this.drawCircle(point[0], point[1]);
        }
    }

    drawLines(points) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.tx(points[0][0]), this.ty(points[0][1]));
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(this.tx(points[i][0]), this.ty(points[i][1]));
        }
        this.ctx.stroke();
    }

    drawCircle(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(this.tx(x), this.ty(y), 3, 0, Math.PI * 2 )
        this.ctx.fill();
    }

    drawText(text, x, y) {
        this.ctx.fillText(text, this.tx(x), this.ty(y))
    }

    tx(x) {
        return (x + this.tranX) * this.scaleX;
    }

    ty(y) {
        return (y + this.tranY) * this.scaleY;
    }
}

main()