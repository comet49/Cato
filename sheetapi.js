const GoogleSpreadsheet = require('google-spreadsheet');
const p = require('doasync');

const config = require('./config/config.js');
const creds = require('./service-account.json');

class SheetApi {
  constructor() {
    this._building = this._build();
  }

  async _build() {
    // Authenticate with google and fetch information
    const doc = new GoogleSpreadsheet(config.spreadsheetId);
    await p(doc).useServiceAccountAuth(creds);
    const info = await p(doc).getInfo();

    // Get available sheets, first will be main sheet, second will be for errors
    [this._sheet, this._errorSheet] = info.worksheets;
  }

  async writeSheet(data, authorName) {
    await this._building;

    // Generate info string for each player including their user ID and score
    const players = data.fields.map(f => `<@${f.username}> ${f.score}`);

    // Add all information to a new row entry
    await p(this._sheet).addRow({
      // gameId is a Discord snowflake, so convert it back into a date
      Date    : new Date((data.gameId / 4194304) + 1420070400000),

      MsgId   : data.gameId,
      Author  : authorName,
      Content : players.join(' '),

      Player1 : players[0] || 'NONE',
      Player2 : players[1] || 'NONE',
      Player3 : players[2] || 'NONE',
      Player4 : players[3] || 'NONE',
    });
  }

  async writeError(errMsg) {
    await this._building;

    // Add a row entry to the error sheet containing the provided error message and the current date
    await p(this._errorSheet).addRow({
      Date  : new Date(),
      Error : errMsg,
    });
  }

  async delRow(MsgId) {
    await this._building;

    // Remove all rows matching provided MsgId
    const rows = await p(this._sheet).getRows({ query : `msgid=${MsgId}` });
    for (const row of rows) await p(row).del();
  }
}

module.exports = SheetApi;
