const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let users = [];
let messages = {};

io.on('connection', (socket) => {
  socket.on('register', (data, callback) => {
    const { id, nickname } = data;
    if (id) {
      const existingUser = users.find(u => u.id === Number(id));
      if (existingUser) {
        existingUser.socketId = socket.id;
        existingUser.nickname = nickname;
        return callback({ success: true, user: existingUser, users });
      }
    }
    let newId = 1;
    while (users.some(u => u.id === newId)) newId++;
    const newUser = { id: newId, nickname: nickname || 'Гость_' + newId, socketId: socket.id };
    users.push(newUser);
    callback({ success: true, user: newUser, users });
    io.emit('users_update', users);
  });

  socket.on('send_message', (data) => {
    const { chatId, message } = data;
    if (!messages[chatId]) messages[chatId] = [];
    messages[chatId].push(message);
    io.emit('receive_message', { chatId, message });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
