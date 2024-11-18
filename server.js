import express from "express"
import http from "http"
import { Server } from "socket.io"

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
  },
})

const SERVER_PORT = 3000
const GAME_SIZE = 3000
const FOODS_COUNT = 500
const FOOD_EAT = 0.4
const FOOD_SIZE = 4
let players = {}
let foodItems = []

app.use(express.static("public"))

const spawnFood = () => {
  foodItems.push({
    id: new Date().getTime(),
    color: `hsl(${Math.random() * 360}, 50%, 50%)`,
    x: Math.random() * GAME_SIZE,
    y: Math.random() * GAME_SIZE,
  })
}

const calDistance = (x1, y1, x2, y2) =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

const checkFood = (player) => {
  foodItems.forEach((food, index) => {
    const distance = calDistance(player.x, player.y, food.x, food.y)

    if (distance < player.radius + FOOD_SIZE / 2) {
      player.radius += FOOD_EAT
      foodItems = foodItems.filter((_, i) => i !== index)
      spawnFood()

      io.to(player.id).emit("eatFood", player.radius)
      io.emit("foodTick", foodItems)
    }
  })
}

const checkPlayer = (player) => {
  Object.values(players).forEach((otherPlayer) => {
    if (player.id !== otherPlayer.id) {
      const distance = calDistance(
        player.x,
        player.y,
        otherPlayer.x,
        otherPlayer.y
      )

      if (distance < player.radius + otherPlayer.radius / 2) {
        player.radius += otherPlayer.radius

        delete players[otherPlayer.id]
      }
    }
  })
}

const newPlayer = (id) => ({
  id: id,
  name: `Player ${id.slice(0, 4)}`,
  color: `hsl(${Math.random() * 360}, 50%, 50%)`,
  x: Math.random() * GAME_SIZE,
  y: Math.random() * GAME_SIZE,
  radius: 16,
})

// Generate initial food items
for (let i = 0; i < FOODS_COUNT; i++) {
  spawnFood()
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`)

  players[socket.id] = newPlayer(socket.id)
  socket.emit("init", { players, foodItems })

  socket.on("move", (data) => {
    // Check if the player is still in the game
    if (players[socket.id]) {
      players[socket.id].x = Math.max(
        players[socket.id].radius,
        Math.min(data.x, GAME_SIZE - players[socket.id].radius)
      )
      players[socket.id].y = Math.max(
        players[socket.id].radius,
        Math.min(data.y, GAME_SIZE - players[socket.id].radius)
      )
    }
  })

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`)

    delete players[socket.id]
  })
})

setInterval(() => {
  for (const id in players) {
    const player = players[id]

    checkFood(player)
    checkPlayer(player)
  }

  io.emit("playersTick", players)
}, 15)

server.listen(SERVER_PORT, () => {
  console.log(`Server started on port ${SERVER_PORT}`)
})
