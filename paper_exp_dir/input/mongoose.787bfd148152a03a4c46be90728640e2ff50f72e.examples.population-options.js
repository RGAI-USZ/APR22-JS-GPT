
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
}, {
name: 'Super Nintendo'
, manufacturer: 'Nintendo'
, released: 'August 23, 1991'
}, {
name: 'XBOX 360'
, manufacturer: 'Microsoft'
, released: 'November 22, 2005'
}, function (err, nintendo64, superNintendo, xbox360) {
if (err) return done(err);

Game.create({
name: 'Legend of Zelda: Ocarina of Time'
, developer: 'Nintendo'
, released: new Date('November 21, 1998')
, consoles: [nintendo64]
}, {
name: 'Mario Kart'
, developer: 'Nintendo'
, released: 'September 1, 1992'
, consoles: [superNintendo]
}, {
name: 'Perfect Dark Zero'
, developer: 'Rare'
, released: 'November 17, 2005'
, consoles: [xbox360]
}, function (err) {
if (err) return done(err);
example();
})
})
}



function example () {
Game
.find({})
.populate({
path: 'consoles'
, match: { manufacturer: 'Nintendo' }
, select: 'name'
, options: { comment: 'population' }
})
.exec(function (err, games) {
if (err) return done(err);

games.forEach(function (game) {
console.log(
'"%s" was released for the %s on %s'
, game.name
, game.consoles.length ? game.consoles[0].name : '??'
, game.released.toLocaleDateString());
})

return done();
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
