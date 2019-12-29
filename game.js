/*
  Set speed to zero
*/
(() => {
	const messageName = "zero-timeout-message";
	let timeouts = [];

	setZeroTimeout = (fn) => {
		timeouts.push(fn);
		window.postMessage(messageName, "*");
	}

	handleMessage = (event) => {
		if (event.source == window && event.data == messageName) {
			event.stopPropagation();
			if (timeouts.length > 0) {
				let fn = timeouts.shift();
				fn();
			}
		}
	}

	window.addEventListener("message", handleMessage, true);

	window.setZeroTimeout = setZeroTimeout;
})();

let Neuvol;
let game;
let FPS = 60;
let maxScore=0;

let images = {};

let speed = (fps) => {
	FPS = parseInt(fps);
}

let loadImages = (sources, callback) => {
	let nb = 0;
	let loaded = 0;
	let imgs = {};
	for(let i in sources) {
		nb++;
		imgs[i] = new Image();
		imgs[i].src = sources[i];
		imgs[i].onload = () => {
			loaded++;
			if(loaded == nb) {
				callback(imgs);
			}
		}
	}
}

const Mario = class {
  constructor(configs) {
    this.x = 80;
    this.y = 250;
    this.width = 40;
    this.height = 30;
  
    this.alive = true;
    this.gravity = 0;
    this.velocity = 0.3;
    this.jump = -6;
  
    this.init(configs);
  }
}
Mario.prototype.init = function(configs) {
	for(let i in configs) {
		this[i] = configs[i];
	}
};
Mario.prototype.flap = function() {
	this.gravity = this.jump;
};
Mario.prototype.update = function() {
	this.gravity += this.velocity;
	this.y += this.gravity;
};
Mario.prototype.isDead = function(height, pipes) {
	if(this.y >= height || this.y + this.height <= 0) {
		return true;
	}
	for(let i in pipes) {
		if(!(
			this.x > pipes[i].x + pipes[i].width ||
			this.x + this.width < pipes[i].x || 
			this.y > pipes[i].y + pipes[i].height ||
			this.y + this.height < pipes[i].y
    )) {
			return true;
    }
  }
}

const Pipe = class {
  constructor(configs) {
    this.x = 0;
    this.y = 0;
    this.width = 50;
    this.height = 40;
    this.speed = 3;
  
    this.init(configs);
  }
}
Pipe.prototype.init = function(configs) {
	for(let i in configs) {
		this[i] = configs[i];
	}
}
Pipe.prototype.update = function() {
	this.x -= this.speed;
}
Pipe.prototype.isOut = function() {
	if(this.x + this.width < 0) {
		return true;
	}
}

const Game = class {
  constructor() {
    this.pipes = [];
    this.marios = [];
    this.score = 0;
    this.canvas = document.querySelector("#mario");
    this.ctx = this.canvas.getContext("2d");
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.spawnInterval = 90;
    this.interval = 0;
    this.gen = [];
    this.alives = 0;
    this.generation = 0;
    this.backgroundSpeed = 0.5;
    this.backgroundx = 0;
    this.maxScore = 0;
  }
}
Game.prototype.start = function() {
	this.interval = 0;
	this.score = 0;
	this.pipes = [];
	this.marios = [];

	this.gen = Neuvol.nextGeneration();
	for(let i in this.gen) {
		let m = new Mario();
		this.marios.push(m)
	}
	this.generation++;
	this.alives = this.marios.length;
}
Game.prototype.update = function() {
	this.backgroundx += this.backgroundSpeed;
	let nextHoll = 0;
	if(this.marios.length > 0) {
		for(let i = 0; i < this.pipes.length; i+=2) {
			if(this.pipes[i].x + this.pipes[i].width > this.marios[0].x) {
				nextHoll = this.pipes[i].height/this.height;
				break;
			}
		}
	}

	for(let i in this.marios) {
		if(this.marios[i].alive) {

			let inputs = [
        this.marios[i].y / this.height,
        nextHoll
			];

			let res = this.gen[i].compute(inputs);
			if(res > 0.5) {
				this.marios[i].flap();
			}

			this.marios[i].update();
			if(this.marios[i].isDead(this.height, this.pipes)) {
				this.marios[i].alive = false;
				this.alives--;
				//console.log(this.alives);
				Neuvol.networkScore(this.gen[i], this.score);
				if(this.isItEnd()) {
					this.start();
				}
			}
		}
	}

	for(let i = 0; i < this.pipes.length; i++) {
		this.pipes[i].update();
		if(this.pipes[i].isOut()) {
			this.pipes.splice(i, 1);
			i--;
		}
	}

	if(this.interval == 0) {
		let deltaBord = 50;
		let pipeHoll = 120;
		let hollPosition = Math.round(Math.random() * (this.height - deltaBord * 2 - pipeHoll)) +  deltaBord;
		this.pipes.push(new Pipe({ x: this.width, y: 0, height: hollPosition }));
		this.pipes.push(new Pipe({ x: this.width, y: hollPosition + pipeHoll, height: this.height }));
	}

	this.interval++;
	if(this.interval == this.spawnInterval) {
		this.interval = 0;
	}

	this.score++;
	this.maxScore = (this.score > this.maxScore) ? this.score : this.maxScore;
	let self = this;

	if(FPS == 0) {
		setZeroTimeout(() => {
			self.update();
		});
	}else{
		setTimeout(() => {
			self.update();
		}, 1000 / FPS);
	}
}
Game.prototype.isItEnd = function() {
	for(let i in this.marios) {
		if(this.marios[i].alive) {
			return false;
		}
	}
	return true;
}
Game.prototype.display = function() {
	this.ctx.clearRect(0, 0, this.width, this.height);
	for(let i = 0; i < Math.ceil(this.width / images.background.width) + 1; i++) {
		this.ctx.drawImage(images.background, i * images.background.width - Math.floor(this.backgroundx%images.background.width), 0)
	}

	for(let i in this.pipes) {
		if(i%2 == 0) {
			this.ctx.drawImage(images.pipetop, this.pipes[i].x, this.pipes[i].y + this.pipes[i].height - images.pipetop.height, this.pipes[i].width, images.pipetop.height);
		}else{
			this.ctx.drawImage(images.pipebottom, this.pipes[i].x, this.pipes[i].y, this.pipes[i].width, images.pipetop.height);
		}
	}

	this.ctx.fillStyle = "#FFC600";
	this.ctx.strokeStyle = "#CE9E00";
	for(let i in this.marios) {
		if(this.marios[i].alive) {
			this.ctx.save(); 
			this.ctx.translate(this.marios[i].x + this.marios[i].width/2, this.marios[i].y + this.marios[i].height/2);
			this.ctx.rotate(Math.PI/2 * this.marios[i].gravity/20);
			this.ctx.drawImage(images.mario, -this.marios[i].width / 2, -this.marios[i].height / 2, this.marios[i].width, this.marios[i].height);
			this.ctx.restore();
		}
	}

	// this.ctx.fillStyle = "white";
	// this.ctx.font="20px Oswald, sans-serif";
	// this.ctx.fillText("Score : "+ this.score, 10, 25);
	// this.ctx.fillText("Max Score : "+this.maxScore, 10, 50);
	// this.ctx.fillText("Generation : "+this.generation, 10, 75);
	// this.ctx.fillText("Alive : "+this.alives+" / "+Neuvol.options.population, 10, 100);

	document.getElementById('score').innerHTML = this.score;
	document.getElementById("maxScore").innerHTML = this.maxScore;
	document.getElementById("generation").innerHTML = this.generation;
	document.getElementById("alives").innerHTML = this.alives;

	let self = this;
	requestAnimationFrame(() =>{
		self.display();
	});
}

window.onload = () => {
	let sprites = {
		mario: "./img/mario.png",
		background: "./img/mario_background.png",
		pipetop: "./img/pipetop.png",
		pipebottom: "./img/pipebottom.png"
	};

	let start = () => {
		Neuvol = new Neuroevolution({
			population: 50,
			network:[2, [2], 1],
		});
		game = new Game();
		game.start();
		game.update();
		game.display();
	};


	loadImages(sprites, (imgs) => {
		images = imgs;
		start();
	})

	let slide = document.getElementById("slide");
	let speedValue = document.getElementById("speed");
	slide.oninput = function () {
		let value = Math.floor(this.value);
		if (value != 6) {
			speedValue.innerHTML = "X " + Math.floor(this.value);
			speed(value * 60);
		} else {
			speedValue.innerHTML = "MAX";
			speed(0);
		}
	}
}
