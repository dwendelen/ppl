const margin = 5
const widthVFR = 40
const widthArrowText = 30
const arcRadius = 15

const endText1 = margin + widthArrowText
const startArc1 = endText1 + margin
const startVFR = startArc1 + arcRadius + arcRadius
const startLine = startVFR + widthVFR + margin
const startText2 = startLine + margin
const endText2 = startText2 + widthArrowText
const endLine = endText2 + margin
const startIFR = endLine + margin
const endIFR = startIFR + widthVFR
const startText3 = endIFR + arcRadius + arcRadius + margin

draw("class-a", false, "", "", "ATC")
draw("class-b", true, "ATC", "ATC", "ATC")
draw("class-c", true, "TI+TA", "ATC", "ATC")
draw("class-d", true, "TI+TA", "TI+TA", "ATC")
draw("class-e", true, "(TI)", "(TI)", "ATC")
draw("class-f", true, "FIS", "FIS", "(ATC) + FIS")
draw("class-g", true, "FIS", "FIS", "FIS")

function draw(id, drawVfr, text1, text2, text3) {
    let classB = document.getElementById(id);
    let ctx = classB.getContext("2d");

    ctx.textBaseline = "middle"

    if(drawVfr) {
        ctx.font = "12px Arial"
        ctx.textAlign = "right"
        ctx.fillText(text1, endText1, 25)

        ctx.beginPath()
        ctx.arc(startArc1 + arcRadius, 25, arcRadius, 0.25 * Math.PI, 1.75 * Math.PI)
        ctx.stroke()

        ctx.font = "20px Arial"
        ctx.textAlign = "left"
        ctx.fillText("VFR", startVFR, 25)

        ctx.beginPath()
        ctx.moveTo(startLine, 25)
        ctx.lineTo(endLine, 25)
        ctx.stroke()

        ctx.font = "12px Arial"
        ctx.textAlign = "center"
        ctx.fillText(text2, (startText2 + endText2) / 2, 15)
    }

    ctx.font = "20px Arial"
    ctx.textAlign = "right"
    ctx.fillText("IFR", endIFR, 25)

    ctx.font = "12px Arial"
    ctx.textAlign = "left"
    ctx.beginPath()
    ctx.arc(endIFR + arcRadius, 25, arcRadius,0.75 * Math.PI, 1.25 * Math.PI, true)
    ctx.stroke()
    ctx.fillText(text3, startText3, 25)
}
