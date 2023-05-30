var white = "#ffffff";
var lightGray = "#bfbfbf";
var gray = "#808080";
var darkGray = "#404040";
var black = "#000000";
var yellow = "#f8b11a";
var green = "#589841";
var red = "#b42117";
var blue = "#382b70";

function drawOblong(x, y, w, h, r, color, color2, width){
  ctx.beginPath();
  if(typeof color != "string" && color != undefined){
    ctx.fillStyle = color;
  }else{
    if(color == undefined){
      color = blue;
    }
    var gradient = ctx.createLinearGradient(x, y, x + w, y - h);
    gradient.addColorStop(0, changeColor(color, -16, -16, -16));
    gradient.addColorStop(1, changeColor(color, 16, 16, 16));
    ctx.fillStyle = gradient;
  }
  ctx.strokeStyle = color2 == undefined ? gray : color2;
  ctx.lineWidth = width == undefined ? 3 : width;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y - h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.fill();
  if(width != 0){
    ctx.stroke();
  }
  ctx.closePath();
  return new Bounds([x, x + w], [y, y + h]);
}

function clipOblong(x, y, w, h, r, color, color2, width, x1, y1, x2, y2){
  ctx.save();
  ctx.rect(x1, y1, x2, y2);
  ctx.clip();
  ctx.beginPath();
  if(typeof color != "string" && color != undefined){
    ctx.fillStyle = color;
  }else{
    if(color == undefined){
      color = blue;
    }
    var gradient = ctx.createLinearGradient(x, y, x + w, y);
    gradient.addColorStop(0, changeColor(color, -16, -16, -16));
    gradient.addColorStop(1, changeColor(color, 16, 16, 16));
    ctx.fillStyle = gradient;
  }
  ctx.strokeStyle = color2 == undefined ? gray : color2;
  ctx.lineWidth = width == undefined ? 3 : width;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y - h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.closePath();
}

function drawArc(x, y, r , a1, a2, color, color2, width){
  ctx.beginPath();
  ctx.fillStyle = color == undefined ? blue : color;
  ctx.strokeStyle = color2 == undefined ? gray : color2;
  ctx.lineWidth = width == undefined ? 1 : width;
  ctx.moveTo(x, y);
  ctx.arc(x, y, r, a1, a2);
  ctx.moveTo(x, y);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}

function drawLine(x1, y1, x2, y2, color, width){
  ctx.beginPath();
  ctx.strokeStyle = color == undefined ? black : color;
  ctx.lineWidth = width == undefined ? 1 : width;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

function writeText(text, x, y, size, align, color, color2, width){
  ctx.beginPath();
  ctx.fillStyle = color == undefined ? gray : color;
  ctx.strokeStyle = color2 == undefined ? black : color2;
  ctx.font = size + "px Courier New";
  ctx.lineWidth = width == undefined ? 1 : width;
  ctx.textAlign = align;
  var measure = ctx.measureText(text);
  ctx.fillText(text, x, y + (getTextHeight(measure) / 2));
  ctx.strokeText(text, x, y + (getTextHeight(measure) / 2));
  ctx.closePath();
  return measure;
}

function fitText(text, x, y, size, align, color, color2, width, fit){
  var measure = getText(text, size);
  var length = size;
  while(measure.width > fit){
    length--;
    measure = getText(text, length);
  }
  writeText(text, x, y, length, align, color, color2, width);
  return measure;
}

function clipText(text, x, y, size, align, color, color2, width, clip){
  ctx.beginPath();
  ctx.fillStyle = color == undefined ? gray : color;
  ctx.strokeStyle = color2 == undefined ? black : color2;
  ctx.font = size + "px Courier New";
  ctx.lineWidth = width == undefined ? 1 : width;
  ctx.textAlign = align;
  var measure = ctx.measureText(text);
  ctx.save();
  if(align == "left"){
    ctx.rect(x, 0, measure.width * clip, h);
  }else if(align == "center"){
    ctx.rect(x - measure.width / 2, 0, measure.width * clip, h);
  }else if (align == "right"){
    ctx.rect(x - measure.width, 0, measure.width * clip, h);
  }

  ctx.clip();
  ctx.fillText(text, x, y + (getTextHeight(measure) / 2));
  ctx.strokeText(text, x, y + (getTextHeight(measure) / 2));
  ctx.restore();
  ctx.closePath();
  return measure;
}

function fitClippedText(text, x, y, size, align, color, color2, width, clip, fit){
  var measure = getText(text, size);
  var length = size;
  while(measure.width > fit){
    length--;
    measure = getText(text, length);
  }
  clipText(text, x, y, length, align, color, color2, width, clip);
  return measure;
}

function getText(text, size){
  ctx.beginPath();
  ctx.font = size + "px Courier New";
  var measure = ctx.measureText(text);
  ctx.closePath();
  return measure;
}

function getTextHeight(info){
  return info.actualBoundingBoxAscent + info.actualBoundingBoxDescent;
}

function emit(signal, data){
  if(Array.isArray(data)){
    socket.emit(signal, ...data);
  }else{
    socket.emit(signal, data);
  }
}

function getRGB(hex){
  var rgb = {r:0, g:0, b:0};
  rgb.r = parseInt(hex.slice(1, 3), 16);
  rgb.g = parseInt(hex.slice(3, 5), 16);
  rgb.b = parseInt(hex.slice(5, 7), 16);
  return rgb;
}

function changeColor(hex, r, g, b){
  var chars = ["r", "g", "b"]
  var rgb = getRGB(hex);
  for(var i = 0; i < 3; i++){
    rgb[chars[i]] += eval(chars[i]);
    if(rgb[chars[i]] < 0){
      rgb[chars[i]] = 0;
    }
    if(rgb[chars[i]] > 255){
      rgb[chars[i]] = 255;
    }
  }
  return getHex(rgb);
}

function getHex(rgb){
  var hex = "#";
  if(rgb.r.toString(16).length == 2){
    hex += rgb.r.toString(16);
  }else{
    hex += "0" + rgb.r.toString(16);
  }
  if(rgb.g.toString(16).length == 2){
    hex += rgb.g.toString(16);
  }else{
    hex += "0" + rgb.g.toString(16);
  }
  if(rgb.b.toString(16).length == 2){
    hex += rgb.b.toString(16);
  }else{
    hex += "0" + rgb.b.toString(16);
  }
  return hex;
}

function mixColors(color, color2){
  var rgb = getRGB(color);
  var rgb2 = getRGB(color2);
  return getHex({r:Math.floor((rgb.r + rgb2.r) / 2), g:Math.floor((rgb.g + rgb2.g) / 2), b:Math.floor((rgb.b + rgb2.b) / 2)});
}

function getRandomColor(){
  return getHex({r:Math.floor(Math.random() * 256), g:Math.floor(Math.random() * 256), b:Math.floor(Math.random() * 256)});
}

function getOppositeColor(color){
  var rgb = getRGB(color);
  return getHex({r:255 - rgb.r, g:255 - rgb.g, b:255 - rgb.b});
}

function play(sound){
  $(sound).currentTime = 0;
  $(sound).loop = false;
  $(sound).play();
}

function loop(sound){
  $(sound).loop = true;
  $(sound).currentTime = 0;
  $(sound).play();
}

function stop(sound){
  $(sound).pause();
}

function log(text){
  console.log(text);
}

 function $(id){
   return document.getElementById(id);
 }

 function restartPath(context){
   context.closePath();
   context.beginPath();
 }

 function isWithin(x, y, bounds){
   return x >= bounds.x[0] && x <= bounds.x[1] && y >= bounds.y[0] && y <= bounds.y[1];
 }

 class Animation{
   constructor(type, length){
     var date = new Date();
     this.type = type;
     this.length = length;
     this.start = date.getTime();
     this.end = this.start + length;
   }
   getPer(){
     var date = new Date();
     return (date.getTime() - this.start) / this.length;
   }
 }

 class Bounds {
   constructor(x, y){
     this.x = x;
     this.y = y;
   }
 }

 class Trigger {
   constructor(bounds, event, data){
     this.bounds = bounds;
     this.event = event;
     this.data = data;
   }
 }

 function makeButton(oblong, event, data){
  triggers.push(new Trigger(drawOblong(...oblong), event, data));
 }

 function rotate(piece){
  return piece[0].map((col, i) => piece.map(row => row[i]));
}
