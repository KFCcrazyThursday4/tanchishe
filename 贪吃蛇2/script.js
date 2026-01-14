// 游戏常量
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 200;
const ENEMY_COLORS = {
    BLUE: "#0000FF",
    YELLOW: "#FFFF00"
};

// 游戏变量
let canvas, ctx;
let snake = [];
let food = {};
let enemySnakes = [];
let direction = "right";
let nextDirection = "right";
let score = 0;
let gameSpeed = INITIAL_SPEED;
let gameLoopId;
let isPaused = false; // 新增暂停状态
let isGameOver = false;
let lastUpdateTime = 0;

// 初始化游戏
function init() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    // 初始化玩家蛇
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];

    // 初始化食物
    generateFood();

    // 初始化敌对蛇
    enemySnakes = [];
    spawnEnemySnake("BLUE");
    spawnEnemySnake("YELLOW");

    // 事件监听
    document.getElementById("startBtn").addEventListener("click", startGame);
    document.getElementById("pauseBtn").addEventListener("click", togglePause);
    document.getElementById("restartBtn").addEventListener("click", restartGame);
    document.addEventListener("keydown", changeDirection);
}

// 生成食物（单个）
function generateFood() {
    let validPosition = false;
    while (!validPosition) {
        food = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };

        validPosition = true;

        // 检查与玩家蛇碰撞
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                validPosition = false;
                break;
            }
        }

        // 检查与敌对蛇碰撞
        if (validPosition) {
            for (let enemy of enemySnakes) {
                for (let segment of enemy.body) {
                    if (segment.x === food.x && segment.y === food.y) {
                        validPosition = false;
                        break;
                    }
                }
                if (!validPosition) break;
            }
        }
    }
}

// 生成敌对蛇（从右下角出生）
function spawnEnemySnake(colorType) {
    if (enemySnakes.length >= 2) return;

    const spawnX = GRID_SIZE - 1;
    const spawnY = GRID_SIZE - 1;
    const length = Math.floor(Math.random() * 3) + 1; // 长度1-3

    const directions = ["up", "left"];
    const direction = directions[Math.floor(Math.random() * 2)];

    const newSnake = {
        body: [],
        direction: direction,
        color: ENEMY_COLORS[colorType],
        colorType: colorType,
        length: length
    };

    // 生成蛇身
    for (let i = 0; i < length; i++) {
        let segment;
        if (direction === "up") {
            segment = { x: spawnX, y: spawnY + i };
        } else {
            segment = { x: spawnX + i, y: spawnY };
        }
        newSnake.body.push(segment);
    }

    enemySnakes.push(newSnake);
}

// 移动敌对蛇
function moveEnemySnakes() {
    for (let i = 0; i < enemySnakes.length; i++) {
        const enemy = enemySnakes[i];

        // 10%概率改变方向（只能在up和left之间切换）
        if (Math.random() < 0.1) {
            enemy.direction = enemy.direction === "up" ? "left" : "up";
        }

        // 计算新头部位置
        let newHead;
        switch (enemy.direction) {
            case "up":
                newHead = { x: enemy.body[0].x, y: enemy.body[0].y - 1 };
                break;
            case "left":
                newHead = { x: enemy.body[0].x - 1, y: enemy.body[0].y };
                break;
        }

        // 检查边界碰撞
        if (newHead.x < 0 || newHead.x >= GRID_SIZE ||
            newHead.y < 0 || newHead.y >= GRID_SIZE) {
            enemySnakes.splice(i, 1);
            spawnEnemySnake(enemy.colorType);
            continue;
        }

        enemy.body.unshift(newHead);
        if (enemy.body.length > enemy.length) {
            enemy.body.pop();
        }
    }
}

// 游戏主循环
function gameLoop(timestamp) {
    if (isGameOver) return;

    // 暂停状态处理
    if (isPaused) {
        gameLoopId = requestAnimationFrame(gameLoop);
        return;
    }

    if (!lastUpdateTime) lastUpdateTime = timestamp;
    const deltaTime = timestamp - lastUpdateTime;

    if (deltaTime >= gameSpeed) {
        updateGame();
        lastUpdateTime = timestamp;
    }

    draw();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function updateGame() {
    moveSnake();
    moveEnemySnakes();
    checkCollisions();
}

// 移动玩家蛇
function moveSnake() {
    direction = nextDirection;
    const head = { x: snake[0].x, y: snake[0].y };

    switch (direction) {
        case "up": head.y--; break;
        case "down": head.y++; break;
        case "left": head.x--; break;
        case "right": head.x++; break;
    }

    snake.unshift(head);

    // 检查食物碰撞
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById("score").textContent = score;
        generateFood();
    } else {
        snake.pop();
    }
}

// 碰撞检测
function checkCollisions() {
    const head = snake[0];

    // 边界检查
    if (head.x < 0 || head.x >= GRID_SIZE ||
        head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
        return;
    }

    // 自撞检查
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // 敌对蛇碰撞检查
    for (let i = enemySnakes.length - 1; i >= 0; i--) {
        const enemy = enemySnakes[i];

        // 检查玩家蛇头撞敌对蛇身
        for (let segment of enemy.body) {
            if (head.x === segment.x && head.y === segment.y) {
                gameOver();
                return;
            }
        }

        // 检查敌对蛇头撞玩家蛇身
        const enemyHead = enemy.body[0];
        for (let j = 1; j < snake.length; j++) {
            if (enemyHead.x === snake[j].x && enemyHead.y === snake[j].y) {
                score += enemy.length * 10;
                document.getElementById("score").textContent = score;
                enemySnakes.splice(i, 1);
                spawnEnemySnake(enemy.colorType);
                break;
            }
        }
    }
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制玩家蛇
    snake.forEach((segment, i) => {
        ctx.fillStyle = i === 0 ? "#4CAF50" : "#8BC34A";
        ctx.fillRect(
            segment.x * CELL_SIZE,
            segment.y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
        );
    });

    // 绘制敌对蛇
    enemySnakes.forEach(enemy => {
        enemy.body.forEach(segment => {
            ctx.fillStyle = enemy.color;
            ctx.fillRect(
                segment.x * CELL_SIZE,
                segment.y * CELL_SIZE,
                CELL_SIZE,
                CELL_SIZE
            );
        });
    });

    // 绘制食物
    ctx.fillStyle = "#FF5722";
    ctx.fillRect(
        food.x * CELL_SIZE,
        food.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
    );

    // 绘制暂停状态
    if (isPaused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("已暂停", canvas.width / 2, canvas.height / 2);
    }
}

// 改变方向
function changeDirection(e) {
    if (isPaused || isGameOver) return;

    switch (e.key) {
        case "ArrowUp": if (direction !== "down") nextDirection = "up"; break;
        case "ArrowDown": if (direction !== "up") nextDirection = "down"; break;
        case "ArrowLeft": if (direction !== "right") nextDirection = "left"; break;
        case "ArrowRight": if (direction !== "left") nextDirection = "right"; break;
    }
}

// 开始游戏
function startGame() {
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    isGameOver = false;
    isPaused = false;
    document.getElementById("pauseBtn").textContent = "暂停";
    lastUpdateTime = 0;
    gameLoopId = requestAnimationFrame(gameLoop);
}

// 暂停/继续游戏
function togglePause() {
    isPaused = !isPaused;
    document.getElementById("pauseBtn").textContent = isPaused ? "继续" : "暂停";

    // 继续游戏时重置时间戳
    if (!isPaused && !isGameOver) {
        lastUpdateTime = 0;
        draw(); // 立即重绘去除暂停覆盖层
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// 游戏结束
function gameOver() {
    isGameOver = true;
    isPaused = false;
    cancelAnimationFrame(gameLoopId);
    alert("游戏结束！得分: " + score);
}

// 重新开始
function restartGame() {
    cancelAnimationFrame(gameLoopId);
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = "right";
    nextDirection = "right";
    score = 0;
    document.getElementById("score").textContent = "0";
    isPaused = false;
    isGameOver = false;
    document.getElementById("pauseBtn").textContent = "暂停";
    generateFood();
    enemySnakes = [];
    spawnEnemySnake("BLUE");
    spawnEnemySnake("YELLOW");
}

// 初始化游戏
window.onload = init;