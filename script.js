// --- Element References ---
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const playerNameInput = document.getElementById('player-name');
const playerDisplay = document.getElementById('player-display');
const livesDisplay = document.getElementById('lives');
const bucketsFilledDisplay = document.getElementById('buckets-filled');
const leaderboardList = document.getElementById('leaderboard-list');
const bigBucketFill = document.getElementById('bucket-fill');
const plinkoBoard = document.getElementById('plinko-board');
const cloud = document.getElementById('cloud');
const dropBtn = document.getElementById('drop-btn');
const howToPlayBtn = document.getElementById('how-to-play-btn');
const aboutBtn = document.getElementById('about-btn');
const donateBtn = document.getElementById('donate-btn');
const resetBtn = document.getElementById('reset-btn');
const howToPlayModal = document.getElementById('how-to-play-modal');
const closeHowToPlay = document.getElementById('close-how-to-play');
const endGameModal = document.getElementById('end-game-modal');
const endGameMessage = document.getElementById('end-game-message');
const playAgainBtn = document.getElementById('play-again-btn');
const countdownTimer = document.getElementById('countdown-timer');
const pauseBtn = document.getElementById('pause-btn');
const pauseModal = document.getElementById('pause-modal');
const resumeBtn = document.getElementById('resume-btn');
const horizontalProgressBar = document.getElementById('horizontal-progress-bar');
const progressText = document.getElementById('progress-text');

// ✅ Updated fact banner element
const factBanner = document.getElementById('fact-banner');
factBanner.innerHTML = `<span id="fact-text"></span>`;
const factText = document.getElementById('fact-text');

const POINTS_TO_FILL_BUCKET = 75;

// --- Game State ---
let lives = 5;
let bucketsFilled = 0;
let currentFill = 0;
let countdown = 10;
let countdownInterval;
let autoDropTimeout;
let isPaused = false;
let factIndex = 0;
let factRotationInterval;

const facts = [
  "1 in 10 people worldwide lack access to clean water.",
  "Every day, women and girls spend 200 million hours collecting water.",
  "Charity: Water has funded over 120,000 water projects since 2006.",
  "Access to clean water can cut child mortality by up to 21%.",
  "Charity: Water works in 29 countries around the world.",
  "Dirty water kills more people every year than all forms of violence, including war.",
  "Access to clean water improves school attendance, especially for girls.",
  "In communities with clean water, income can increase by up to 50%.",
  "100% of public donations to Charity: Water fund clean water projects.",
  "Charity: Water uses remote sensors to monitor water point functionality in real-time."
];

function showFactBanner() {
  console.log("showFactBanner triggered", facts[factIndex]);
  if (factText) {
    factText.textContent = `💧Fact: ${facts[factIndex]}`;
  }
  factIndex = (factIndex + 1) % facts.length;
}

function startFactRotation() {
  showFactBanner();
  factRotationInterval = setInterval(showFactBanner, 10000);
}

function stopFactRotation() {
  clearInterval(factRotationInterval);
}

function updateLives() {
  livesDisplay.textContent = `Drops: ${'💧'.repeat(lives)}`;
}

function updateBucketsFilled() {
  bucketsFilledDisplay.textContent = `Buckets Filled: ${bucketsFilled}`;
}

function updateLeaderboard() {
  const scores = JSON.parse(localStorage.getItem('charityWaterScores')) || [];
  leaderboardList.innerHTML = '';
  scores.sort((a, b) => b.buckets - a.buckets).slice(0, 5).forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.name}: ${entry.buckets} buckets`;
    leaderboardList.appendChild(li);
  });
}

function saveScore(name, buckets) {
  const scores = JSON.parse(localStorage.getItem('charityWaterScores')) || [];
  scores.push({ name, buckets });
  localStorage.setItem('charityWaterScores', JSON.stringify(scores));
}

function shuffleBucketValues() {
  const values = [10, 20, 30, 40, 50];
  const shuffled = values.sort(() => 0.5 - Math.random()).slice(0, 3);
  document.querySelectorAll('.bucket').forEach((bucket, index) => {
    bucket.setAttribute('data-points', shuffled[index]);
    bucket.querySelector('.bucket-value').textContent = shuffled[index];
  });
}

function createPegs() {
  const boardWidth = plinkoBoard.offsetWidth;
  const boardHeight = plinkoBoard.offsetHeight;

  const cols = Math.max(5, Math.min(7, Math.floor(boardWidth / 70)));
  const rows = Math.max(4, Math.min(6, Math.floor(boardHeight / 80)));

  const pegDiameter = Math.max(14, Math.min(22, boardWidth / (cols * 2)));

  const topMargin = cloud.offsetHeight + 10;
  const bottomMargin = 70;
  const usableHeight = boardHeight - topMargin - bottomMargin;
  const spacingY = usableHeight / (rows - 1);

  const sideMargin = pegDiameter * 1.2;
  const usableWidth = boardWidth - 2 * sideMargin - pegDiameter;
  const spacingX = usableWidth / (cols - 1);

  plinkoBoard.querySelectorAll('.peg').forEach(p => p.remove());

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const peg = document.createElement('div');
      peg.classList.add('peg');
      peg.style.width = `${pegDiameter}px`;
      peg.style.height = `${pegDiameter}px`;

      const jitterX = Math.floor(Math.random() * pegDiameter / 3) - pegDiameter / 6;
      const jitterY = Math.floor(Math.random() * pegDiameter / 3) - pegDiameter / 6;

      let left = sideMargin + c * spacingX + jitterX;
      if (r % 2 === 1) left += spacingX / 2;
      left = Math.min(left, boardWidth - pegDiameter - sideMargin);

      let top = topMargin + r * spacingY + jitterY;

      peg.style.left = `${left}px`;
      peg.style.top = `${top}px`;

      plinkoBoard.appendChild(peg);
    }
  }
}

// --- Cloud Drag ---
let isDragging = false;
let offsetX;

cloud.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.offsetX;
  cloud.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (isDragging && !isPaused) {
    const boardRect = plinkoBoard.getBoundingClientRect();
    let x = e.clientX - boardRect.left - offsetX;
    x = Math.max(0, Math.min(x, boardRect.width - cloud.clientWidth));
    cloud.style.left = `${x}px`;
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  cloud.style.cursor = 'grab';
});

// --- Droplet Drop Logic ---
dropBtn.addEventListener('click', () => {
  if (lives <= 0 || isPaused) return;
  clearCountdown();
  lives--;
  updateLives();

  const droplet = document.createElement('div');
  droplet.classList.add('droplet');

  const isGolden = Math.random() < 0.2;
  if (isGolden) droplet.classList.add('golden');

  const dropDiameter = Math.max(18, Math.min(32, plinkoBoard.offsetWidth / 15));
  droplet.style.width = `${dropDiameter}px`;
  droplet.style.height = `${dropDiameter}px`;

  const cloudLeft = parseInt(cloud.style.left) || 110;
  const dropStart = Math.max(
    0,
    Math.min(
      cloudLeft + cloud.clientWidth / 2 - dropDiameter / 2,
      plinkoBoard.clientWidth - dropDiameter
    )
  );
  droplet.style.left = `${dropStart}px`;
  droplet.style.top = '0px';
  plinkoBoard.appendChild(droplet);

  let top = 0;
  const fallInterval = setInterval(() => {
    if (isPaused) return;
    top += 5;
    droplet.style.top = `${top}px`;

    document.querySelectorAll('.peg').forEach(peg => {
      const pegRect = peg.getBoundingClientRect();
      const dropRect = droplet.getBoundingClientRect();
      const dx = dropRect.left + dropRect.width / 2 - (pegRect.left + pegRect.width / 2);
      const dy = dropRect.top + dropRect.height / 2 - (pegRect.top + pegRect.height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < dropDiameter * 0.7) {
        const direction = Math.random();
        const currentLeft = parseInt(droplet.style.left);
        if (direction < 0.5 && currentLeft > 5) {
          droplet.style.left = `${currentLeft - dropDiameter * 0.7}px`;
        } else if (currentLeft < plinkoBoard.clientWidth - dropDiameter * 1.3) {
          droplet.style.left = `${currentLeft + dropDiameter * 0.7}px`;
        }
      }
    });

    if (top >= plinkoBoard.clientHeight - 50) {
      clearInterval(fallInterval);
      scorePoint(parseInt(droplet.style.left), isGolden);
      plinkoBoard.removeChild(droplet);
      shuffleBucketValues();
      createPegs();
      if (lives === 0) setTimeout(endGame, 500);
    }
  }, 20);
});

function scorePoint(dropLeft, isGolden = false) {
  const boardRect = plinkoBoard.getBoundingClientRect();
  let bucketPoints = 10;

  const buckets = Array.from(document.querySelectorAll('.bucket'));
  let foundBucket = null;

  buckets.forEach(bucket => {
    const bucketRect = bucket.getBoundingClientRect();
    const bucketLeft = bucketRect.left - boardRect.left;
    const bucketRight = bucketLeft + bucketRect.width;

    if (dropLeft >= bucketLeft && dropLeft <= bucketRight) {
      foundBucket = bucket;
    }
  });

  if (!foundBucket && buckets.length > 0) {
    let minDist = Infinity;
    buckets.forEach(bucket => {
      const bucketRect = bucket.getBoundingClientRect();
      const bucketCenter = bucketRect.left - boardRect.left + bucketRect.width / 2;
      const dist = Math.abs(dropLeft - bucketCenter);
      if (dist < minDist) {
        minDist = dist;
        foundBucket = bucket;
      }
    });
  }

  if (foundBucket) {
    bucketPoints = parseInt(foundBucket.getAttribute('data-points'));
  }

  const pointsEarned = isGolden ? bucketPoints * 2 : bucketPoints;
  currentFill += pointsEarned;

  const splash = document.createElement('div');
  splash.classList.add('splash');
  if (isGolden) splash.classList.add('splash-golden');
  splash.style.left = `${dropLeft}px`;
  splash.style.top = `${plinkoBoard.clientHeight - 40}px`;
  plinkoBoard.appendChild(splash);
  setTimeout(() => splash.remove(), 500);

  const pointsPopup = document.createElement('div');
  pointsPopup.classList.add('points-popup');
  if (isGolden) pointsPopup.classList.add('golden-points');
  pointsPopup.textContent = `+${pointsEarned}`;
  pointsPopup.style.left = `${dropLeft}px`;
  pointsPopup.style.top = `${plinkoBoard.clientHeight - 60}px`;
  plinkoBoard.appendChild(pointsPopup);
  setTimeout(() => pointsPopup.remove(), 2000);

  while (currentFill >= POINTS_TO_FILL_BUCKET) {
    currentFill -= POINTS_TO_FILL_BUCKET;
    bucketsFilled++;
    lives++;
    updateBucketsFilled();
    updateLives();
  }

  bigBucketFill.style.height = `${currentFill}%`;
  horizontalProgressBar.style.width = `${currentFill}%`;
  progressText.textContent = `${currentFill} / ${POINTS_TO_FILL_BUCKET}`;

  if (lives > 0) startCountdown(true);
}

function showFactBanner() {
  const factBanner = document.getElementById('fact-text');
  if (factBanner) {
    factBanner.textContent = `💧Fact: ${facts[factIndex]}`;
    factIndex = (factIndex + 1) % facts.length;
  }
}

function startFactRotation() {
  showFactBanner();
  factRotationInterval = setInterval(showFactBanner, 10000);
}

function stopFactRotation() {
  clearInterval(factRotationInterval);
}

function endGame() {
  const name = playerNameInput.value.trim();
  saveScore(name, bucketsFilled);
  endGameMessage.textContent = `You filled ${bucketsFilled} buckets! Thank you for helping provide clean water.`;
  endGameModal.classList.add('active');
  updateLeaderboard();
  stopFactRotation();
}

playAgainBtn.addEventListener('click', () => {
  endGameModal.classList.remove('active');
  startGame();
});

resetBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to reset the game?")) startGame();
});

howToPlayBtn.addEventListener('click', () => {
  isPaused = true;
  clearCountdown();
  howToPlayModal.classList.add('active');
});

closeHowToPlay.addEventListener('click', () => {
  isPaused = false;
  howToPlayModal.classList.remove('active');
  if (lives > 0) startCountdown(false);
});

aboutBtn.addEventListener('click', () =>
  window.open('https://www.charitywater.org/about', '_blank')
);
donateBtn.addEventListener('click', () =>
  window.open('https://www.charitywater.org/donate', '_blank')
);

startBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  if (name) {
    playerDisplay.textContent = `Player: ${name}`;
    startScreen.classList.remove('active');
    startGame();
  }
});

function startGame() {
  lives = 5;
  bucketsFilled = 0;
  currentFill = 0;
  factIndex = 0;
  bigBucketFill.style.height = '0%';
  horizontalProgressBar.style.width = '0%';
  progressText.textContent = `0 / ${POINTS_TO_FILL_BUCKET}`;
  updateLives();
  updateBucketsFilled();
  updateLeaderboard();
  plinkoBoard.querySelectorAll('.peg').forEach(p => p.remove());
  plinkoBoard.querySelectorAll('.droplet').forEach(d => d.remove());
  createPegs();
  shuffleBucketValues();
  startCountdown(true);
  startFactRotation();
}

function startCountdown(reset = true) {
  if (reset) countdown = 10;
  countdownTimer.textContent = `Time: ${countdown}`;

  clearInterval(countdownInterval);
  clearTimeout(autoDropTimeout);

  countdownInterval = setInterval(() => {
    countdown--;
    countdownTimer.textContent = `Time: ${countdown}`;
    if (countdown <= 0) clearInterval(countdownInterval);
  }, 1000);

  autoDropTimeout = setTimeout(() => {
    if (lives > 0 && !isPaused) dropBtn.click();
  }, countdown * 1000);
}

function clearCountdown() {
  clearInterval(countdownInterval);
  clearTimeout(autoDropTimeout);
}

pauseBtn.addEventListener('click', () => {
  isPaused = true;
  clearCountdown();
  pauseModal.classList.add('active');
});

resumeBtn.addEventListener('click', () => {
  isPaused = false;
  pauseModal.classList.remove('active');
  if (lives > 0) startCountdown(false);
});

document.addEventListener('keydown', (e) => {
  if (isPaused || startScreen.classList.contains('active')) return;
  const step = 15;
  const cloudLeft = parseInt(cloud.style.left) || 110;
  const boardWidth = plinkoBoard.clientWidth;

  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    let newLeft = Math.max(0, cloudLeft - step);
    cloud.style.left = `${newLeft}px`;
  } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    let newLeft = Math.min(boardWidth - cloud.clientWidth, cloudLeft + step);
    cloud.style.left = `${newLeft}px`;
  } else if (e.code === 'Space') {
    e.preventDefault();
    dropBtn.click();
  }
});

// Initialize
startScreen.classList.add('active');
updateLeaderboard();
