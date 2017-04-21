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
        mongoDb.close();
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
            migromongo.migrate(function () {
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
    if (username != '' && password != '') {
        auth = username + ':' + password + '@';
    }

    mongo.connect(config.driver + '://' + auth + config.host + ':' + config.port + '/' + config.dbname, function (err, db) {
        if (err) {
            console.error('Error while connecting to mongo database');
            return;
        }
        cb(db);
    });
}
