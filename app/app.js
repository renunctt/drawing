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
	if (e.touches.length === 2) {
		const [t1, t2] = e.touches
		if (isTouchInsideCanvas(t1) && isTouchInsideCanvas(t2)) {
			isTransforming = true
			lastTouches = [t1, t2]
			lastMidpoint = getMidpoint(t1, t2)
			lastDistance = getDistance(t1, t2)
			lastAngle = getAngle(t1, t2)
		}
	}
})

document.addEventListener(
	'touchmove',
	e => {
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
			const localDelta = new DOMPoint(dx, dy).matrixTransform(inverse)
			const localZero = new DOMPoint(0, 0).matrixTransform(inverse)
			const localDx = localDelta.x - localZero.x
			const localDy = localDelta.y - localZero.y

			matrix = matrix
				.translate(localDx, localDy)
				.translate(newMid.x, newMid.y)
				.rotate(rotation)
				.scale(scale)
				.translate(-newMid.x, -newMid.y)

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
})

applyTransform()
