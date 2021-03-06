
var mongoose = require('mongoose')
var Schema = mongoose.Schema;

console.log('Running mongoose version %s', mongoose.version);



var consoleSchema = Schema({
name: String
, manufacturer: String
, released: Date
})
var Console = mongoose.model('Console', consoleSchema);



var gameSchema = Schema({
name: String
, developer: String
, released: Date
, consoles: [{ type: Schema.Types.ObjectId, ref: 'Console' }]
})
var Game = mongoose.model('Game', gameSchema);



mongoose.connect('mongodb://localhost/console', function (err) {

if (err) throw err;


createData();
})



function createData () {
Console.create({
name: 'Nintendo 64'
, manufacturer: 'Nintendo'
, released: 'September 29, 1996'
}, function (err, nintendo64) {
if (err) return done(err);

Game.create({
name: 'Legend of Zelda: Ocarina of Time'
, developer: 'Nintendo'
, released: new Date('November 21, 1998')
, consoles: [nintendo64]
}, function (err) {
if (err) return done(err);
example();
})
})
}



function example () {
Game
.findOne({ name: /^Legend of Zelda/ })
.populate('consoles')
.exec(function (err, ocinara) {
if (err) return done(err);

console.log(
'"%s" was released for the %s on %s'
, ocinara.name
, ocinara.consoles[0].name
, ocinara.released.toLocaleDateString());

done();
})
}

function done (err) {
if (err) console.error(err);
Console.remove(function () {
Game.remove(function () {
mongoose.disconnect();
})
})
}
