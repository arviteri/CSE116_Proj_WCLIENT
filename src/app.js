const express = require('express');
const server = express();
const path = require('path');
const _DIR = path.dirname(require.main.filename);

server.use(express.static(_DIR+'/public'));

server.get('/', (req, res) => {
	console.log("Client connected");
	res.sendFile(_DIR+'/index.html');	
});

server.listen(3030, () => {
	console.log('Listening...');
});