const SMOOTH_FACTOR = 0.9
const CANVAS_TOP_OFFSET = 70
const screenWidth = window.screen.width

const resetBtn = document.querySelector('.resize-btn')
const canvas = document.getElementById('canvas')
const logicalSize = 1600
const scaleFactor = logicalSize / screenWidth

canvas.width = logicalSize
canvas.height = logicalSize
const ctx = canvas.getContext('2d')
ctx.scale(scaleFactor, scaleFactor)
ctx.lineWidth = 3
ctx.lineCap = 'round'
ctx.strokeStyle = '#000'

let matrix = new DOMMatrix()
let isTransforming = false
let isDrawing = false

let lastTouches = null
let lastDrawPoint = null
let lastMidpoint = null
let lastAngle = 0
let lastDistance = 1

// ==== Touch Utils ====

const getOrderedTouches = touchList =>
	Array.from(touchList).sort((a, b) => a.identifier - b.identifier)

const getDistance = (t1, t2) =>
	Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

const getAngle = (t1, t2) =>
	Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX)

const getMidpoint = (t1, t2) => ({
	x: (t1.clientX + t2.clientX) / 2,
	y: (t1.clientY + t2.clientY) / 2,
})

const getAngleDiff = (a, b) => {
	let diff = a - b
	while (diff < -Math.PI) diff += 2 * Math.PI
	while (diff > Math.PI) diff -= 2 * Math.PI
	return diff
}

const isTouchInsideCanvas = touch => {
	const rect = canvas.getBoundingClientRect()
	return (
		touch.clientX >= rect.left &&
		touch.clientX <= rect.right &&
		touch.clientY >= rect.top &&
		touch.clientY <= rect.bottom
	)
}

// ==== Coordinate Conversion ====

function canvasPointFromTouch(touch) {
	const screenPoint = new DOMPoint(
		touch.clientX,
		touch.clientY - CANVAS_TOP_OFFSET
	)
	return screenPoint.matrixTransform(matrix.inverse())
}

// ==== Transform Application ====

function applyTransform() {
	const { a, b, c, d, e, f } = matrix
	canvas.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`
}

// ==== Touch Events ====

document.addEventListener('touchstart', e => {
	if (e.touches.length === 1 && !isTransforming) {
		const touch = e.touches[0]
		if (isTouchInsideCanvas(touch)) {
			lastDrawPoint = canvasPointFromTouch(touch)
			isDrawing = true
		}
	} else if (e.touches.length === 2) {
		const [t1, t2] = getOrderedTouches(e.touches)
		if (isTouchInsideCanvas(t1) && isTouchInsideCanvas(t2)) {
			isTransforming = true
			lastTouches = [t1, t2]
			lastMidpoint = getMidpoint(t1, t2)
			lastDistance = getDistance(t1, t2)
			lastAngle = getAngle(t1, t2)
			isDrawing = false
			lastDrawPoint = null
		}
	}
})

document.addEventListener(
	'touchmove',
	e => {
		if (e.touches.length === 1 && isDrawing) {
			e.preventDefault()
			const touch = e.touches[0]
			const p = canvasPointFromTouch(touch)
			ctx.beginPath()
			ctx.moveTo(lastDrawPoint.x, lastDrawPoint.y)
			ctx.lineTo(p.x, p.y)
			ctx.stroke()
			lastDrawPoint = p
		} else if (e.touches.length === 2 && isTransforming) {
			e.preventDefault()
			const [t1, t2] = getOrderedTouches(e.touches)
			const newMid = getMidpoint(t1, t2)
			const newDist = getDistance(t1, t2)
			const newAngle = getAngle(t1, t2)

			const scale = 1 + (newDist / lastDistance - 1) * SMOOTH_FACTOR
			const rotationDeg =
				getAngleDiff(newAngle, lastAngle) * (180 / Math.PI) * SMOOTH_FACTOR

			const dx = (newMid.x - lastMidpoint.x) * SMOOTH_FACTOR
			const dy = (newMid.y - lastMidpoint.y) * SMOOTH_FACTOR

			const inverse = matrix.inverse()
			const localCenter = new DOMPoint(newMid.x, newMid.y).matrixTransform(
				inverse
			)
			const localDelta = new DOMPoint(dx, dy).matrixTransform(inverse)
			const localOrigin = new DOMPoint(0, 0).matrixTransform(inverse)

			const localDx = localDelta.x - localOrigin.x
			const localDy = localDelta.y - localOrigin.y

			matrix = matrix
				.translate(localDx, localDy)
				.translate(localCenter.x, localCenter.y)
				.rotate(rotationDeg)
				.scale(scale)
				.translate(-localCenter.x, -localCenter.y)

			applyTransform()
			resetBtn.style.display = 'flex'

			lastTouches = [t1, t2]
			lastMidpoint = newMid
			lastDistance = newDist
			lastAngle = newAngle
		}
	},
	{ passive: false }
)

document.addEventListener('touchend', e => {
	if (e.touches.length < 2) {
		isTransforming = false
		lastTouches = null
	}
	if (e.touches.length === 0) {
		isDrawing = false
		lastDrawPoint = null
	}
})

// Init
applyTransform()

function resetTransform() {
	matrix = new DOMMatrix()
	applyTransform()
	resetBtn.style.display = 'none'
}

resetBtn.addEventListener('touchstart', () => {
	resetTransform()
})
