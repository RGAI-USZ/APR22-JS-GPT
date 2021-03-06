


var users = [
{ name: 'TJ', email: 'tj@vision-media.ca' }
, { name: 'Tobi', email: 'tobi@vision-media.ca' }
];

exports.list = function(req, res){
res.render('user/list', {
locals: {
title: 'Users'
, users: users
}
});
};

exports.load = function(req, res, next){
var id = req.params.id;
req.user = users[id];
if (req.user) {
next();
} else {
next(new Error('cannot find user ' + id));
}
};

exports.view = function(req, res){
res.render('user/view', {
locals: {
title: 'Viewing user ' + req.user.name
, user: req.user
}
});
};

exports.edit = function(req, res){
res.render('user/edit', {
locals: {
title: 'Editing user ' + req.user.name
, user: req.user
}
});
};
