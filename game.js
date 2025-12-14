const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const themeToggle = document.getElementById("themeToggle");

/* THEME TOGGLE */
let isDarkTheme = false;

function toggleTheme() {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle("dark-theme", isDarkTheme);
  themeToggle.textContent = isDarkTheme ? "☀️" : "🌙";
}

themeToggle.addEventListener("click", toggleTheme);

/* GAME SETTINGS */
const GRAVITY = 0.8; // Slightly reduced gravity for better jump arc
const GROUND_Y = 250;
const MAX_CLOUDS = 3;

/* GAME STATE */
let gameRunning = false;
let speed = 6;
let score = 0;
let frameCount = 0;
let dayCycle = 0;
let cyclePoints = 0;

/* PLAYER */
class Dino {
  constructor() {
    this.width = 50;
    this.height = 60;
    this.x = 80;
    this.y = GROUND_Y - this.height;
    this.velocityY = 0;
    this.isJumping = false;
    this.legMove = 0;
    this.legDirection = 1;
  }

  jump() {
    if (!this.isJumping) {
      this.velocityY = -13; // Balanced jump velocity
      this.isJumping = true;
    }
  }

  update() {
    // Apply gravity
    this.velocityY += GRAVITY;
    
    // Update vertical position only
    this.y += this.velocityY;
    
    // Boundary checks
    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // Leg animation
    if (!this.isJumping) {
      this.legMove += 0.15 * this.legDirection;
      if (Math.abs(this.legMove) > 0.3) {
        this.legDirection *= -1;
      }
    } else {
      this.legMove = 0;
    }
  }

  draw() {
    // Draw dinosaur body
    ctx.fillStyle = isDarkTheme ? "#4CAF50" : "#388E3C";
    ctx.fillRect(this.x + 10, this.y + 15, 35, 30);
    
    // Draw dinosaur head
    ctx.fillRect(this.x + 40, this.y + 10, 15, 15);
    
    // Draw dinosaur legs
    const legOffset = this.isJumping ? 0 : Math.sin(this.legMove) * 3;
    ctx.fillRect(this.x + 15, this.y + 45, 8, 15 + legOffset);
    ctx.fillRect(this.x + 32, this.y + 45, 8, 15 - legOffset);
    
    // Draw dinosaur tail
    ctx.fillRect(this.x, this.y + 25, 15, 8);
  }
}

/* OBSTACLE */
class Obstacle {
  constructor() {
    // Determine if this is a flying obstacle (appears after score 30)
    this.isFlying = score >= 30 && Math.random() > 0.7;
    
    if (this.isFlying) {
      // Flying obstacles
      this.width = Math.random() > 0.5 ? 20 : 30;
      this.height = Math.random() > 0.5 ? 25 : 35;
      // Position in the sky (higher up)
      this.y = GROUND_Y - 120 - this.height + (Math.random() * 40);
    } else {
      // Ground obstacles
      this.width = Math.random() > 0.5 ? 15 : 25;
      this.height = Math.random() > 0.5 ? 30 : 40;
      this.y = GROUND_Y - this.height;
    }
    
    this.x = canvas.width;
  }

  update() {
    this.x -= speed;
  }

  draw() {
    if (this.isFlying) {
      // Draw flying obstacle (different color)
      ctx.fillStyle = isDarkTheme ? "#FF5252" : "#D32F2F";
    } else {
      // Draw ground obstacle
      ctx.fillStyle = isDarkTheme ? "#8BC34A" : "#4CAF50";
    }
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

/* GROUND */
class Ground {
  constructor() {
    this.x = 0;
  }

  update() {
    this.x -= speed;
    if (this.x <= -50) this.x = 0;
  }

  draw() {
    // Simplified ground drawing
    ctx.fillStyle = isDarkTheme ? "#5D4037" : "#795548";
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    
    // Simplified ground details
    ctx.fillStyle = isDarkTheme ? "#4E342E" : "#6D4C41";
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(i * 100 + this.x % 100, GROUND_Y + 5, 20, 3);
    }
  }
}

/* CLOUDS */
class Cloud {
  constructor() {
    this.x = canvas.width;
    this.y = 30 + Math.random() * 70;
    this.speed = 0.5 + Math.random() * 1.5;
    // Pre-calculate cloud dimensions for performance
    this.width = 40;
    this.height = 20;
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    // Simplified cloud drawing with fewer arc operations
    ctx.fillStyle = isDarkTheme ? "rgba(200, 200, 200, 0.7)" : "rgba(255, 255, 255, 0.7)";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

/* DAY/NIGHT CYCLE */
function updateDayNightCycle() {
  // Change day/night cycle every 50 points
  const newCycle = Math.floor(score / 50) % 2;
  if (newCycle !== dayCycle) {
    dayCycle = newCycle;
  }
}

function getSkyColor() {
  if (dayCycle === 0) {
    // Day sky
    return isDarkTheme ? "#1a237e" : "#87CEEB";
  } else {
    // Night sky
    return isDarkTheme ? "#0d1b3d" : "#1a1a2e";
  }
}

const dino = new Dino();
const ground = new Ground();
let obstacles = [];
let clouds = [];

// Initialize clouds with fixed array (avoiding splice operations)
for (let i = 0; i < MAX_CLOUDS; i++) {
  const cloud = new Cloud();
  cloud.x = (canvas.width / MAX_CLOUDS) * i;
  clouds[i] = cloud;
}

/* COLLISION */
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/* GAME LOOP */
function gameLoop() {
  if (!gameRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update day/night cycle
  updateDayNightCycle();

  // Draw sky background with day/night cycle
  ctx.fillStyle = getSkyColor();
  ctx.fillRect(0, 0, canvas.width, GROUND_Y);

  // Update and draw stars at night
  if (dayCycle === 1) {
    ctx.fillStyle = "white";
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % canvas.width;
      const y = 20 + (i * 17) % 100;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Update and draw clouds (optimized to avoid array manipulation)
  for (let i = 0; i < clouds.length; i++) {
    const cloud = clouds[i];
    cloud.update();
    cloud.draw();
    
    // Reset cloud position when it goes off screen
    if (cloud.x + cloud.width < 0) {
      cloud.x = canvas.width;
      cloud.y = 30 + Math.random() * 70;
    }
  }

  ground.update();
  ground.draw();

  dino.update();
  dino.draw();

  // Increase obstacle frequency as score increases
  // After score 50, obstacles come even faster
  let obstacleFrequency;
  if (score >= 50) {
    obstacleFrequency = Math.max(20, 70 - Math.floor(score / 5));
  } else {
    obstacleFrequency = Math.max(30, 90 - Math.floor(score / 10));
  }
  
  if (frameCount % obstacleFrequency === 0) {
    obstacles.push(new Obstacle());
  }

  // Use traditional for loop for better performance
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    obs.update();
    obs.draw();

    if (isColliding(dino, obs)) {
      endGame();
      return;
    }

    // Remove obstacles that are off-screen
    if (obs.x + obs.width < 0) {
      obstacles.splice(i, 1);
      score++;
      i--;
    }
  }

  // Increase speed gradually for more difficulty
  // After score 50, speed increases faster
  if (score >= 50) {
    speed = 6 + Math.floor(score / 5) * 0.5;
  } else {
    speed = 6 + Math.floor(score / 10) * 0.5;
  }
  
  frameCount++;

  drawScore();
  requestAnimationFrame(gameLoop);
}

function drawScore() {
  ctx.fillStyle = isDarkTheme ? "#FFFFFF" : "#000000";
  ctx.font = "bold 18px Arial";
  
  // Show day/night indicator
  const cycleText = dayCycle === 0 ? "DAY" : "NIGHT";
  ctx.fillText(`Score: ${score} | ${cycleText}`, 20, 30);
}

/* GAME CONTROL */
function startGame() {
  overlay.classList.add("hidden");
  gameRunning = true;
  speed = 6;
  score = 0;
  frameCount = 0;
  dayCycle = 0;
  cyclePoints = 0;
  obstacles = [];
  gameLoop();
}

function endGame() {
  gameRunning = false;
  overlay.classList.remove("hidden");
  overlay.querySelector("h1").innerText = "Game Over";
  overlay.querySelector("p").innerHTML = `Final Score: ${score}<br>Press SPACE or CLICK to Jump`;
}

/* INPUT */
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    if (!gameRunning && !overlay.classList.contains("hidden")) {
      startGame();
    } else {
      dino.jump();
    }
  }
});

canvas.addEventListener("click", () => {
  if (!gameRunning && !overlay.classList.contains("hidden")) {
    startGame();
  } else {
    dino.jump();
  }
});

startBtn.addEventListener("click", startGame);