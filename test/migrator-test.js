const Migromongo = require('../');
const config = require('./config/db');
const mongo = require('mongodb').MongoClient;
const mocha = require('mocha');
const expect = require('chai').expect;

var mongoDb = null;

mocha.before(function (done) {
    connectToDb(function (db) {
        mongoDb = db;
        done();
    });
});

mocha.after(function (done) {
    mongoDb.dropDatabase(function () {
        done();
    });
});

mocha.describe('Mongo migrator tests', function () {
    var migromongo;

    mocha.beforeEach(function (done) {
        migromongo = new Migromongo(mongoDb, {directory: config.directory, collection: config.collection});
        done();
    });

    mocha.describe('Migrate', function () {
        mocha.it('perform all migrations', function (done) {
            migromongo.migrate(function (success) {
                expect(success).to.equal(true);
                mongoDb.collection('test').findOne({value: 2}, function (err, data) {
                    expect(data.name).to.equal('test2');
                    done();
                });
            });
        });
    });
});

function connectToDb(cb) {
    var username = config.user;
    var password = config.password;

    var auth = '';
    var opt = {};
    if (username !== '' && password !== '') {
        auth = username + ':' + password + '@';
        opt = {
            native_parser: true,
            authSource: 'admin'
        };
    }

    mongo.connect(config.driver + '://' + auth + config.host + ':' + config.port + '/' + config.dbname, opt, function (err, client) {
        if (err) {
            console.error('Error while connecting to mongo database');
            console.error(err);
            return;
        }
        cb(client.db(config.dbname));
    });
}
