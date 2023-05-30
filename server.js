const http = require('http');
const express = require('express');
const app = express();
//const localtunnel = require('localtunnel');
const server = http.createServer(app);
const io = require("socket.io")(server, {maxHttpBufferSize: 1e8, pingTimeout: 60000});
const fs = require("fs");
const readline = require('readline');
const ip = require("ip");
const rl = readline.createInterface({input: process.stdin,output: process.stdout});
const port = 8080;
var roomCounter = 1;
var lobbies = [];
var gameData = null;
var white = "#ffffff";
var gray = "#808080";
var black = "#000000";
var yellow = "#f8b11a";
var green = "#589841";
var red = "#b42117";
var blue = "#382b70";
var blokusColors = [yellow, green, red, blue];
var timers = [];

run();

server.listen(port, "0.0.0.0");
log("Connect to " + ip.address() + ":" + port);
rl.on("close", () => {io.emit("end");process.exit();});
rl.on("line", (t) => {runScript(t);});

io.on('connection', (socket) => {
  var lobbyI = -1;
  var lobby = null;
  var playerDataI = -1;
  var playerData = null;
  socket.emit("id", socket.id);
  update();
  log("New connection! (" + socket.id + ")");
  socket.on("create-lobby", () => {
    socket.join("Lobby " + roomCounter);
    lobbies.push(new Lobby("Lobby " + roomCounter, socket.id, socket.handshake.address));
    roomCounter++;
    update();
    var timerId = Math.floor(Math.random() * 16777216);
    timers.push(setInterval(tick, 1000));
    timers[timers.length - 1].id = timerId;
    lobbies[lobbyI].tick = timerId;
    update();
    log("'" + socket.id + "' has created " + lobby.name);
  });
  socket.on("disconnect", () => {
    if(lobby != null){
      if(lobby.state == "Lobby"){
        lobbies[lobbyI].playerData.splice(findIndex(lobby.playerData, "id", socket.id), 1);
      }
      if(lobby.playerData.length == 0){
        clearInterval(find(timers, "id", lobby.tick));
        log(lobby.name + " has been closed");
        lobbies.splice(lobbyI, 1);
      }
      log("'" + socket.id + "' has left " + lobby.name);
    }
    update();
  });

  socket.on("join", (name) => {
    lobbyI = findIndex(lobbies, "name", name);
    lobby = lobbies[lobbyI];
    playerDataI = findIndex(lobbies[lobbyI].playerData, "id", socket.id);
    playerData = lobby.playerData[playerDataI];
    var inactivePlayers = [...lobby.playerData].filter(p => p.ip == socket.handshake.address);
    var oldPlayerI = findIndex(inactivePlayers, "t", Math.max(...inactivePlayers.map(p => p.t)));
    if(lobbies[lobbyI].playerData.length < 4){
      socket.join(name);
      lobbies[lobbyI].playerData.push(new PlayerData(socket.id, socket.handshake.address));
      log("'" + (socket.id) + "' has joined " + (lobby.name) + " (" + lobby.playerData.length + "/4)");
    }else if(lobby.playerData[oldPlayerI] != undefined && lobby.players.length < 4){
      socket.join(name);
      lobbies[lobbyI].playerData[oldPlayerI].id = socket.id;
      log("'" + (socket.id) + "' has reconnected to " + (lobby.name));
    }
    update();
  });

  socket.on("player-update", (newPlayerData) => {
    var data = Object.assign(new PlayerData(), newPlayerData);
    lobbies[lobbyI].playerData[findIndex(lobby.playerData, "id", socket.id)] = data;
    update();
  });

  socket.on("start", (name) => {
    lobbies[findIndex(lobbies, "name", name)].game = new Game(gameData);
    lobbies[lobbyI].state = "Game";
    var timerId = Math.floor(Math.random() * 16777216)
    timers.push(setInterval(gameTick, 500))
    timers[timers.length - 1].id = timerId;
    lobbies[lobbyI].gameTick = timerId;
    update();
    log(lobby.name + " has started a game");
  });

  socket.on("set-piece-coordinates", (pieceCoordinates) => {
    lobbies[lobbyI].playerData[playerDataI].pieceCoordinates = pieceCoordinates;
    update();
  });

  socket.on("set-color", (color) => {
    update();
    if(color != gray){
      lobbies[lobbyI].playerData[playerDataI].color = color;
    }
    update();
  });

  socket.on("select-piece", (selectedPiece) => {
    lobbies[lobbyI].playerData[playerDataI].selectedPiece = selectedPiece;
    update();
  });

  socket.on("rotate-piece", () => {
    var rotatedPiece = rotate(playerData.pieces[playerData.selectedPiece]);
    lobbies[lobbyI].playerData[playerDataI].pieces[playerData.selectedPiece] = rotatedPiece;
    update();
  });

  socket.on("flip-piece", () => {
    var flippedPiece = flip(playerData.pieces[playerData.selectedPiece]);
    lobbies[lobbyI].playerData[playerDataI].pieces[playerData.selectedPiece] = flippedPiece;
    update();
  });

  socket.on("place-piece", (location) => {
    if(socket.id == lobby.playerData[lobby.game.turn].id){
      placePiece(location);
    }
  });

  function placePiece(location){
    var piece = playerData.pieces[playerData.selectedPiece];
    var emptyPiece = new Array(piece.length).fill(0).map(() => new Array(piece[0].length).fill("0"));
    var center = getPieceCenter(piece);
    var board = lobby.game.board;
    location.x < center.x ? location.x = center.x : null;
    location.x > board.length + center.x - piece.length ? location.x = board.length + center.x - piece.length : null;
    location.y < center.y ? location.y = center.y : null;
    location.y > board.length + center.y - piece[0].length ? location.y = board.length + center.y - piece[0].length : null;
    location.x -= center.x;
    location.y -= center.y;
    if(!canPlacePieceAt(location, piece)){
      return;
    }
    for(var x = 0; x < piece.length; x++){
      for(var y = 0; y < piece[0].length; y++){
        if(parseInt(piece[x][y])){
          lobbies[lobbyI].game.board[Math.round(location.x) + x][Math.round(location.y) + y] = playerData.color;
        }
      }
    }
    lobbies[lobbyI].playerData[playerDataI].pieces[playerData.selectedPiece] = emptyPiece;
    lobbies[lobbyI].playerData[playerDataI].score = playerData.maxScore - countSquares(playerData.pieces);
    lobbies[lobbyI].game.turns++;
    nextTurn();
    update();
  }

  function canPlacePieceAt(location, piece){
    var board = lobby.game.board;
    var diagonal = 0;
    var currentPlayer = lobby.playerData[lobby.game.turn];
    for(var x = 0; x < piece.length; x++){
      for(var y = 0; y < piece[x].length; y++){
        var pieceX = Math.round(location.x + x);
        var pieceY = Math.round(location.y + y);
        if(parseInt(piece[x][y])){
          if(pieceY >= board.length || pieceX >= board.length){
            return false;
          }
          if(board[pieceX][pieceY] != white){
            return false;
          }
          if((pieceX % (board.length - 1)) == 0 && (pieceY % (board[0].length - 1)) == 0 && board[pieceX][pieceY] == white){
            if(currentPlayer.maxScore == countSquares(currentPlayer.pieces)){
              diagonal++;
            }else{
              return false;
            }
          }
          for(var i = -1; i <= 1; i++){
            for(var j = -1; j <= 1; j++){
              var X = pieceX + i;
              var Y = pieceY + j;
              if(X >= 0 && Y >= 0 && X < board.length && Y < board[0].length){
                if(Math.abs(i + j) % 2 == 1 && board[X][Y] == currentPlayer.color){
                  return false;
                }
                if(Math.abs(i + j) % 2 == 0 && board[X][Y] == currentPlayer.color){
                  diagonal++;
                }
              }
            }
          }
        }
      }
    }
    return (diagonal > 0);
  }

  function nextTurn(){
    lobbies[lobbyI].playerData[lobby.game.turn].selectedPiece = -1;
    lobbies[lobbyI].game.turn++;
    lobbies[lobbyI].game.turn == 4 ? lobbies[lobbyI].game.turn = 0 : null;
    lobbies[lobbyI].game.timer = Date.now() + (lobby.game.timerLength * 1000);
    lobbies[lobbyI].playerData[lobby.game.turn].canPlacePieces = true;
    var currentPlayer = lobby.playerData[lobby.game.turn];
    for(var i = 0; i < currentPlayer.pieces.length; i++){
      for(var x = 0; x < lobby.game.board.length; x++){
        for(var y = 0; y < lobby.game.board[0].length; y++){
          for(var j = 0; j < 4; j++){
            //Check if all rotations (and flips) of a piece can be placed on all open squares of a board
            var piece = currentPlayer.pieces[i];
            for(var k = 0; k < j; k++){
              piece = rotate(piece);
            }
            if(lobby.game.board[x][y] == white){
              if(canPlacePieceAt({x: x, y: y}, piece) || canPlacePieceAt({x: x, y: y}, flip(piece))){
                return;
              }
            }
          }
        }
      }
    }
    lobbies[lobbyI].playerData[lobby.game.turn].canPlacePieces = false;
    if(lobby.playerData.every(p => !p.canPlacePieces)){
      var scores = lobby.playerData.map(p => p.score);
      lobbies[lobbyI].game.winner = scores.indexOf(Math.max(...scores));
      lobbies[lobbyI].state = "End";
      update();
      clearInterval(find(timers, "id", lobby.gameTick));
      log(lobby.name + " has ended a game");
    }else{
      log("'" + lobby.playerData[lobby.game.turn].id + "' has been skipped");
      nextTurn();
    }
    update();
  }

  function tick(){
    for(var i = 0; i < lobbies.length; i++){
      for(var j = 0; j < lobbies[i].playerData.length; j++){
        if(lobbies[i].players.indexOf(lobbies[i].playerData[j].id) != -1){
          lobbies[i].playerData[j].t = 0;
        }else{
          lobbies[i].playerData[j].t++;
        }
      }
    }
  }

  function gameTick(){
    if(Date.now() - 250 >= lobbies[lobbyI].game.timer){
      nextTurn();
      update();
    }
  }

  function update(){
    for(var i = 0; i < lobbies.length; i++){
      try {
        lobbies[i].players = Array.from(io.sockets.adapter.rooms.get(lobbies[i].name));
        io.to(lobbies[i].name).emit("lobby", lobbies[i]);
      } catch {}
    }
    emit("lobbies", lobbies);
    lobbyI = findIndex(lobbies, "name", getLobby(socket.id));
    if(lobbyI != -1){
      lobby = lobbies[lobbyI];
      playerDataI = findIndex(lobbies[lobbyI].playerData, "id", socket.id);
      playerData = lobby.playerData[playerDataI];
    }
  }

  function getLobby(id){
    for(var i = 0; i < lobbies.length; i++){
      if(lobbies[i].players.indexOf(id) != -1){
        return lobbies[i].name;
      }
    }
  }
});

function countSquares(pieces){
  var count = 0;
  for(var i = 0; i < pieces.length; i++){
    for(var x = 0; x < pieces[i].length; x++){
      for(var y = 0; y < pieces[i][x].length; y++){
        parseInt(pieces[i][x][y]) ? count++ : null;
      }
    }
  }
  return count;
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

app.get('/functions.js', (req, res) => {
  res.sendFile(__dirname + '/functions.js');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/game.html');
});

function runScript(script){
  var text = "";
  try{
    text = eval(script);
  }catch(e){
    error(e);
  }finally{
    log(text);
  }
}

function emit(signal, data){
  io.emit(signal, data);
}

function getPieceCenter(piece){
  var center = {x:0, y:0};
  var count = 0;
  for(var x = 0; x < piece.length; x++){
    for(var y = 0; y < piece[x].length; y++){
      if(parseInt(piece[x][y])){
        center.x += (x + 0.5);
        center.y += (y + 0.5);
        count++;
      }
    }
  }
  if(piece.length != piece[0].length){
    center.x = Math.ceil((center.x + 0.5) / count) - 0.5;
    center.y = Math.ceil((center.y + 0.5) / count) - 0.5;
  }else{
    center.x = piece.length / 2;
    center.y = piece[0].length / 2;
  }
  return center;
}

function rotate(piece){
  return piece[0].map((v, i) => piece.map(row => row[row.length - 1 - i]));
}

function flip(piece){
  return piece.map(i => i.reverse());
}

function find(array, key, value){
  return array[array.findIndex(a => a[key] == value)];
}

function findIndex(array, key, value){
  return array.findIndex(a => a[key] == value);
}

function log(text){
  console.log(text);
}

function error(text){
  console.error(text);
}

process.on('uncaughtException', function (err) {
  log(err);
});

function run(){
  fs.readFile('gameData.json', 'utf8', (err, data) => {
    if(err){
      console.error(err);
      return;
    }
    gameData = JSON.parse(data).standard;
    var pieces = gameData.pieces;
    for(var i = 0; i < pieces.length; i++){
      for(var j = 0; j < pieces[i].length; j++){
        pieces[i][j] = pieces[i][j].split("");
      }
    }
    gameData.pieces = pieces;
    log("Game Data Loaded!");
  });
}

class Lobby {
  constructor(n, id, ip){
    this.name = n;
    this.state = "Lobby";
    this.data = gameData;
    this.players = [id];
    this.playerData = [new PlayerData(id, ip)];
    this.game = null;
    this.tick = null;
    this.gameTick = null;
    this.winner = -1;
  }
}

class PlayerData {
  constructor(id, ip, c){
    this.id = id;
    this.ip = ip;
    this.t = 0;
    this.color = c == undefined ? "#808080" : c;
    this.pieces = [...gameData.pieces];
    this.selectedPiece = -1;
    this.pieceCoordinates = {x:0, y:0};
    this.score = 0;
    this.maxScore = countSquares(this.pieces);
    this.canPlacePieces = true;
  }
}

class Game {
  constructor(data){
    this.data = data;
    this.board = new Array(data.dimensions[0]).fill(0).map(() => new Array(data.dimensions[0]).fill("#ffffff"));
    this.turn = Math.floor(data.players * Math.random());
    this.turns = 0;
    this.timerLength = 90;
    this.timer = Date.now() + (this.timerLength * 1000);
    this.winner = -1;
  }
}
