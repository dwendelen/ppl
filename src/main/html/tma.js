const canvas = document.getElementById("top-view");

const startX = convertLon([2, 15, 0]);
const startY = convertLat([51, 40, 0]);

const height = 6005

const colorCtr = "lightblue"
const colorTma = {
    "BEAUVECHAIN TMA": "red",
    "BRUSSELS TMA": "green",
    "CHARLEROI TMA": "violet",
    "FLORENNES TMA": "darkred",
    "KLEINE-BROGEL TMA": "red",
    "LIÈGE TMA": "yellow",
    "LILLE TMA": "orange",
    "LUXEMBOURG TMA": "yellow",
    "OOSTENDE TMA": "yellow"
}

render(canvas, height)

function render(canvas, height) {
    const ctx = canvas.getContext("2d");

    for (const zone of zones) {
        if (height < zone.verticalLimits[0] || zone.verticalLimits[1] < height || zone.type === "FIR" || zone.type === "OTHER") {
            continue;
        }
        let drawing = false
        let previousPoint = null
        let arc = null
        let drawingBorder = false
        let startingPoint;
        for (const path of zone.path) {
            let color;
            if (zone.type === "CTR" || zone.type === "ATZ") {
                color = colorCtr
            } else if (zone.type === "TMA") {
                color = colorTma[zone.airspace]
            } else if (zone.type === "CTA") {
                color = "cyan"
            } else {
                throw "Should not happen"
            }

            if (path.type === "point") {
                let px = convertLon(path.point[1]) - startX;
                let py = startY - convertLat(path.point[0]);
                if (arc) {
                    if (!drawing) {
                        throw "Should not happen"
                    }
                    let cx = convertLon(arc.center[1]) - startX;
                    let cy = startY - convertLat(arc.center[0]);

                    let startAngle = Math.atan2(previousPoint[1] - cy, previousPoint[0] - cx);
                    let endAngle = Math.atan2(py - cy, px - cx);
                    ctx.arc(cx * 4, cy * 4, arc.radius * 4, startAngle, endAngle, arc.ccw);
                    arc = null;
                } else {
                    if (!drawing) {
                        ctx.beginPath();
                        ctx.fillStyle = color;
                        startingPoint = [px, py];
                        ctx.moveTo(px * 4, py * 4);
                        drawing = true;
                    } else {
                        ctx.lineTo(px * 4, py * 4);
                        // if(drawingBorder) {
                        //     ctx.stroke();
                        //     ctx.closePath()
                        //     ctx.fill()
                        //     ctx.beginPath();
                        //     ctx.fillStyle = color;
                        //     ctx.setLineDash([]);
                        //     ctx.moveTo(px * 4, py * 4);
                        //     drawingBorder = false;
                        // }
                    }
                }
                previousPoint = [px, py]
            } else if (path.type === "arc") {
                arc = path;
            } else if (path.type === "circle") {
                if (drawing) {
                    throw "Should not happen";
                }
                let cx = convertLon(path.center[1]) - startX;
                let cy = startY - convertLat(path.center[0]);
                let r = path.radius;
                ctx.beginPath();
                ctx.fillStyle = color
                ctx.arc(cx * 4, cy * 4, r * 4, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.closePath()
                ctx.fill()
            } else if (path.type === "border") {
                // if(!drawing) {
                //     throw "Should not happen";
                // }
                // ctx.stroke();
                // ctx.closePath();
                // ctx.fill();
                // ctx.beginPath();
                // ctx.fillStyle = color
                // ctx.setLineDash([4, 4]);
                // ctx.moveTo(previousPoint[0] * 4, previousPoint[1] * 4);
                // drawingBorder = true;
            } else {
                throw "Should not happen"
            }
        }
        if (drawing) {
            // ctx.lineTo(startingPoint[0] * 4, startingPoint[1] * 4)
            ctx.closePath()
            ctx.stroke()
            ctx.fill()
            drawing = false
        }
    }
}

function convertLon(point) {
    return convertLat(point) * Math.cos(51 * Math.PI / 180)
}

function convertLat(point) {
    return 60 * point[0] + point[1] + point[2]/60
}