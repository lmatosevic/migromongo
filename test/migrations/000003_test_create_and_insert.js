module.exports.id = '000003_test_create_and_insert';

module.exports.execute = function (checkEnd) {
    this.db.createCollection('test_coll', function (err, collection) {
        collection.insertOne({name: "test3", value: 3}, checkEnd);
    });

    this.db.collection('test').insertOne({name: "test2", value: 2}, checkEnd);
};

module.exports.operations = 2;