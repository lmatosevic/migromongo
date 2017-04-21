var fs = require('fs');
var Migration = require('./migration');

function Migrator(db, config) {
    this.db = db;
    this.migrationDir = __dirname + '/' + config['directory'];
    this.migrationCollection = config['collection'];

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

Migrator.prototype.getAllMigrations = function (cb) {
    var self = this;
    fs.readdir(self.migrationDir, function (err, files) {
        var migrations = [];
        files.sort().forEach(function (file) {
            migrations.push(new Migration(require(self.migrationDir + file), self.db));
        });
        cb(migrations);
    });
};

Migrator.prototype.getFinishedMigrations = function (cb) {
    this.db.collection(this.migrationCollection).find({success: true}, {_id: true}).toArray(function (err, migrations) {
        cb(migrations);
    });
};

Migrator.prototype.getAvailableMigrations = function (cb) {
    var self = this;
    self.getAllMigrations(function (allMigrations) {
        self.getFinishedMigrations(function (finishedMigrations) {
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

Migrator.prototype.migrate = function () {
    var self = this;
    self.getAvailableMigrations(function (migrations) {
            var atLeastOneNew = false;
            var firstMigration = null;
            for (var i = 0, len = migrations.length; i < len; i++) {
                var migration = migrations[i];
                atLeastOneNew = atLeastOneNew || migration.shouldMigrate;
                if (i == 0) {
                    firstMigration = migration;
                }
                self.migrationChain[migration.getId()] = {};
                if (len == i + 1) {
                    self.migrationChain[migration.getId()].executor = self._migrationReport.bind(self);
                    self.migrationChain[migration.getId()].migration = null;
                    continue;
                }
                self.migrationChain[migration.getId()].executor = self._migrationExecute.bind(self);
                self.migrationChain[migration.getId()].migration = migrations[i + 1];
            }

            if (!atLeastOneNew) {
                console.log('All migrations up to date');
                return;
            }

            console.log('Starting migrations');
            self._migrationExecute(firstMigration);
        }
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
        console.log(migration.getId() + ' CHECK');
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
        self.counterFailed++;
        result.success = false;
        result.error = err;
    }
    console.log(result._id + ' ' + (result.success ? 'SUCCESS' : 'FAILED'));
    self.db.collection(self.migrationCollection).save(result, function () {
        self._next(migration.getId());
    });
};

Migrator.prototype._migrationReport = function () {
    if (this.counterFailed > 0) {
        console.error('Migrations finished unsuccessfully');
        console.error('Failed migrations count: ' + this.counterFailed);
    } else {
        console.log('Migrations finished successfully');
    }
};

module.exports = Migrator;