function Migration(migration, db, shouldMigrate) {
    this.migration = migration;
    this.shouldMigrate = shouldMigrate;
    this.db = db;
    this.migration.db = this.db;
    this.operationsCount = this.migration.operations;
}

Migration.prototype.execute = function (done) {
    var self = this;

    var checkEnd = function (err) {
        self.operationsCount--;
        if (err) {
            done(self, err);
        }
        if (self.operationsCount === 0) {
            done(self);
        }
    };

    this.migration.execute(checkEnd);
};

Migration.prototype.getId = function () {
    return this.migration.id;
};

module.exports = Migration;