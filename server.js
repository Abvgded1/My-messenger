const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public')); // Раздача HTML-файла

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let users = [];
let messages = {};

function generateUniqueId() {
  let newId = 1;
  while (users.some(u => u.id === newId)) newId++;
  return newId;
}

io.on('connection', (socket) => {
  socket.on('register', (data, callback) => {
    const { id, nickname } = data;
    if (id) {
      const existingUser = users.find(u => u.id === Number(id));
      if (existingUser) {
        existingUser.socketId = socket.id;
        existingUser.nickname = nickname;
        callback({ success: true, user: existingUser, users });
        io.emit('users_update', users);
        return;
      }
    }
    const newUser = { id: generateUniqueId(), nickname: nickname || 'Гость_' + Math.floor(Math.random() * 1000), socketId: socket.id };
    users.push(newUser);
    callback({ success: true, user: newUser, users });
    io.emit('users_update', users);
  });

  socket.on('change_id', (data, callback) => {
    const { currentId, newId } = data;
    const user = users.find(u => u.id === Number(currentId));
    if (!user) return callback({ success: false, error: 'Пользователь не найден' });
    if (users.some(u => u.id === Number(newId))) return callback({ success: false, error: 'Этот ID уже занят' });
    user.id = Number(newId);
    callback({ success: true, user });
    io.emit('users_update', users);
  });

  socket.on('send_message', (data) => {
    const { chatId, message } = data;
    if (!messages[chatId]) messages[chatId] = [];
    messages[chatId].push(message);
    io.emit('receive_message', { chatId, message });
  });

  socket.on('clear_chat', (chatId) => {
    if (messages[chatId]) {
      messages[chatId] = [];
      io.emit('chat_cleared', chatId);
    }
  });

  socket.on('get_messages', (chatId, callback) => {
    callback(messages[chatId] || []);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
`🚀 Сервер запущен на порту ${PORT}`);
});

