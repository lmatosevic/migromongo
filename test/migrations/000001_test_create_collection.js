module.exports.id = '000001_test_create_collection';

module.exports.execute = function (checkEnd) {
    this.db.createCollection('test', checkEnd);
};

module.exports.operations = 1;