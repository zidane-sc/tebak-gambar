import Ws from 'App/Services/Ws'
import Redis from '@ioc:Adonis/Addons/Redis'

Ws.boot()

/**
 * Listen for incoming socket connections
 */

let io = Ws.io
io.on('connection', (socket) => {  socket.on('join-room', async (data) => {
    
    console.info("User join room", data)

    joinUser(socket.id, data.username, data.roomname)
    socket.join(data.roomname)

    const tempImage = await Redis.get(`tempimage:${data.roomname}`)

    if (tempImage) {
      io.to(data.roomname).emit('canvas-data', tempImage)
    }
    let message = { msg: `${data.username} has joined` }
    io.to(data.roomname).emit('chatMsg', message)
  })

  socket.on('canvas-data', async (data) => {
    let room = await getRoom(socket.id)
    io.to(room).emit('canvas-data', data)
    await Redis.set(`tempimage:${room}`, data)
  })

  socket.on('chatMsg', async (data) => {
    let room = await getRoom(socket.id)
    let username = await getUsername(socket.id)
    data.username = username
    if (username && room) {
      io.to(room).emit('chatMsg', data)
    }
  })

  socket.on('disconnect', async () => {
    const user = await removeUser(socket.id)
    if (user) {
      let message = { msg: `${user.username} has left` }
      io.to(user.roomname).emit('chatMsg', message)
    }
  })
})

async function joinUser(socketId, userName, roomName) {
  const user = {
    socketID: socketId,
    username: userName,
    roomname: roomName
  }

  await Redis.setex(`socket:${socketId}`, 1800, JSON.stringify(user))
  return user;
}

async function getRoom(id) {
  let user = await Redis.get(`socket:${id}`)
  
  if (user) {
    return JSON.parse(user).roomname
  }
}

async function getUsername(id) {
  let user = await Redis.get(`socket:${id}`)

  if (user) {
    return JSON.parse(user).roomname
  }
}

async function removeUser(id) {
  let user = await Redis.get(`socket:${id}`)

  if (user) {
    await Redis.del(`socket:${id}`)
    return JSON.parse(user)
  }
}
