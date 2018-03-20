# migromongo
> A nodeJS library for performing migrations on Mongo database.

## Installation

Install library into your project using Node package manager (NPM).

```sh
npm install migromongo --save
```

## Usage

### Migration file
This is a very simple and easy to use node library for performing forward only database migrations on MongoDB.
Every migration must be in separate javascript file with unique name (e.g. 00001_create_users_collection.js) and inside the same directory. Also every migration file needs to export following objects:
* **id** -- some unique value, recommended is migration file name (e.g. "00001_create_users_collection")
* **execute** -- function which performs all kind of database operations, has one argument "checkEnd" which is function which *must* be called at the *end of every database operation* so the migratior can know when all operations are finished 
* **operations** -- number of operations performed on database in execute function

Example of migration file:
``` javascript
module.exports.id = '000001_create_users_and_posts_collection';

module.exports.execute = function (checkEnd) {
    this.db.createCollection('users', function (err, collection) {
        collection.insertOne({username: 'John', email: 'john@email.com', age: 35}, checkEnd);
    });
    this.db.createCollection('posts', {'capped': true, 'size': 1024}, checkEnd);
};

module.exports.operations = 2;
```
All files must be placed in the same directory inside the project so migrator can execute them in the provided order.

### Starting migrations
In order to start migrations an existing MongoDB connection must be established first, which is then passed to migrator through object constructors first argument. Second argument is configuration map with following values:
* **directory** -- path to the directory which contains all of the migration files described above (default: project root)
* **collection** -- name of the collection which will contain informations about performed migrations (default: _migrations)
* **logLevels** -- type of messages to log into the console during migrations, (default: ['INFO', 'ERROR']), for no console logging pass empty array '[]'

Example usage:
``` javascript
const mongo = require('mongodb').MongoClient;
const Migromongo = require('migromongo');

mongo.connect('mongodb://localhost:27017/databaseName', function (err, db) {
   var migromongo = new Migromongo(db, {directory: '../migrations/', collection: '_migrations', logLevels: ['INFO', 'ERROR']});
   migromongo.migrate(function (success) {
        console.log('Migrations finished ' + (success ? 'successfully' : 'unsuccessfully'));
   });
}
```
Already executed migrations (stored in migrations collection) will be ignored in the next iterations, only newly added will be executed.

License
----

MIT