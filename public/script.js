const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');

// DOM Elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreElement = document.getElementById('final-score');
const gameBoardWrapper = document.querySelector('.game-board-wrapper');

// Leaderboard Elements
const leaderboardList = document.getElementById('start-leaderboard');
const scoreSubmitForm = document.getElementById('score-submit-form');
const playerNameInput = document.getElementById('player-name');
const submitScoreBtn = document.getElementById('submit-score-btn');

// Visual keys for feedback
const keys = Array.from(document.querySelectorAll('.key'));

// Game configuration
const gridSize = 20;
const tileCount = canvas.width / gridSize;
let baseGameSpeed = 110;
let gameSpeed = baseGameSpeed;

const colors = {
    head: '#06b6d4',
    body: '#67e8f9',
    food: '#f43f5e',
    foodGlow: '#e11d48',
    snakeGlow: '#0891b2',
    gridLines: 'rgba(34, 211, 238, 0.03)'
};

let snake = [];
let food = {};
let dx = 0;
let dy = -1;
let score = 0;
let highScore = localStorage.getItem('neonSnakeHighScore') || 0;
let gameLoopId = null;
let isGameOver = false;
let isGameRunning = false;

// Audio synthesis
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'eat') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'over') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

// API Functions
async function fetchLeaderboard() {
    try {
        const response = await fetch('/api/scores');
        if (!response.ok) throw new Error('API Error');
        const scores = await response.json();

        leaderboardList.innerHTML = '';
        if (scores.length === 0) {
            leaderboardList.innerHTML = '<li>No scores yet!</li>';
            return;
        }

        scores.forEach((entry, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="rank">#${i + 1}</span> <span class="name">${entry.name}</span> <span class="score">${entry.score}</span>`;
            leaderboardList.appendChild(li);
        });
    } catch (err) {
        leaderboardList.innerHTML = '<li>Offline mode</li>';
    }
}

async function submitScore() {
    const name = playerNameInput.value.toUpperCase() || 'ANON';
    try {
        // Disable form while saving
        submitScoreBtn.disabled = true;

        await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, score })
        });

        // Hide form and update leaderboard
        scoreSubmitForm.style.display = 'none';
        fetchLeaderboard();
    } catch (err) {
        console.error('Failed to submit score', err);
        submitScoreBtn.disabled = false;
    }
}

// Initialize
highScoreElement.textContent = highScore;
drawInitialGrid();
fetchLeaderboard(); // Load leaderboard on startup

// Listeners
document.addEventListener('keydown', handleKeyPress);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
submitScoreBtn.addEventListener('click', submitScore);

function resetGame() {
    snake = [
        { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) },
        { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) + 1 },
        { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) + 2 }
    ];
    dx = 0;
    dy = -1;
    score = 0;
    gameSpeed = baseGameSpeed;
    scoreElement.textContent = score;
    isGameOver = false;
    placeFood();
}

function startGame() {
    initAudio();
    if (isGameRunning) return;

    startOverlay.classList.remove('active');
    gameOverOverlay.classList.remove('active');

    scoreSubmitForm.style.display = 'block'; // Reset form visibility for next game
    playerNameInput.value = '';
    submitScoreBtn.disabled = false;

    resetGame();
    isGameRunning = true;

    if (gameLoopId) clearTimeout(gameLoopId);
    gameLoop();
}

function gameLoop() {
    if (isGameOver) return;
    setTimeout(function onTick() {
        changingDirection = false;
        clearCanvas();
        drawGrid();
        moveSnake();
        checkCollisions();

        if (!isGameOver) {
            drawFood();
            drawSnake();
            gameLoop();
        }
    }, gameSpeed);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function drawInitialGrid() {
    clearCanvas();
    drawGrid();
}

function drawGrid() {
    ctx.strokeStyle = colors.gridLines;
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        const size = gridSize - 2;

        ctx.shadowBlur = isHead ? 20 : 10;
        ctx.shadowColor = colors.snakeGlow;
        ctx.fillStyle = isHead ? colors.head : colors.body;

        ctx.beginPath();
        const radius = isHead ? 8 : 4;
        ctx.roundRect(x + 1, y + 1, size, size, radius);
        ctx.fill();

        ctx.shadowBlur = 0;

        if (isHead) {
            ctx.fillStyle = '#020617';
            let e1x, e1y, e2x, e2y;
            const eyeSize = 3;
            const offset = 4;

            e1x = x + size / 2 - offset;
            e1y = y + offset + 2;
            e2x = x + size / 2 + offset;
            e2y = y + offset + 2;

            if (dx === 1) {
                e1x = x + size - offset - 2;
                e1y = y + size / 2 - offset;
                e2x = x + size - offset - 2;
                e2y = y + size / 2 + offset;
            } else if (dx === -1) {
                e1x = x + offset + 2;
                e1y = y + size / 2 - offset;
                e2x = x + offset + 2;
                e2y = y + size / 2 + offset;
            } else if (dy === 1) {
                e1x = x + size / 2 - offset;
                e1y = y + size - offset - 2;
                e2x = x + size / 2 + offset;
                e2y = y + size - offset - 2;
            }

            ctx.beginPath();
            ctx.arc(e1x, e1y, eyeSize, 0, Math.PI * 2);
            ctx.arc(e2x, e2y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawFood() {
    const x = food.x * gridSize;
    const y = food.y * gridSize;
    const center = gridSize / 2;

    ctx.shadowBlur = 25;
    ctx.shadowColor = colors.foodGlow;
    ctx.fillStyle = colors.food;
    ctx.beginPath();
    ctx.arc(x + center, y + center, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + center - 2, y + center - 2, 3, 0, Math.PI * 2);
    ctx.fill();
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        playSound('eat');

        if (gameSpeed > 60) gameSpeed -= 2;

        scoreElement.parentElement.classList.add('pulse');
        setTimeout(() => scoreElement.parentElement.classList.remove('pulse'), 400);
        placeFood();
    } else {
        snake.pop();
    }
}

function placeFood() {
    food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === food.x && snake[i].y === food.y) {
            placeFood();
            return;
        }
    }
}

function checkCollisions() {
    const head = snake[0];
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        handleGameOver();
        return;
    }
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            handleGameOver();
            return;
        }
    }
}

function handleGameOver() {
    isGameOver = true;
    isGameRunning = false;
    playSound('over');

    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('neonSnakeHighScore', highScore);
        highScoreElement.parentElement.classList.add('pulse');
        setTimeout(() => highScoreElement.parentElement.classList.remove('pulse'), 1000);
    }

    finalScoreElement.textContent = score;
    gameOverOverlay.classList.add('active');

    // Focus the name input automatically
    setTimeout(() => {
        playerNameInput.focus();
    }, 100);

    gameBoardWrapper.classList.add('shake');
    setTimeout(() => gameBoardWrapper.classList.remove('shake'), 400);
}

let changingDirection = false;
function highlightKey(index) {
    if (keys[index]) {
        keys[index].classList.add('active');
        setTimeout(() => keys[index].classList.remove('active'), 150);
    }
}

function handleKeyPress(event) {
    if (isGameOver) {
        if (event.key === 'Enter' && playerNameInput === document.activeElement) {
            submitScore();
        }
        return;
    }

    if (changingDirection) return;

    const upKeys = ['ArrowUp', 'w', 'W'];
    const downKeys = ['ArrowDown', 's', 'S'];
    const leftKeys = ['ArrowLeft', 'a', 'A'];
    const rightKeys = ['ArrowRight', 'd', 'D'];

    const isGoingUp = dy === -1;
    const isGoingDown = dy === 1;
    const isGoingRight = dx === 1;
    const isGoingLeft = dx === -1;

    if (leftKeys.includes(event.key) && !isGoingRight) {
        dx = -1;
        dy = 0;
        changingDirection = true;
        highlightKey(2);
        event.preventDefault();
    } else if (upKeys.includes(event.key) && !isGoingDown) {
        dx = 0;
        dy = -1;
        changingDirection = true;
        highlightKey(0);
        event.preventDefault();
    } else if (rightKeys.includes(event.key) && !isGoingLeft) {
        dx = 1;
        dy = 0;
        changingDirection = true;
        highlightKey(3);
        event.preventDefault();
    } else if (downKeys.includes(event.key) && !isGoingUp) {
        dx = 0;
        dy = 1;
        changingDirection = true;
        highlightKey(1);
        event.preventDefault();
    }

    if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        if (!isGameRunning) startGame();
    }
}
