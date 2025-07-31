const SMOOTH_FACTOR = 0.9
const canvas = document.getElementById('canvas')
let matrix = new DOMMatrix()
let isTransforming = false
let lastTouches = null
let lastMidpoint = null
let lastAngle = 0
let lastDistance = 1

function getDistance(t1, t2) {
	return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
}

function getAngle(t1, t2) {
	return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX)
}

function getMidpoint(t1, t2) {
	return {
		x: (t1.clientX + t2.clientX) / 2,
		y: (t1.clientY + t2.clientY) / 2,
	}
}

const ctx = canvas.getContext('2d')
ctx.lineWidth = 1
ctx.lineCap = 'round'
ctx.strokeStyle = '#000'

let isDrawing = false
let lastDrawPoint = null

function canvasPointFromTouch(touch) {
	const screenX = touch.clientX
	const screenY = touch.clientY

	const offsetTop = 70
	const offsetLeft = (window.innerWidth - 350) / 2

	const point = new DOMPoint(
		screenX - offsetLeft,
		screenY - offsetTop
	)

	return point.matrixTransform(matrix.inverse())
}

function isTouchInsideCanvas(touch) {
	const rect = canvas.getBoundingClientRect()
	return (
		touch.clientX >= rect.left &&
		touch.clientX <= rect.right &&
		touch.clientY >= rect.top &&
		touch.clientY <= rect.bottom
	)
}

function applyTransform() {
	const { a, b, c, d, e, f } = matrix
	canvas.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`
}

document.addEventListener('touchstart', e => {
	if (e.touches.length === 1 && !isTransforming) {
		if (isTouchInsideCanvas(e.touches[0])) {
			const p = canvasPointFromTouch(e.touches[0])
			isDrawing = true
			lastDrawPoint = p
		}
	} else if (e.touches.length === 2) {
		const [t1, t2] = e.touches
		if (isTouchInsideCanvas(t1) && isTouchInsideCanvas(t2)) {
			isTransforming = true
			lastTouches = [t1, t2]
			lastMidpoint = getMidpoint(t1, t2)
			lastDistance = getDistance(t1, t2)
			lastAngle = getAngle(t1, t2)
			isDrawing = false // ⛔ отключаем рисование
			lastDrawPoint = null
		}
	}
})

document.addEventListener(
	'touchmove',
	e => {
		if (e.touches.length === 1 && isDrawing) {
			e.preventDefault()
			const p = canvasPointFromTouch(e.touches[0])
			ctx.beginPath()
			ctx.moveTo(lastDrawPoint.x, lastDrawPoint.y)
			ctx.lineTo(p.x, p.y)
			ctx.stroke()
			lastDrawPoint = p
		}

		if (e.touches.length === 2 && isTransforming) {
			e.preventDefault()
			const [t1, t2] = e.touches
			const newMid = getMidpoint(t1, t2)
			const newDist = getDistance(t1, t2)
			const newAngle = getAngle(t1, t2)

			const scale = 1 + (newDist / lastDistance - 1) * SMOOTH_FACTOR
			const rotation = (newAngle - lastAngle) * (180 / Math.PI) * SMOOTH_FACTOR

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
				.rotate(rotation)
				.scale(scale)
				.translate(-localCenter.x, -localCenter.y)

			applyTransform()

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

applyTransform()
