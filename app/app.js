const SMOOTH_FACTOR = 0.9
const CANVAS_TOP_OFFSET = 70
const screenWidth = window.screen.width

const resetBtn = document.querySelector('.resize-btn')
const canvas = document.getElementById('canvas')
const logicalSize = 1600
const scaleFactor = logicalSize / screenWidth
let currentLineWidth = 3
let currentStrokeColor = '#000000'

canvas.width = logicalSize
canvas.height = logicalSize
const ctx = canvas.getContext('2d')
ctx.scale(scaleFactor, scaleFactor)
ctx.lineCap = 'round'

let matrix = new DOMMatrix()
let isTransforming = false
let isDrawing = false
const redoHistory = []
let lastTouches = null
let lastDrawPoint = null
let lastMidpoint = null
let lastAngle = 0
let hasMoved = false
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

let currentStroke = null

document.addEventListener('touchstart', e => {
	if (e.touches.length === 1 && !isTransforming) {
		const touch = e.touches[0]
		if (isTouchInsideCanvas(touch)) {
			lastDrawPoint = canvasPointFromTouch(touch)
			isDrawing = true
			hasMoved = false
			currentStroke = {
				tool: 'pen',
				color: currentStrokeColor,
				lineWidth: currentLineWidth,
				points: [lastDrawPoint],
			}
		}
	} else if (e.touches.length === 2) {
		if (isDrawing && currentStroke && currentStroke.points.length > 0) {
			drawingHistory.push(currentStroke)
			currentStroke = null
			redoHistory.length = 0
			redrawCanvas()
		}

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
		if (isTransforming) return

		if (e.touches.length === 1 && isDrawing) {
			e.preventDefault()
			const touch = e.touches[0]
			if (!isTouchInsideCanvas(touch)) return
			const p = canvasPointFromTouch(touch)

			currentStroke.points.push(p)

			hasMoved = true
			redrawCanvas()
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

const drawingHistory = []

document.addEventListener('touchend', e => {
	if (e.touches.length < 2) {
		isTransforming = false
		lastTouches = null
	}
	if (e.touches.length === 0) {
		if (isDrawing && !hasMoved && lastDrawPoint) {
			ctx.fillStyle = currentStroke.color
			ctx.beginPath()
			ctx.arc(
				lastDrawPoint.x,
				lastDrawPoint.y,
				currentStroke.lineWidth / 2,
				0,
				2 * Math.PI
			)
			ctx.fill()
			currentStroke.points.push(lastDrawPoint)
		}

		if (isDrawing && currentStroke) {
			drawingHistory.push(currentStroke)
			redoHistory.length = 0
			currentStroke = null
		}
		isDrawing = false
		lastDrawPoint = null
		hasMoved = false
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

function undoLastStroke() {
	if (drawingHistory.length === 0) return

	const lastStroke = drawingHistory.pop()
	redoHistory.push(lastStroke)
	redrawCanvas()
}

function redoLastStroke() {
	if (redoHistory.length === 0) return

	const stroke = redoHistory.pop()
	drawingHistory.push(stroke)
	redrawCanvas()
}

function redrawCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height)
	ctx.save()
	ctx.setTransform(1, 0, 0, 1, 0, 0)
	ctx.scale(scaleFactor, scaleFactor)

	const allStrokes = [...drawingHistory]
	if (isDrawing && currentStroke) {
		allStrokes.push(currentStroke)
	}

	for (const stroke of allStrokes) {
		const points = stroke.points
		if (points.length === 0) continue

		ctx.globalAlpha = stroke.opacity ?? 1
		ctx.strokeStyle = stroke.color
		ctx.lineWidth = stroke.lineWidth
		ctx.lineJoin = 'round'
		ctx.lineCap = 'round'

		if (points.length === 1) {
			const p = points[0]
			ctx.beginPath()
			ctx.arc(p.x, p.y, stroke.lineWidth / 2, 0, 2 * Math.PI)
			ctx.fillStyle = stroke.color
			ctx.fill()
		} else if (points.length === 2) {
			// Отдельная отрисовка для двух точек
			ctx.beginPath()
			ctx.moveTo(points[0].x, points[0].y)
			ctx.lineTo(points[1].x, points[1].y)
			ctx.stroke()
		} else {
			ctx.beginPath()
			ctx.moveTo(points[0].x, points[0].y)
			for (let i = 1; i < points.length - 1; i++) {
				const midPoint = {
					x: (points[i].x + points[i + 1].x) / 2,
					y: (points[i].y + points[i + 1].y) / 2,
				}
				ctx.quadraticCurveTo(points[i].x, points[i].y, midPoint.x, midPoint.y)
			}

			// Добавим последнюю точку прямой линией
			ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
			ctx.stroke()

			// Иногда последний отрезок не захватывает — "запечатываем" его кругом
			const end = points[points.length - 1]
			ctx.beginPath()
			ctx.arc(end.x, end.y, stroke.lineWidth / 2.2, 0, 2 * Math.PI)
			ctx.fillStyle = stroke.color
			ctx.fill()
		}
	}

	ctx.globalAlpha = 1
	ctx.restore()
}

const sizeBtn1 = document.querySelector('.option__size-1')
const sizeBtn3 = document.querySelector('.option__size-3')
const sizeBtn5 = document.querySelector('.option__size-5')
const sizeBtn10 = document.querySelector('.option__size-10')
const sizeBtn30 = document.querySelector('.option__size-30')

function setLineWidth(size) {
	clearSizeBtn()
	currentLineWidth = size
}

function clearSizeBtn() {
	sizeBtn1.classList.remove('active')
	sizeBtn3.classList.remove('active')
	sizeBtn5.classList.remove('active')
	sizeBtn10.classList.remove('active')
	sizeBtn30.classList.remove('active')
}

const setLineWidth1 = () => {
	setLineWidth(1)
	sizeBtn1.classList.add('active')
}
const setLineWidth3 = () => {
	setLineWidth(3)
	sizeBtn3.classList.add('active')
}
const setLineWidth5 = () => {
	setLineWidth(5)
	sizeBtn5.classList.add('active')
}
const setLineWidth10 = () => {
	setLineWidth(10)
	sizeBtn10.classList.add('active')
}
const setLineWidth30 = () => {
	setLineWidth(30)
	sizeBtn30.classList.add('active')
}

let isOptionModalOpen = false
let isPaletteModalOpen = false

const optionModal = document.querySelector('.option-modal')
const optionBtn = document.querySelector('.options')

const paletteModal = document.querySelector('.palette-modal')
const paletteBtn = document.querySelector('.palette')

optionBtn.addEventListener('touchstart', () => {
	if (isOptionModalOpen) {
		isOptionModalOpen = false
		optionBtn.classList.remove('active')
		optionModal.style.display = 'none'
		return
	}
	isPaletteModalOpen = false
	paletteBtn.classList.remove('active')
	paletteModal.style.display = 'none'
	optionModal.style.display = 'flex'
	optionBtn.classList.add('active')
	isOptionModalOpen = true
})

const colorDivs = document.querySelectorAll('.palette__color')
const currentColorDiv = document.querySelector('.current-color')

colorDivs.forEach(div => {
	div.addEventListener('touchstart', () => {
		const color = getComputedStyle(div).backgroundColor
		currentColorDiv.style.backgroundColor = color
		currentStrokeColor = color
	})
})

paletteBtn.addEventListener('touchstart', () => {
	if (isPaletteModalOpen) {
		isPaletteModalOpen = false
		paletteBtn.classList.remove('active')
		paletteModal.style.display = 'none'
		return
	}
	isOptionModalOpen = false
	optionBtn.classList.remove('active')
	optionModal.style.display = 'none'
	paletteModal.style.display = 'flex'
	paletteBtn.classList.add('active')
	isPaletteModalOpen = true
})

document.querySelector('.prev').addEventListener('touchstart', undoLastStroke)
document.querySelector('.next').addEventListener('touchstart', redoLastStroke)
sizeBtn1.addEventListener('touchstart', setLineWidth1)
sizeBtn3.addEventListener('touchstart', setLineWidth3)
sizeBtn5.addEventListener('touchstart', setLineWidth5)
sizeBtn10.addEventListener('touchstart', setLineWidth10)
sizeBtn30.addEventListener('touchstart', setLineWidth30)

setLineWidth3()
