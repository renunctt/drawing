const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Логический размер
canvas.width = 500;
canvas.height = 500;

// Трансформация
let scale = 1;
let rotation = 0;
let offsetX = window.innerWidth / 2;
let offsetY = window.innerHeight / 2;

let isDrawing = false;
let lastX = 0, lastY = 0;

let lastTouches = [];

function drawCanvas() {
  const display = canvas.getBoundingClientRect();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // сброс
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // применяем трансформацию
  ctx.setTransform(
    scale * Math.cos(rotation),
    scale * Math.sin(rotation),
    -scale * Math.sin(rotation),
    scale * Math.cos(rotation),
    offsetX,
    offsetY
  );

  ctx.fillStyle = "#fff";
  ctx.fillRect(-250, -250, 500, 500); // центрируем

  // уже нарисованные линии останутся, не затираем
}

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  if (e.touches.length === 1) {
    isDrawing = true;
    const { x, y } = getTransformedPoint(e.touches[0]);
    lastX = x;
    lastY = y;
  } else if (e.touches.length === 2) {
    isDrawing = false;
    lastTouches = [...e.touches];
  }
});

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  if (e.touches.length === 1 && isDrawing) {
    const { x, y } = getTransformedPoint(e.touches[0]);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    lastX = x;
    lastY = y;
  } else if (e.touches.length === 2 && lastTouches.length === 2) {
    // МАСШТАБ И ВРАЩЕНИЕ
    const [t1, t2] = e.touches;
    const [p1, p2] = lastTouches;

    const prevDist = getDistance(p1, p2);
    const currDist = getDistance(t1, t2);
    const scaleDelta = currDist / prevDist;

    const prevAngle = getAngle(p1, p2);
    const currAngle = getAngle(t1, t2);
    const rotationDelta = currAngle - prevAngle;

    scale *= scaleDelta;
    rotation += rotationDelta;

    // ПЕРЕМЕЩЕНИЕ
    const prevCenter = getCenter(p1, p2);
    const currCenter = getCenter(t1, t2);

    offsetX += currCenter.clientX - prevCenter.clientX;
    offsetY += currCenter.clientY - prevCenter.clientY;

    lastTouches = [...e.touches];
    drawCanvas();
  }
});

canvas.addEventListener("touchend", e => {
  if (e.touches.length < 2) lastTouches = [];
  if (e.touches.length === 0) isDrawing = false;
});

// --- Утилиты ---
function getDistance(p1, p2) {
  return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
}

function getAngle(p1, p2) {
  return Math.atan2(p2.clientY - p1.clientY, p2.clientX - p1.clientX);
}

function getCenter(p1, p2) {
  return {
    clientX: (p1.clientX + p2.clientX) / 2,
    clientY: (p1.clientY + p2.clientY) / 2
  };
}

// Переводит координаты касания в систему координат canvas с учётом трансформации
function getTransformedPoint(touch) {
  const x = touch.clientX - offsetX;
  const y = touch.clientY - offsetY;

  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);

  const tx = (x * cos - y * sin) / scale;
  const ty = (x * sin + y * cos) / scale;

  return { x: tx, y: ty };
}

// Инициал
drawCanvas();
