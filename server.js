const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {maxHttpBufferSize: 1e8, pingTimeout: 60000});
const readline = require('readline');
const rl = readline.createInterface({input: process.stdin,output: process.stdout});

server.listen(8080, "0.0.0.0");
rl.on("close", () => {io.emit("end");process.exit();});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

app.get('/pixi.js', (req, res) => {
  res.sendFile(__dirname + '/pixi.js');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

io.on('connection', (socket) => {
  console.log("Connection!");
});
