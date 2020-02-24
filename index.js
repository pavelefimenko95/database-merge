require('babel-register')({
    presets: ['env'],
    plugins: ['transform-object-rest-spread']
});
require('babel-polyfill');
const Promise = require('bluebird');
const { MongoClient } = Promise.promisifyAll(require('mongodb'));
const config = require('./config/index');

let app = null;
switch(process.argv[2]) {
    case 'migrate':
        app = require('./src/migrate/app').app;
        break;
    case 'merge':
        app = require('./src/merge/app').app;
}

MongoClient.connect(`mongodb://localhost:${config.DB_PORT}`)
    .then(client => {
        console.log("Connected successfully to server");

        const sourceDb = client.db(config.SOURCE_DB);
        const targetDb = client.db(config.TARGET_DB);
        app(sourceDb, targetDb, client);
    })
    .catch(console.error);