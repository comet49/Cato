const mysql = require('mysql');
const p = require('doasync');

const config = require('./config/config.js');

/*
  CREATE TABLE `accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `discord_id` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `token` varchar(200) NOT NULL,
  `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
  );

  CREATE TABLE `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
  );

  CREATE TABLE `games` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_id` varchar(100) NOT NULL,
  `season` int(4) DEFAULT NULL,
  `validated` tinyint(1) NOT NULL DEFAULT '0',
  `certified` tinyint(1) NOT NULL DEFAULT '0',
  `author` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
  );

  CREATE TABLE `scores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `score` tinyint(3) unsigned NOT NULL,
  `game_id` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
  );
*/

class DbFun {
  constructor() {
    this._building = this._build();
  }

  async _build() {
    // Connect to mysql using config in external file
    this._conn = mysql.createConnection({
      ...config.db,
      multipleStatements : true,
    });

    await p(this._conn).connect();
  }

  async validateGame(id) {
    await this._building;

    // Set validation status on game to be true
    await p(this._conn).query('UPDATE games SET validated = \'1\' WHERE game_id = ?', [id]);
  }

  async certifyGame(id) {
    await this._building;

    // Set certification status on game to be true
    await p(this._conn).query('UPDATE games SET certified = \'1\' WHERE game_id = ?', [id]);
  }

  async game(id) {
    await this._building;

    // Get single game entry by game ID
    return (await p(this._conn).query('SELECT * FROM games WHERE game_id = ?', [id]))[0];
  }

  async clear(id) {
    await this._building;

    // Delete all score and game entries matching game ID
    await p(this._conn).query('DELETE FROM scores WHERE game_id = ?; DELETE FROM games WHERE game_id = ?', [id, id]);
  }

  async insertScores(data, authorId) {
    await this._building;

    // Insert game information
    await p(this._conn).query('INSERT INTO games (game_id, author, season) VALUES (?, ?, ?)', [data.gameId, authorId, config.season]);

    // Compile array of scoring entries
    const gamesSqlFields = data.fields.map(d => [data.gameId, d.userId, d.username, d.score]);
    // Add all scoring entries to database
    await p(this._conn).query('INSERT INTO scores (game_id, user_id, user_name, score) VALUES ?', [gamesSqlFields]);
  }
}

module.exports = DbFun;
