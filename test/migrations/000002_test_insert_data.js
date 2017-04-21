module.exports.id = '000002_test_insert_data';

module.exports.execute = function (checkEnd) {
    this.db.collection('test').insertOne({name: "test", value: 1}, checkEnd);
};

module.exports.operations = 1;