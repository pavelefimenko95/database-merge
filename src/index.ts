import Bluebird from'bluebird';
const { MongoClient } = Bluebird.promisifyAll(require('mongodb'));
import config from './config';

let app = null;
switch(process.argv[2]) {
    case 'migrate':
        app = require('./migrate/app').app;
        break;
    case 'merge':
        app = require('./merge/app').app;
}

MongoClient.connect(`mongodb://localhost:${config.DB_PORT}`)
    .then(client => {
        console.log("Connected successfully to server");

        const sourceDb = client.db(config.SOURCE_DB);
        const targetDb = client.db(config.TARGET_DB);
        app(sourceDb, targetDb, client);
    })
    .catch(console.error);