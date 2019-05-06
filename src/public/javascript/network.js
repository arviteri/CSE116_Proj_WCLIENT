/*
  _   _      _                      _      _                 _      
 | \ | |    | |                    | |    | |               (_)     
 |  \| | ___| |___      _____  _ __| | __ | |     ___   __ _ _  ___ 
 | . ` |/ _ | __\ \ /\ / / _ \| '__| |/ / | |    / _ \ / _` | |/ __|
 | |\  |  __| |_ \ V  V | (_) | |  |   <  | |___| (_) | (_| | | (__ 
 |_| \_|\___|\__| \_/\_/ \___/|_|  |_|\_\ |______\___/ \__, |_|\___|
                                                        __/ |       
                                                       |___/   
*/

var gameSession = {
	config: {
		lastStartTime: 0,
		playerName: 'Web Player'
	},
	network: {
		connection: undefined,
		session: undefined,
		host: undefined
	},
	game: {
		atMainScreen: true,
		attemptingToJoin: false,
		connectedToGame: false,
		myPlayer: undefined,
		sessionId: undefined,
		players: {},
		score: 0,
		newPlayerQueue: [],
		disconnectedPlayerQueue: [],
		zombies: {},
		newZombiesQueue: [],
		zombiesToRemoveQueue: [],
		projectiles: {},
		newProjectilesQueue: [],
		projectilesToRemoveQueue: []
	},
	phaser: undefined,
	functions: {
		joinGame: joinGame,
		leaveGame: leaveGame,
		updateMyPlayerLocation: updateMyPlayerLocation,
		shootProjectile: shootProjectile,
		updateMyHealth: updateMyHealth
	}
};

/*
 * Joins the game.
 * Creates network connection and subscribes to events.
 */
function joinGame() {
	gameSession.config.lastStartTime = (new Date()).getTime();
	gameSession.network.connection = new SockJS('http://'+gameSession.network.host+'/connect_web');
	gameSession.network.session = Stomp.over(gameSession.network.connection);
	gameSession.network.session.debug = null; // Turn off console logging for stompClient
	gameSession.network.session.connect({}, function(res) {
		scoreLabel.setText('0');
		gameSession.network.session.subscribe('/user/queue/join', JoinGameHandler);
		gameSession.network.session.subscribe('/user/queue/all_players', GetAllPlayersHandler);
		gameSession.network.session.send('/app/join', {}, gameSession.config.playerName);
		gameSession.network.session.subscribe('/user/queue/score', ScoreHandler);
		gameSession.network.session.subscribe('/game/players', PlayerMessageHandler);
		gameSession.network.session.subscribe('/game/zombies', ZombieMessageHandler);
		gameSession.network.session.subscribe('/game/projectiles', ProjectileMessageHandler);
	}, function(err) {
		$('#error').text('An error occured connecting to the host.')
		$('#host').show();
		$('#player-name').show();
		$('#join-button').show();
		gameSession.game.attemptingToJoin = false;
		gameSession.game.connectedToGame = false;
	});
	console.log('Joined game.');
}

function leaveGame() {
	if (gameSession.game.connectedToGame) {
		gameSession.game.connectedToGame = false;
		gameSession.network.session.send('/app/leave', {});
		gameSession.network.session.disconnect();
		gameSession.network.connection = null;
		gameSession.network.session = null;
		gameSession.game.myPlayer = null;
		gameSession.game.sessionId = null;
		gameSession.config.lastStartTime = 0;

		/* Remove all player sprites */
		for (i in gameSession.game.players) {
			let player = gameSession.game.players[i];
			player.label.destroy();
			player.sprite.destroy();
		}

		/* Remove all projectile sprites */
		for (i in gameSession.game.projectiles) {
			let projectile = gameSession.game.projectiles[i];
			projectile.sprite.destroy();
		}

		/* Remove all zombie sprites */
		for (i in gameSession.game.zombies) {
			let zombie = gameSession.game.zombies[i];
			zombie.sprite.destroy();
		}

		delete gameSession.game.players;
		gameSession.game.players = {};

		delete gameSession.game.projectiles;
		gameSession.game.projectiles = {};

		delete gameSession.game.zombies;
		gameSession.game.zombies = {};
	}
	console.log('Left game.');
}

function updateMyPlayerLocation(location) {
	gameSession.game.myPlayer.props.location = location;
	gameSession.network.session.send('/app/move', {}, JSON.stringify(location));
}

function shootProjectile(projectile) {
	gameSession.network.session.send('/app/shoot', {}, JSON.stringify(projectile));
}

function updateMyHealth(newHealth) {
	gameSession.game.myPlayer.sprite.alpha = newHealth/100;
	gameSession.game.myPlayer.props.health = newHealth;
	gameSession.network.session.send('/app/health', {}, JSON.stringify(newHealth));
}


/*
   _____       _                   _       _   _             
  / ____|     | |                 (_)     | | (_)            
 | (___  _   _| |__  ___  ___ _ __ _ _ __ | |_ _  ___  _ __  
  \___ \| | | | '_ \/ __|/ __| '__| | '_ \| __| |/ _ \| '_ \ 
  ____) | |_| | |_) \__ | (__| |  | | |_) | |_| | (_) | | | |
 |_____/ \__,_|_.__/|___/\___|_|  |_| .__/ \__|_|\___/|_| |_|
                                    | |                      
                                    |_|    
			 | |  | |               | | |              
			 | |__| | __ _ _ __   __| | | ___ _ __ ___ 
			 |  __  |/ _` | '_ \ / _` | |/ _ | '__/ __|
			 | |  | | (_| | | | | (_| | |  __| |  \__ \
			 |_|  |_|\__,_|_| |_|\__,_|_|\___|_|  |___/ 
*/

const JoinGameHandler = function(res) {
	var message = JSON.parse(res.body);
	var playerProps = message.player;
	var sessionId = playerProps.id;

	var playerObj = {
		props: playerProps,
		sprite: undefined,
		label: undefined
	};

	gameSession.game.sessionId = sessionId;
	gameSession.game.myPlayer = playerObj;
	gameSession.game.players[sessionId] = playerObj;
	gameSession.game.newPlayerQueue.push(playerObj);
	gameSession.game.connectedToGame = true;
	gameSession.game.attemptingToJoin = false;
}

const GetAllPlayersHandler = function(res) {
	var message = JSON.parse(res.body);
	var allPlayers = message.map;
	for (i in allPlayers) {
		var player = allPlayers[i];
		if (player.id != gameSession.game.sessionId) {
			var playerObj = {
				props: player,
				sprite: undefined,
				label: undefined
			};
			gameSession.game.players[player.id] = playerObj;
			gameSession.game.newPlayerQueue.push(playerObj);
		}
	}
}

const PlayerMessageHandler = function(res) {
	var message = JSON.parse(res.body);
	var type = message.type;
	var playerProps = message.player;
	if (playerProps != null && playerProps.id != gameSession.game.sessionId) {
		if (type == "ADD") {
			var playerObj = {
				props: playerProps,
				sprite: undefined,
				label: undefined
			}
			gameSession.game.players[playerProps.id] = playerObj
			gameSession.game.newPlayerQueue.push(playerObj);
		} else if (type == "REMOVE") {
			var playerObj = gameSession.game.players[playerProps.id];
			gameSession.game.disconnectedPlayerQueue.push(playerObj);
			delete gameSession.game.players[playerProps.id];
		} else if (type == "UPDATE") {
			if (gameSession.game.players[playerProps.id] != undefined) {
				var playerObj = gameSession.game.players[playerProps.id];
				playerObj.props.location = playerProps.location;
				playerObj.sprite.setPosition(playerProps.location.x, playerProps.location.y);
				playerObj.label.setPosition(playerProps.location.x, playerProps.location.y-20);
				playerObj.props.health = playerProps.health;
			}
		}
	}
}

const ProjectileMessageHandler = function(res) {
	var message = JSON.parse(res.body);
	var type = message.type;
	var projectileProps = message.projectile
	if (projectileProps != null) {
		/* Rendering isn't the same as JavaFX so need to move the projectiles a bit. */
		if (type == "ADD") {
			var projectileObj = {
				props: projectileProps,
				sprite: undefined
			}
			gameSession.game.projectiles[projectileProps.id] = projectileObj;
			gameSession.game.newProjectilesQueue.push(projectileObj);
		} else if (type == "REMOVE") {
			var projectileObj = gameSession.game.projectiles[projectileProps.id];
			gameSession.game.projectilesToRemoveQueue.push(projectileObj);
			delete gameSession.game.projectiles[projectileProps.id];
		} else if (type == "UPDATE") {
			if (gameSession.game.projectiles[projectileProps.id].sprite != undefined) {
				var projectileObj = gameSession.game.projectiles[projectileProps.id];
				projectileObj.props.location = projectileProps.location;
				projectileObj.sprite.setPosition(projectileProps.location.x-10, projectileProps.location.y-10);
			}
		}
	}
}

const ZombieMessageHandler = function(res) {
	var message = JSON.parse(res.body);
	var type = message.type;
	var zombieProps = message.zombie;
	if (zombieProps != null) {
		if (type == "ADD") {
			var zombieObj = {
				props: zombieProps,
				sprite: undefined
			}
			gameSession.game.zombies[zombieProps.id] = zombieObj;
			gameSession.game.newZombiesQueue.push(zombieObj);
		} else if (type == "REMOVE") {
			var zombieObj = gameSession.game.zombies[zombieProps.id];
			gameSession.game.zombiesToRemoveQueue.push(zombieObj);
			delete gameSession.game.zombies[zombieProps.id];
		} else if (type == "UPDATE") {
			if (gameSession.game.zombies[zombieProps.id] != undefined) {
				if (gameSession.game.zombies[zombieProps.id].sprite != undefined) {
					var zombieObj = gameSession.game.zombies[zombieProps.id];
					zombieObj.props.health = zombieProps.health;
					zombieObj.props.location = zombieProps.location;
					zombieObj.sprite.setPosition(zombieProps.location.x, zombieProps.location.y);
					zombieObj.sprite.alpha = zombieProps.health/100;

					/* Update my player health */
					if (gameSession.game.connectedToGame) {
						var updatedLocation = zombieProps.location;
						var myLocation = gameSession.game.myPlayer.props.location;
						if (updatedLocation.x >= myLocation.x - 20 && updatedLocation.x <= myLocation.x + 20) {
							if (updatedLocation.y >= myLocation.y - 20 && updatedLocation.y <= myLocation.y + 20) {
								var currentHealth = gameSession.game.myPlayer.props.health;
								if ((((new Date()).getTime() - gameSession.config.lastStartTime))/1000 > 5) {
									gameSession.functions.updateMyHealth(currentHealth - 2);
									if (gameSession.game.myPlayer.props.health <= 0) {
										gameSession.functions.leaveGame();
									}
								}
							}
						}
					}
				}
			} else {
				var zombieObj = {
					props: zombieProps,
					sprite: undefined
				}
				gameSession.game.zombies[zombieProps.id] = zombieObj;
				gameSession.game.newZombiesQueue.push(zombieObj);
			}
		}
	}
}

const ScoreHandler = function(res) {
	var score = JSON.parse(res.body);
	scoreLabel.setText(score)
	gameSession.game.myPlayer.props.score = score;
	gameSession.game.score = score;
}
