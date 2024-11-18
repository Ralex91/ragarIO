const socket = io.connect()

let width, height
let player = null
let players = {}
let foodItems = []
let mousePosition = { x: 0, y: 0 }
let directionAngle = 0
let targetScale = 5
let currentScale = 10
const GAME_SIZE = 3000
const maxSpeed = 2.4
const zoomSpeed = 0.05

const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

const startScreen = document.getElementById("startScreen")
const score = document.getElementById("score")
const position = document.getElementById("position")
const leaderboardList = document.getElementById("leaderboardList")

socket.on("connect", () => {
  socket.on("init", (data) => {
    startScreen.style.display = "none"
    players = data.players
    player = data.players[socket.id]

    foodItems = data.foodItems
    drawGame()
  })

  socket.on("playersTick", (data) => {
    players = data
  })

  socket.on("foodTick", (data) => {
    foodItems = data
  })

  socket.on("eatFood", (data) => {
    player.radius = data
  })

  socket.on("die", (data) => {
    player = null

    startScreen.style.display = "flex"
  })
})

const join = () => {
  const name = startScreen.querySelector("#username").value
  socket.emit("join", { name })
}

const resize = () => {
  width = window.innerWidth
  height = window.innerHeight

  canvas.width = width
  canvas.height = height
}

window.addEventListener("resize", resize)
resize()

canvas.addEventListener("mousemove", function (event) {
  mousePosition = { x: event.clientX, y: event.clientY }
})

const calculateDistance = (x1, y1, x2, y2) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

const updateHud = () => {
  score.innerHTML = `<b>Score</b>: ${player.radius.toFixed(2)}`

  position.innerHTML = `<b>Position</b>: X${player.x.toFixed(
    2
  )}, Y${player.y.toFixed(2)}`

  leaderboardList.innerHTML = ""

  Object.values(players)
    .sort((a, b) => b.radius - a.radius)
    .forEach((player) => {
      leaderboardList.innerHTML += `
      <li class="flex gap-2 items-center justify-between">
        <div class="flex gap-2 items-center">
          <div
            style="background-color: ${player.color}"
            class="h-4 w-4 mt-1 rounded-full">
          </div>
          <span class="font-bold" style="color: ${player.id === socket.id ? "orange" : "white"}">
            ${player.name}
          </span>
          </div>
        <p>${player.radius.toFixed(2)}</p>
      </li>`
    })
}

const updateGame = () => {
  if (!socket.id) {
    return
  }

  if (!player) {
    return
  }

  directionAngle = Math.atan2(
    mousePosition.y - height / 2,
    mousePosition.x - width / 2
  )

  const distance = calculateDistance(
    width / 2,
    height / 2,
    mousePosition.x,
    mousePosition.y
  )
  const speed = Math.min(maxSpeed, distance / 15)

  player.x += Math.cos(directionAngle) * speed
  player.y += Math.sin(directionAngle) * speed

  player.x = Math.max(
    player.radius,
    Math.min(player.x, GAME_SIZE - player.radius)
  )
  player.y = Math.max(
    player.radius,
    Math.min(player.y, GAME_SIZE - player.radius)
  )

  updateHud()

  socket.emit("move", {
    x: player.x,
    y: player.y,
  })

  targetScale = 1 / (player.radius / 80)
  currentScale += (targetScale - currentScale) * zoomSpeed
}

const drawPlayer = (playerData) => {
  const radius = players[playerData.id].radius

  ctx.fillStyle = playerData.color
  ctx.beginPath()
  ctx.arc(playerData.x, playerData.y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "white"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `${radius / 2}px Arial`
  ctx.strokeStyle = "black"
  ctx.lineWidth = radius / 14
  ctx.strokeText(playerData.name, playerData.x, playerData.y)
  ctx.fillText(playerData.name, playerData.x, playerData.y)
  ctx.closePath()
}

const drawFood = () => {
  for (const food of foodItems) {
    ctx.beginPath()
    ctx.fillStyle = food.color
    ctx.arc(food.x, food.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()
  }
}

const drawGrid = () => {
  ctx.beginPath()
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
  ctx.lineWidth = 0.2
  for (let i = 0; i < GAME_SIZE; i += 10) {
    ctx.moveTo(i, 0)
    ctx.lineTo(i, GAME_SIZE)
    ctx.moveTo(0, i)
    ctx.lineTo(GAME_SIZE, i)
  }
  ctx.stroke()
  ctx.closePath()
}

const drawGame = () => {
  if (!socket.id) {
    return
  }

  if (!player) {
    return
  }

  requestAnimationFrame(drawGame)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()

  ctx.translate(width / 2, height / 2)
  ctx.scale(currentScale, currentScale)
  ctx.translate(-player.x, -player.y)

  drawGrid()
  drawFood()

  for (const id in players) {
    const playerData = id === socket.id ? player : players[id]
    drawPlayer(playerData)
  }

  ctx.restore()
}

setInterval(updateGame, 15)
