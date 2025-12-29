const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const TILE_SIZE = 24;
const WALL = 1;
const DOT = 0;
const EMPTY = 2;

// 1 = wall, 0 = dot, 2 = empty.
const maze = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const ROWS = maze.length;
const COLS = maze[0].length;
canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

let dotsLeft = 0;
for (let row = 0; row < ROWS; row += 1) {
  for (let col = 0; col < COLS; col += 1) {
    if (maze[row][col] === DOT) dotsLeft += 1;
  }
}

// Grid-aligned actors; progress keeps smooth movement within a tile.
const pacman = {
  col: 1,
  row: 1,
  dirX: 1,
  dirY: 0,
  speed: 80,
  progress: 0,
};

const ghost = {
  col: 17,
  row: 13,
  dirX: 0,
  dirY: 0,
  desiredDirX: 0,
  desiredDirY: 0,
  speed: 90,
  progress: 0,
};

let gameOver = false;
let winner = "";

function isWall(row, col) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
  return maze[row][col] === WALL;
}

function getValidDirections(col, row) {
  const dirs = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  return dirs.filter((dir) => !isWall(row + dir.y, col + dir.x));
}

// Pac-Man picks a random valid direction at intersections.
function choosePacmanDirection() {
  if (pacman.progress !== 0) return;
  const valid = getValidDirections(pacman.col, pacman.row);
  if (valid.length === 0) {
    pacman.dirX = 0;
    pacman.dirY = 0;
    return;
  }

  const canContinue = valid.some(
    (dir) => dir.x === pacman.dirX && dir.y === pacman.dirY
  );
  const atIntersection = valid.length >= 3;

  if (!canContinue || atIntersection || (pacman.dirX === 0 && pacman.dirY === 0)) {
    const reverse = { x: -pacman.dirX, y: -pacman.dirY };
    let candidates = valid;
    if (valid.length > 1) {
      candidates = valid.filter(
        (dir) => !(dir.x === reverse.x && dir.y === reverse.y)
      );
      if (candidates.length === 0) candidates = valid;
    }
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    pacman.dirX = choice.x;
    pacman.dirY = choice.y;
  }
}

function applyGhostDirection() {
  if (ghost.progress !== 0) return;
  if (ghost.desiredDirX !== 0 || ghost.desiredDirY !== 0) {
    const targetRow = ghost.row + ghost.desiredDirY;
    const targetCol = ghost.col + ghost.desiredDirX;
    if (!isWall(targetRow, targetCol)) {
      ghost.dirX = ghost.desiredDirX;
      ghost.dirY = ghost.desiredDirY;
    }
  }

  const nextRow = ghost.row + ghost.dirY;
  const nextCol = ghost.col + ghost.dirX;
  if ((ghost.dirX !== 0 || ghost.dirY !== 0) && isWall(nextRow, nextCol)) {
    ghost.dirX = 0;
    ghost.dirY = 0;
  }
}

// Move an entity forward while respecting walls and tile boundaries.
function updateEntity(entity, dt) {
  if (entity.dirX === 0 && entity.dirY === 0) return;
  let nextCol = entity.col + entity.dirX;
  let nextRow = entity.row + entity.dirY;
  if (isWall(nextRow, nextCol)) {
    entity.progress = 0;
    entity.dirX = 0;
    entity.dirY = 0;
    return;
  }

  entity.progress += entity.speed * dt;
  while (entity.progress >= TILE_SIZE) {
    nextCol = entity.col + entity.dirX;
    nextRow = entity.row + entity.dirY;
    if (isWall(nextRow, nextCol)) {
      entity.progress = 0;
      entity.dirX = 0;
      entity.dirY = 0;
      return;
    }
    entity.col = nextCol;
    entity.row = nextRow;
    entity.progress -= TILE_SIZE;
  }
}

function eatDot() {
  if (maze[pacman.row][pacman.col] === DOT) {
    maze[pacman.row][pacman.col] = EMPTY;
    dotsLeft -= 1;
  }
}

function getPixelPosition(entity) {
  return {
    x: entity.col * TILE_SIZE + TILE_SIZE / 2 + entity.dirX * entity.progress,
    y: entity.row * TILE_SIZE + TILE_SIZE / 2 + entity.dirY * entity.progress,
  };
}

function checkCollisions() {
  const pPos = getPixelPosition(pacman);
  const gPos = getPixelPosition(ghost);
  const dx = pPos.x - gPos.x;
  const dy = pPos.y - gPos.y;
  const distance = Math.hypot(dx, dy);
  if (distance < TILE_SIZE * 0.5) {
    gameOver = true;
    winner = "Ghost wins!";
  }
}

function updateGame(dt) {
  choosePacmanDirection();
  applyGhostDirection();
  updateEntity(pacman, dt);
  updateEntity(ghost, dt);
  eatDot();
  checkCollisions();

  if (!gameOver && dotsLeft === 0) {
    gameOver = true;
    winner = "Pac-Man wins!";
  }
}

function drawMaze() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = maze[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      if (cell === WALL) {
        ctx.fillStyle = "#1e4cc7";
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (cell === DOT) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawEntities() {
  const pacPos = getPixelPosition(pacman);
  const ghostPos = getPixelPosition(ghost);

  ctx.fillStyle = "#f7d51d";
  ctx.beginPath();
  ctx.arc(pacPos.x, pacPos.y, TILE_SIZE * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e63939";
  ctx.beginPath();
  ctx.arc(ghostPos.x, ghostPos.y, TILE_SIZE * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function renderGame() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawMaze();
  drawEntities();
}

let lastTime = 0;
// Main loop: update state, then render.
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (!gameOver) {
    updateGame(dt);
  }

  renderGame();
  statusEl.textContent = gameOver ? winner : "";
  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowUp":
      ghost.desiredDirX = 0;
      ghost.desiredDirY = -1;
      event.preventDefault();
      break;
    case "ArrowDown":
      ghost.desiredDirX = 0;
      ghost.desiredDirY = 1;
      event.preventDefault();
      break;
    case "ArrowLeft":
      ghost.desiredDirX = -1;
      ghost.desiredDirY = 0;
      event.preventDefault();
      break;
    case "ArrowRight":
      ghost.desiredDirX = 1;
      ghost.desiredDirY = 0;
      event.preventDefault();
      break;
    default:
      break;
  }
});

requestAnimationFrame(gameLoop);
