const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const heightLabel = document.getElementById("height");
const livesLabel = document.getElementById("lives");
const rescuedLabel = document.getElementById("rescued");
const goalLabel = document.getElementById("goal");
const messageBox = document.getElementById("message");
const touchButtons = document.querySelectorAll(".touch");

const worldHeight = 4600;
const state = {
  running: false,
  won: false,
  lost: false,
  cameraY: 0,
  keys: new Set(),
  lastTime: 0,
  branches: [],
  eagles: [],
  cages: [],
  rescuedCount: 0,
  pets: [],
  bird: null,
  nest: null,
};

function resetGame() {
  state.running = false;
  state.won = false;
  state.lost = false;
  state.cameraY = worldHeight - canvas.height;
  state.lastTime = 0;
  state.branches = createBranches();
  state.eagles = createEagles();
  state.cages = createCages();
  state.rescuedCount = 0;
  state.pets = [];
  state.nest = { x: 160, y: 110, width: 110, height: 56 };
  state.bird = {
    x: 210,
    y: worldHeight - 110,
    width: 30,
    height: 24,
    vx: 0,
    vy: 0,
    facing: 1,
    lives: 3,
    invulnerable: 0,
  };
  updateHud();
  showMessage("Fly Up to the Nest", "Use quick boosts to slip past branches and swooping eagles.", true);
  draw();
}

function createBranches() {
  const branches = [];
  for (let row = 0; row < 22; row += 1) {
    const y = worldHeight - 220 - row * 180;
    const gapX = 70 + (row * 83) % 180;
    const gapWidth = 110 + (row % 3) * 18;
    branches.push({ x: 0, y, width: gapX, height: 18 });
    branches.push({ x: gapX + gapWidth, y, width: canvas.width - (gapX + gapWidth), height: 18 });

    if (row % 3 === 1) {
      branches.push({
        x: 100 + (row * 47) % 180,
        y: y - 78,
        width: 120,
        height: 16,
      });
    }
  }
  return branches;
}

function createEagles() {
  const eagles = [];
  for (let i = 0; i < 10; i += 1) {
    const y = worldHeight - 500 - i * 360;
    const fromLeft = i % 2 === 0;
    eagles.push({
      x: fromLeft ? -40 : canvas.width + 40,
      y,
      width: 44,
      height: 24,
      vx: fromLeft ? 90 + i * 8 : -90 - i * 8,
      bob: Math.random() * Math.PI * 2,
    });
  }
  return eagles;
}

function createCages() {
  return [
    { id: "pet-1", x: 70, y: worldHeight - 760, width: 42, height: 54, rescued: false, lost: false, pulse: 0 },
    { id: "pet-2", x: 286, y: worldHeight - 1640, width: 42, height: 54, rescued: false, lost: false, pulse: 1.8 },
    { id: "pet-3", x: 122, y: worldHeight - 2620, width: 42, height: 54, rescued: false, lost: false, pulse: 3.1 },
    { id: "pet-4", x: 258, y: worldHeight - 3460, width: 42, height: 54, rescued: false, lost: false, pulse: 4.4 },
  ];
}

function showMessage(title, body, showButton = false) {
  messageBox.innerHTML = `
    <h2>${title}</h2>
    <p>${body}</p>
    ${showButton ? '<button id="start-button" type="button">Start Game</button>' : ""}
  `;
  messageBox.classList.remove("hidden");
  const button = document.getElementById("start-button");
  if (button) {
    button.addEventListener("click", startGame, { once: true });
  }
}

function hideMessage() {
  messageBox.classList.add("hidden");
}

function startGame() {
  if (state.won || state.lost) {
    resetGame();
  }
  state.running = true;
  hideMessage();
}

function updateHud() {
  const climbed = Math.max(0, Math.round((worldHeight - state.bird.y - 110) / 12));
  heightLabel.textContent = `${climbed} m`;
  livesLabel.textContent = String(state.bird.lives);
  rescuedLabel.textContent = `${state.rescuedCount}/${state.cages.length}`;
  goalLabel.textContent = state.won ? "Home" : "Nest";
}

function getBirdCenter() {
  return {
    x: state.bird.x + state.bird.width / 2,
    y: state.bird.y + state.bird.height / 2,
  };
}

function overlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function hitBird() {
  if (state.bird.invulnerable > 0) {
    return;
  }

  state.bird.lives -= 1;
  state.bird.invulnerable = 2;
  state.bird.vx = 0;
  state.bird.vy = 160;

  if (state.bird.lives <= 0) {
    state.running = false;
    state.lost = true;
    showMessage("The Forest Won This Round", "Press R to try again and find a safer path upward.");
  }

  updateHud();
}

function rescueCage(cage) {
  cage.rescued = true;
  state.rescuedCount += 1;
  state.pets.push({
    id: cage.id,
    x: cage.x + cage.width / 2,
    y: cage.y + cage.height / 2,
    phase: cage.pulse,
  });
  updateHud();
}

function getNearestRescuableCage(maxDistance = 160) {
  const birdCenter = getBirdCenter();
  let nearest = null;
  let nearestDistance = maxDistance;

  for (const cage of state.cages) {
    if (cage.rescued || cage.lost) {
      continue;
    }

    const cageCenterX = cage.x + cage.width / 2;
    const cageCenterY = cage.y + cage.height / 2;
    const distance = Math.hypot(birdCenter.x - cageCenterX, birdCenter.y - cageCenterY);
    if (distance <= nearestDistance) {
      nearest = cage;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function rescueNearbyCage() {
  const cage = getNearestRescuableCage();
  if (!cage) {
    return false;
  }

  rescueCage(cage);
  return true;
}

function losePet() {
  if (state.bird.invulnerable > 0) {
    return;
  }

  if (state.pets.length === 0) {
    hitBird();
    return;
  }

  const pet = state.pets.pop();
  const cage = state.cages.find((item) => item.id === pet.id);
  if (cage) {
    cage.lost = true;
  }
  state.bird.invulnerable = Math.max(state.bird.invulnerable, 1.1);
}

function updateBird(dt) {
  const bird = state.bird;
  const horizontal = (state.keys.has("ArrowRight") || state.keys.has("d") ? 1 : 0)
    - (state.keys.has("ArrowLeft") || state.keys.has("a") ? 1 : 0);
  const boosting = state.keys.has(" ") || state.keys.has("ArrowUp") || state.keys.has("w");

  bird.vx = horizontal * 180;
  if (horizontal !== 0) {
    bird.facing = horizontal;
  }
  bird.vy += boosting ? -410 * dt : 260 * dt;
  bird.vy = Math.max(-220, Math.min(220, bird.vy));

  const previous = { x: bird.x, y: bird.y };
  bird.x += bird.vx * dt;
  bird.y += bird.vy * dt;

  bird.x = Math.max(0, Math.min(canvas.width - bird.width, bird.x));
  bird.y = Math.max(0, Math.min(worldHeight - bird.height, bird.y));

  for (const branch of state.branches) {
    if (!overlap(bird, branch)) {
      continue;
    }

    if (previous.y + bird.height <= branch.y) {
      bird.y = branch.y - bird.height;
      bird.vy = Math.min(30, bird.vy);
    } else if (previous.y >= branch.y + branch.height) {
      bird.y = branch.y + branch.height;
      bird.vy = Math.max(60, bird.vy);
    } else if (previous.x + bird.width <= branch.x) {
      bird.x = branch.x - bird.width;
    } else if (previous.x >= branch.x + branch.width) {
      bird.x = branch.x + branch.width;
    } else {
      hitBird();
    }
  }

  if (bird.invulnerable > 0) {
    bird.invulnerable -= dt;
  }

  if (overlap(bird, state.nest)) {
    state.running = false;
    state.won = true;
    updateHud();
    showMessage("Nest Reached", "You made it home. Press R to fly again.");
  }
}

function updateEagles(dt) {
  for (const eagle of state.eagles) {
    eagle.bob += dt * 3;
    eagle.x += eagle.vx * dt;
    eagle.y += Math.sin(eagle.bob) * 18 * dt;

    if (eagle.vx > 0 && eagle.x > canvas.width + 60) {
      eagle.x = -80;
    }
    if (eagle.vx < 0 && eagle.x < -80) {
      eagle.x = canvas.width + 60;
    }

    if (overlap(state.bird, eagle)) {
      losePet();
    }
  }
}

function updateCages(dt) {
  for (const cage of state.cages) {
    cage.pulse += dt * 2.4;
  }
}

function updatePets(dt) {
  state.pets.forEach((pet, index) => {
    const targetX = state.bird.x - 30 - index * 20 + Math.sin(pet.phase) * 16;
    const targetY = state.bird.y + 8 + index * 12 + Math.cos(pet.phase * 1.3) * 10;
    pet.phase += dt * 5;
    pet.x += (targetX - pet.x) * 0.09;
    pet.y += (targetY - pet.y) * 0.09;
  });
}

function updateCamera() {
  const targetY = state.bird.y - canvas.height * 0.62;
  state.cameraY += (targetY - state.cameraY) * 0.08;
  state.cameraY = Math.max(0, Math.min(worldHeight - canvas.height, state.cameraY));
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#dff6ff");
  gradient.addColorStop(0.55, "#78baf0");
  gradient.addColorStop(1, "#2d658f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(31, 86, 47, 0.18)" : "rgba(12, 54, 31, 0.18)";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - i * 20);
    for (let x = 0; x <= canvas.width; x += 28) {
      const y = canvas.height - 50 - i * 40 - Math.sin((x + i * 30) * 0.03) * 18;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBranch(branch) {
  const screenY = branch.y - state.cameraY;
  if (screenY > canvas.height || screenY + branch.height < 0) {
    return;
  }

  ctx.fillStyle = "#6e4121";
  ctx.fillRect(branch.x, screenY, branch.width, branch.height);
  ctx.fillStyle = "#4d9c52";
  for (let x = branch.x + 8; x < branch.x + branch.width - 8; x += 26) {
    ctx.beginPath();
    ctx.arc(x, screenY - 2, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCage(cage) {
  const screenY = cage.y - state.cameraY;
  if (screenY > canvas.height + 20 || screenY + cage.height < -20) {
    return;
  }

  if (cage.rescued) {
    return;
  }

  if (cage.lost) {
    ctx.save();
    ctx.strokeStyle = "rgba(127, 91, 56, 0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(cage.x, screenY, cage.width, cage.height);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.strokeStyle = "#7f5b38";
  ctx.lineWidth = 3;
  ctx.strokeRect(cage.x, screenY, cage.width, cage.height);

  ctx.strokeStyle = "#d6e2ea";
  ctx.lineWidth = 2;
  for (let x = cage.x + 8; x < cage.x + cage.width; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, screenY + 4);
    ctx.lineTo(x, screenY + cage.height - 4);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cage.x + cage.width / 2, screenY - 2, 7, Math.PI, 0);
  ctx.strokeStyle = "#7f5b38";
  ctx.stroke();

  ctx.fillStyle = "#49d5a8";
  ctx.beginPath();
  ctx.ellipse(cage.x + cage.width / 2, screenY + cage.height / 2 + 2, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#21b3d0";
  ctx.beginPath();
  ctx.moveTo(cage.x + cage.width / 2 - 1, screenY + cage.height / 2);
  ctx.lineTo(cage.x + 6, screenY + cage.height / 2 - 5);
  ctx.lineTo(cage.x + 11, screenY + cage.height / 2 + 3);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cage.x + cage.width / 2 - 1, screenY + cage.height / 2 + 3);
  ctx.lineTo(cage.x + 7, screenY + cage.height / 2 + 10);
  ctx.lineTo(cage.x + 13, screenY + cage.height / 2 + 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ef5562";
  ctx.beginPath();
  ctx.moveTo(cage.x + cage.width / 2 + 7, screenY + cage.height / 2 + 1);
  ctx.lineTo(cage.x + cage.width / 2 + 14, screenY + cage.height / 2 + 3);
  ctx.lineTo(cage.x + cage.width / 2 + 7, screenY + cage.height / 2 + 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawHummingbird(x, y, phase = 0, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(phase) * 0.08);
  ctx.scale(scale, scale);

  ctx.fillStyle = "#49d5a8";
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#21b3d0";
  ctx.beginPath();
  ctx.moveTo(-3, -1);
  ctx.lineTo(-14, -7);
  ctx.lineTo(-8, 3);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-2, 1);
  ctx.lineTo(-13, 8);
  ctx.lineTo(-6, 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ef5562";
  ctx.beginPath();
  ctx.moveTo(8, -1);
  ctx.lineTo(18, 1);
  ctx.lineTo(8, 3);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPets() {
  for (const pet of state.pets) {
    const screenY = pet.y - state.cameraY;
    drawHummingbird(pet.x, screenY, pet.phase, 0.95);
  }
}

function drawEagle(eagle) {
  const screenY = eagle.y - state.cameraY;
  if (screenY > canvas.height + 40 || screenY < -60) {
    return;
  }

  ctx.save();
  ctx.translate(eagle.x + eagle.width / 2, screenY + eagle.height / 2);
  if (eagle.vx < 0) {
    ctx.scale(-1, 1);
  }

  ctx.fillStyle = "#5d3d22";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8f6a43";
  ctx.beginPath();
  ctx.moveTo(-5, -3);
  ctx.lineTo(-28, -12);
  ctx.lineTo(-12, 3);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(5, -3);
  ctx.lineTo(28, -12);
  ctx.lineTo(12, 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e1caa3";
  ctx.beginPath();
  ctx.arc(12, -2, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d3a239";
  ctx.beginPath();
  ctx.moveTo(18, -1);
  ctx.lineTo(28, 2);
  ctx.lineTo(18, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawNest() {
  const { x, y, width, height } = state.nest;
  const screenY = y - state.cameraY;

  ctx.fillStyle = "#91613d";
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.ellipse(x + width / 2, screenY + height / 2 + i * 2, width / 2, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 247, 220, 0.7)";
  ctx.beginPath();
  ctx.ellipse(x + width / 2, screenY + height / 2, width / 2 - 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBird() {
  const bird = state.bird;
  const screenY = bird.y - state.cameraY;
  const flashing = bird.invulnerable > 0 && Math.floor(bird.invulnerable * 10) % 2 === 0;
  if (flashing) {
    return;
  }

  ctx.save();
  ctx.translate(bird.x + bird.width / 2, screenY + bird.height / 2);
  ctx.scale(bird.facing, 1);

  ctx.fillStyle = "#f8d66b";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f1b94d";
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.lineTo(-20, -10);
  ctx.lineTo(-12, 4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.lineTo(-19, 10);
  ctx.lineTo(-10, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e47d2f";
  ctx.beginPath();
  ctx.moveTo(13, -1);
  ctx.lineTo(24, 2);
  ctx.lineTo(13, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1d1d1d";
  ctx.beginPath();
  ctx.arc(8, -3, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function draw() {
  drawBackground();
  drawNest();
  for (const branch of state.branches) {
    drawBranch(branch);
  }
  for (const cage of state.cages) {
    drawCage(cage);
  }
  for (const eagle of state.eagles) {
    drawEagle(eagle);
  }
  drawPets();
  drawBird();
}

function tick(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }
  const dt = Math.min(0.02, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;

  if (state.running) {
    updateBird(dt);
    updateEagles(dt);
    updateCages(dt);
    updatePets(dt);
    updateCamera();
    updateHud();
  }

  draw();
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  state.keys.add(key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (key === "e") {
    rescueNearbyCage();
  }
  if (key === "r") {
    resetGame();
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  state.keys.delete(key);
});

canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const canvasX = (event.clientX - rect.left) * scaleX;
  const canvasY = (event.clientY - rect.top) * scaleY;
  const worldY = canvasY + state.cameraY;

  for (const cage of state.cages) {
    if (cage.rescued) {
      continue;
    }

    const tapped = (
      canvasX >= cage.x &&
      canvasX <= cage.x + cage.width &&
      worldY >= cage.y &&
      worldY <= cage.y + cage.height
    );
    if (!tapped) {
      continue;
    }

    if (getNearestRescuableCage() !== cage) {
      continue;
    }

    rescueCage(cage);
    break;
  }
});

for (const button of touchButtons) {
  const key = button.dataset.key;
  const action = button.dataset.action;
  const press = (event) => {
    event.preventDefault();
    if (action === "rescue") {
      rescueNearbyCage();
      return;
    }
    state.keys.add(key);
  };
  const release = (event) => {
    event.preventDefault();
    if (action === "rescue") {
      return;
    }
    state.keys.delete(key);
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("touchstart", press, { passive: false });
  button.addEventListener("touchend", release, { passive: false });
  button.addEventListener("touchcancel", release, { passive: false });
  button.addEventListener("mousedown", press);
  button.addEventListener("mouseup", release);
}

resetGame();
requestAnimationFrame(tick);
