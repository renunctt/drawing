const { height, offsetTop } = window.visualViewport
const bottomInset = window.innerHeight - height - offsetTop

const bottomMargin = `${bottomInset}px`

document.querySelector('.buttons').style.marginBottom = bottomMargin

const canvas = document.getElementById('canvas')

let matrix = new DOMMatrix()
let lastTouches = null
let isTransforming = false

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
		}
	}
})

document.addEventListener(
	'touchmove',
	e => {
		if (e.touches.length === 2 && isTransforming) {
			e.preventDefault()

			const [t1, t2] = e.touches
			const [lt1, lt2] = lastTouches

			const prevMid = getMidpoint(lt1, lt2)
			const newMid = getMidpoint(t1, t2)

			const prevDist = getDistance(lt1, lt2)
			const newDist = getDistance(t1, t2)
			const scale = newDist / prevDist

			const prevAngle = getAngle(lt1, lt2)
			const newAngle = getAngle(t1, t2)
			let rotation = newAngle - prevAngle

			const cx = newMid.x
			const cy = newMid.y

			const dx = newMid.x - prevMid.x
			const dy = newMid.y - prevMid.y

			const inverse = matrix.inverse()
			const localDelta = new DOMPoint(dx, dy).matrixTransform(inverse)
			const localZero = new DOMPoint(0, 0).matrixTransform(inverse)

			const localDx = localDelta.x - localZero.x
			const localDy = localDelta.y - localZero.y

			matrix = matrix.translate(localDx, localDy)

			if (Math.abs(rotation) > 0.01 || Math.abs(scale - 1) > 0.01) {
				matrix = matrix
					.translate(cx, cy)
					.rotate((rotation * 180) / Math.PI)
					.scale(scale)
					.translate(-cx, -cy)
			}

			applyTransform()
			lastTouches = [t1, t2]
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
