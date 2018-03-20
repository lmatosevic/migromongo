const fs = require('fs'),
    Migration = require('./migration'),
    path = require('path');

function Migrator(db, config) {
    this.db = db;
    this.logLevels = config['logLevels'] || ['INFO', 'ERROR'];

    var directory = config['directory'] || '.';
    if (path.isAbsolute(directory)) {
        this.migrationDir = directory;
    } else {
        this.migrationDir = path.join(__dirname, '../../', directory);
    }
    if (this.migrationDir.slice(-1) !== '/' && this.migrationDir.slice(-1) !== '\\') {
        this.migrationDir = this.migrationDir + '/';
    }

    this.migrationCollection = config['collection'] || '_migrations';

    var collections = [];
    this.db.listCollections().forEach(function (collection) {
        collections.push(collection);
    });
    if (collections.indexOf(this.migrationCollection) <= -1) {
        this.db.createCollection(this.migrationCollection);
    }

    this.migrationChain = {};
    this.counterTotal = 0;
    this.counterFailed = 0;
}

Migrator.prototype._getAllMigrations = function (cb) {
    var self = this;
    fs.readdir(self.migrationDir, function (err, files) {
        var migrations = [];
        if (err) {
            this._logError(err);
            process.exit(2);
        }
        if (files) {
            files.sort().forEach(function (file) {
                migrations.push(new Migration(require(self.migrationDir + file), self.db));
            });
        }
        cb(migrations);
    }.bind(this));
};

Migrator.prototype._getFinishedMigrations = function (cb) {
    this.db.collection(this.migrationCollection).find({success: true}, {_id: true}).toArray(function (err, migrations) {
        cb(migrations);
    });
};

Migrator.prototype._getAvailableMigrations = function (cb) {
    var self = this;
    self._getAllMigrations(function (allMigrations) {
        self._getFinishedMigrations(function (finishedMigrations) {
            var finishedIds = finishedMigrations.map(function (migration) {
                return migration._id;
            });

            var migrations = [];
            allMigrations.forEach(function (migration) {
                var migrationId = migration.getId();
                migration.shouldMigrate = finishedIds.indexOf(migrationId) <= -1;
                migrations.push(migration);
            });
            cb(migrations);
        });
    });
};

Migrator.prototype.migrate = function (done) {
    var self = this;
    self._getAvailableMigrations(function (migrations) {
            var atLeastOneNew = false;
            var firstMigration = null;
            for (var i = 0, len = migrations.length; i < len; i++) {
                var migration = migrations[i];
                atLeastOneNew = atLeastOneNew || migration.shouldMigrate;
                if (i === 0) {
                    firstMigration = migration;
                }
                self.migrationChain[migration.getId()] = {};
                if (len === i + 1) {
                    self.migrationChain[migration.getId()].executor = self._migrationReport.bind(self, done);
                    self.migrationChain[migration.getId()].migration = null;
                    continue;
                }
                self.migrationChain[migration.getId()].executor = self._migrationExecute.bind(self);
                self.migrationChain[migration.getId()].migration = migrations[i + 1];
            }

            if (!atLeastOneNew) {
                this._logInfo('All migrations up to date');
                done(true);
                return;
            }

            this._logInfo('Starting migrations...');
            self._migrationExecute(firstMigration);
        }.bind(this)
    );
};

Migrator.prototype._next = function (migrationId) {
    var nextChain = this.migrationChain[migrationId];
    nextChain.executor(nextChain.migration);
};

Migrator.prototype._migrationExecute = function (migration) {
    if (!migration) {
        return;
    }
    if (migration.shouldMigrate) {
        migration.execute(this._migrationDone.bind(this));
    } else {
        this._logInfo(migration.getId() + ' CHECK');
        this._next(migration.getId());
    }
};

Migrator.prototype._migrationDone = function (migration, err) {
    var self = this;
    self.counterTotal++;
    var result = {
        _id: migration.getId(),
        success: true
    };
    if (err) {
        this._logError("Error occured: " + err);
        self.counterFailed++;
        result.success = false;
        result.error = err;
    }
    this._logInfo(result._id + ' ' + (result.success ? 'SUCCESS' : 'FAILED'));
    self.db.collection(self.migrationCollection).updateOne({_id: result._id}, result, {upsert: true}, function () {
        self._next(migration.getId());
    });
};

Migrator.prototype._migrationReport = function (done) {
    if (this.counterFailed > 0) {
        this._logError('Migrations finished unsuccessfully');
        this._logError('Failed migrations count: ' + this.counterFailed);
        done(false);
    } else {
        this._logInfo('Migrations finished successfully');
        done(true);
    }
};

Migrator.prototype._logInfo = function (message) {
    if (this.logLevels.indexOf("INFO") > -1) {
        console.log(message);
    }
};

Migrator.prototype._logError = function (message) {
    if (this.logLevels.indexOf("ERROR") > -1) {
        console.error(message);
    }
};

module.exports = Migrator;