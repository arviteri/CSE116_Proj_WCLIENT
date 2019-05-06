/*
  _____  _                       
 |  __ \| |                      
 | |__) | | __ _ _   _  ___ _ __ 
 |  ___/| |/ _` | | | |/ _ | '__|
 | |    | | (_| | |_| |  __| |   
 |_|    |_|\__,_|\__, |\___|_|   
                  __/ |          
                 |___/     
		   _____            _             _ _           
		  / ____|          | |           | | |          
		 | |     ___  _ __ | |_ _ __ ___ | | | ___ _ __ 
		 | |    / _ \| '_ \| __| '__/ _ \| | |/ _ | '__|
		 | |___| (_) | | | | |_| | | (_) | | |  __| |   
		  \_____\___/|_| |_|\__|_|  \___/|_|_|\___|_| 
*/

const PlayerController = function(keyEvent) {
	const MOVE_INTERVAL = 5;

	if (keyEvent.key == "Enter") {
		if (!gameSession.game.connectedToGame && !gameSession.game.attemptingToJoin) {
			if (gameSession.game.atMainScreen) {
				console.log('starting')
				start();
			}
		}
	} else if (gameSession.game.connectedToGame) {
		let updatedLocation = gameSession.game.myPlayer.props.location;
		switch(keyEvent.key) {
			case "ArrowUp":
				gameSession.game.myPlayer.props.lastMove = "UP";
				var newY = updatedLocation.y - MOVE_INTERVAL;
				updatedLocation.y  = (newY >= 0) ? updatedLocation.y - MOVE_INTERVAL : updatedLocation.y //-= MOVE_INTERVAL;
				keyEvent.returnValue = false;
				break;
			case "ArrowDown":
				gameSession.game.myPlayer.props.lastMove = "DOWN";
				var newY = updatedLocation.y + MOVE_INTERVAL;
				updatedLocation.y  = (newY <= GAME_HEIGHT-10) ? updatedLocation.y + MOVE_INTERVAL : updatedLocation.y
				keyEvent.returnValue = false;
				break;
			case "ArrowLeft":
				gameSession.game.myPlayer.props.lastMove = "LEFT";
				var newX = updatedLocation.x - MOVE_INTERVAL;
				updatedLocation.x  = (newX >= 0) ? updatedLocation.x - MOVE_INTERVAL : updatedLocation.x	
				keyEvent.returnValue = false;
				break;
			case "ArrowRight":
				gameSession.game.myPlayer.props.lastMove = "RIGHT";
				var newX = updatedLocation.x + MOVE_INTERVAL;
				updatedLocation.x  = (newX <= GAME_WIDTH-10) ? updatedLocation.x + MOVE_INTERVAL : updatedLocation.x			
				keyEvent.returnValue = false;
				break;
			case " ":
				let projectile = {
					id: "",
					ownerId: gameSession.game.sessionId,
					timeAlive: 0,
					location: {
						x: updatedLocation.x+10, // 20 is the width of the player
						y: updatedLocation.y+10 // 20 is the height of the player
					},
					velocity: {x: 0, y: 0, z: 0}
				};
				switch(gameSession.game.myPlayer.props.lastMove) {
					case "UP": // Last move is up
						projectile.velocity.y = -10;
						break;
					case "DOWN": // Last move is down
						projectile.velocity.y = 10;
						break;
					case "LEFT": // Last move is left
						projectile.velocity.x = -10;
						break;
					case "RIGHT": // Last move is right
						projectile.velocity.x = 10;
						break;
				}
				gameSession.functions.shootProjectile(projectile);
				keyEvent.returnValue = false;
				break;
		}
		let sprite = gameSession.game.myPlayer.sprite
		let label = gameSession.game.myPlayer.label
		sprite.setPosition(updatedLocation.x, updatedLocation.y)
		label.setPosition(updatedLocation.x, updatedLocation.y-20)
		gameSession.functions.updateMyPlayerLocation(updatedLocation)
	}
};




/*
  _____  _                            _____             __ _       
 |  __ \| |                          / ____|           / _(_)      
 | |__) | |__   __ _ ___  ___ _ __  | |     ___  _ __ | |_ _  __ _ 
 |  ___/| '_ \ / _` / __|/ _ | '__| | |    / _ \| '_ \|  _| |/ _` |
 | |    | | | | (_| \__ |  __| |    | |___| (_) | | | | | | | (_| |
 |_|    |_| |_|\__,_|___/\___|_|     \_____\___/|_| |_|_| |_|\__, |
                                                              __/ |
                                                             |___/

*/
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

var phaserConfig = {
	type: Phaser.AUTO,
	width: GAME_WIDTH,
	height: GAME_HEIGHT,
	parent: 'game',
	backgroundColor: '#fcfcfc',
	physics: {
		default: 'arcade',
		arcade: {
			gravity: { y: 0}
		}
	},
	scene: {
		preload: preload,
		create: create,
		update: update
	}
};

function preload() {
	scoreLabel = this.add.text(15, 15, '', { font: "18px bold", fill: '#000' });
}

function create() {
	this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
	$('#join-button').show();
	$('#join-button').click(function() {
		start.bind(this)();
	}.bind(this));
}

function update() {
	if (!gameSession.game.connectedToGame && !gameSession.game.attemptingToJoin) {
		if (!gameSession.game.atMainScreen) {
			restart.bind(this)();
		}
	} else {
		addNewPlayers.bind(this)();
		removeDisconnectedPlayers.bind(this)();
		addNewProjectiles.bind(this)();
		removeProjectiles.bind(this)();
		addNewZombies.bind(this)();
		removeZombies.bind(this)();
	}
}


function restart() {
	this.physics.world.scene.children.removeAll();
	scoreLabel = this.add.text(15, 15, gameSession.game.score, { font: "18px bold", fill: '#000' });
	gameSession.game.atMainScreen = true;
	$('#host').show();
	$('#player-name').show();
	$('#join-button').show();
}


function start() {
	(async () => {
		gameSession.game.atMainScreen = false;
		gameSession.game.attemptingToJoin = true;
	})().then(function() {
		var playerName = $('#player-name').val();
		var host = $('#host').val();
		if (host) {
			gameSession.network.host = host;
			if (playerName) {
				gameSession.config.playerName = playerName;
			}
			gameSession.functions.joinGame();
			$('#host').hide();
			$('#player-name').hide();
			$('#join-button').hide();
			$('#error').text('')
		} else {
			gameSession.game.attemptingToJoin = false;
			$('#host').focus();
		}
	});
}


/*
   _____                        _                 _      
  / ____|                      | |               (_)     
 | |  __  __ _ _ __ ___   ___  | |     ___   __ _ _  ___ 
 | | |_ |/ _` | '_ ` _ \ / _ \ | |    / _ \ / _` | |/ __|
 | |__| | (_| | | | | | |  __/ | |___| (_) | (_| | | (__ 
  \_____|\__,_|_| |_| |_|\___| |______\___/ \__, |_|\___|
                                             __/ |       
                                            |___/  
*/


window.onkeydown = PlayerController;
var game = new Phaser.Game(phaserConfig);

/* UI Elements */
var scoreLabel;
/**
 * NOTE: The functions below are called by Phaser's scene 'update' function.
 * The instance of 'this' in the code functions below refer to Phaser
 * and will only work if the scene's update function binds 'this' on 
 * the function call. A lack of binding 'this' will cause unexpected results.
 */
function addNewPlayers() {
	if (gameSession.game.newPlayerQueue.length > 0) {
		var player = gameSession.game.newPlayerQueue.shift();
		//player.sprite = this.physics.add.sprite(player.props.location.x, player.props.location.y, 'player');
		var rect = this.make.graphics({x: 0, y: 0, add: false});		
		rect.fillStyle(0x2200ff, 1);
		rect.fillRect(0,0,20,20);
		rect.generateTexture('player', 20,20);
		player.sprite = this.physics.add.sprite(player.props.location.x, player.props.location.y, 'player');
		player.label = this.add.text(player.props.location.x, player.props.location.y-20, player.props.name, { font: "12px", fill: '#000' }).setOrigin(0.5, 0.5);
	}
}

function removeDisconnectedPlayers() {
	if (gameSession.game.disconnectedPlayerQueue.length > 0) {
		var player = gameSession.game.disconnectedPlayerQueue.shift();
		player.sprite.destroy();
		player.label.destroy();
	}
}

function addNewProjectiles() {
	if (gameSession.game.newProjectilesQueue.length > 0) {
		var projectile = gameSession.game.newProjectilesQueue.shift();
		var circle = this.make.graphics({x: 0, y: 0, add: false});
		circle.fillStyle(0x000000,1);
		circle.fillCircle(2,2,2,2);
		circle.generateTexture('projectile', 5,5);
		projectile.sprite = this.physics.add.sprite(projectile.props.location.x-10, projectile.props.location.y-10, 'projectile')
	}
}

function removeProjectiles() {
	if (gameSession.game.projectilesToRemoveQueue.length > 0) {
		var projectile = gameSession.game.projectilesToRemoveQueue.shift();
		projectile.sprite.destroy();
	}
}

function addNewZombies() {
	if (gameSession.game.newZombiesQueue.length > 0) {
		var zombie = gameSession.game.newZombiesQueue.shift();
		var rect = this.make.graphics({x: 0, y: 0, add: false});
		rect.fillStyle(0xff0002, 1);
		rect.fillRect(0,0,20,20);
		rect.generateTexture('zombie', 20,20);
		zombie.sprite = this.physics.add.sprite(zombie.props.location.x, zombie.props.location.y, 'zombie');
	}
}

function removeZombies() {
	if (gameSession.game.zombiesToRemoveQueue.length > 0) {
		var zombie = gameSession.game.zombiesToRemoveQueue.shift();
		zombie.sprite.destroy();
	}
}



