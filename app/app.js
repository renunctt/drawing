const SMOOTH_FACTOR = 0.9
const canvas = document.getElementById('canvas')
let matrix = new DOMMatrix()
let isTransforming = false
let lastTouches = null
let lastUpdateTime = 0

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

function isTouchInsideImage(touch) {
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
		if (isTouchInsideImage(t1) && isTouchInsideImage(t2)) {
			lastTouches = [t1, t2]
			isTransforming = true
			lastUpdateTime = performance.now()
		}
	}
})

document.addEventListener(
	'touchmove',
	e => {
		if (e.touches.length === 2 && isTransforming) {
			e.preventDefault()

			const now = performance.now()
			if (now - lastUpdateTime < 16) return // 60fps

			const [t1, t2] = e.touches
			const [lt1, lt2] = lastTouches

			const prevMid = getMidpoint(lt1, lt2)
			const newMid = getMidpoint(t1, t2)

			const prevDist = getDistance(lt1, lt2)
			const newDist = getDistance(t1, t2)
			let scale = newDist / prevDist
      scale = 1 + (scale - 1) * SMOOTH_FACTOR

			const prevAngle = getAngle(lt1, lt2)
			const newAngle = getAngle(t1, t2)
			let rotation = (newAngle - prevAngle) * (180 / Math.PI)
      rotation *= SMOOTH_FACTOR

			const dx = (newMid.x - prevMid.x) * SMOOTH_FACTOR
			const dy = (newMid.y - prevMid.y) * SMOOTH_FACTOR

			const inverse = matrix.inverse()
			const localDelta = new DOMPoint(dx, dy).matrixTransform(inverse)
			const localZero = new DOMPoint(0, 0).matrixTransform(inverse)

			const localDx = localDelta.x - localZero.x
			const localDy = localDelta.y - localZero.y

			const cx = newMid.x
			const cy = newMid.y

			matrix = matrix
				.translate(localDx, localDy)
				.translate(cx, cy)
				.rotate(rotation)
				.scale(scale)
				.translate(-cx, -cy)

			applyTransform()
			lastTouches = [t1, t2]
			lastUpdateTime = now
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
