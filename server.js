var async = require('async'),
    express = require('express'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    restful = require('node-restful'),
    superagent = require('superagent'),
    uuid = require('uuid'),
    _ = require('lodash'),
    mongoose = restful.mongoose;
var app = express();

app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({type:'application/vnd.api+json'}));
app.use(methodOverride());

function mongoURL() {
  var mongoAccessCredentials = (process.env.MONGO_USER ? process.env.MONGO_USER + ':' + process.env.MONGO_PASSWORD + '@' : '');
  var mongoHost = process.env.MONGO_HOST || 'localhost';
  var mongoDB = process.env.MONGO_DB || process.env.APP || 'iths';
  var mongoPort = process.env.MONGO_PORT || '27017';
  var mongoURL = 'mongodb://' + mongoAccessCredentials + mongoHost + ':' + mongoPort + '/' + mongoDB;

  return process.env.MONGO_URL || process.env.MONGOHQ_URL || mongoURL;
}

mongoose.connect(mongoURL());

var Article = app.article = restful.model('article', mongoose.Schema({
    title: String,
    text: String,
    author: String,
    authorEmail: String,
    date: String,
    key: String
  }));

Article
  .methods(['get', 'post', 'put', 'delete'])
  .route('generate', {
    handler: function(req, res, next) {
      // req.params.id holds the resource's id
      res.send("Key: " + uuid.v4());
    }
  })
  .before('get', enableCORS)
  .before('post', enableCORS)
  .before('put', enableCORS)
  .before('delete', enableCORS)
  .before('get', ensureKey)
  .before('post', ensureKey)
  .before('put', ensureKey)
  .before('delete', ensureKey)
  .before('get', addIfMissing)
  .before('post', function(req, res, next) {
    console.log(req);
    if(req.query && req.query.key) {
      if(!req.body) req.body = {};

      req.body.key = req.query.key;
    }

    next();
  })
  .after('get', function (req, res, next) {
    // Something random which nobody will ever pass as key
    var key = uuid.v4() + uuid.v4();

    if(req.query) {
      key = req.query.key;
    }

    var data = res.locals.bundle;

    function removeId(item) {
      delete item.key;
      return item;
    }

    if(_.isArray(data)) {
      data = _.map(data, removeId);
      data = _.filter(data, (item) => item.key === key);
    } else {
      data = removeId(data);
    }

    res.locals.bundle = data;
    next();
  });

function addIfMissing(req, res, next) {
  var key = req.query.key;
  var articles = [
    {
      "title": "Hej svejs",
      "text":  "Artikel nummer 1. <br>Hejsan hoppsan, falleralleraaaa! <b>Fett</b>.<img src=\"http://apike.ca/sites/default/files/styles/large/public/field/image/20121108/totoro-tree.jpg?itok=leDKYGWu\" width=300 height=200/>",
      "author": "Niklas Logren",
      "authorEmail": "niklas@niklaslogren.com",
      "date": "2014-04-05"
    },
    {
      "title": "Sångtext",
      "text": "Nu ska varenda unge vara gla",
      "author": "Niklas Logren",
      "authorEmail": "niklas@niklaslogren.com",
      "date": "2014-04-05"
    },
    {
      "title": "525600",
      "text": "how do you measure a year in the life?",
      "author": "Niklas Logren",
      "authorEmail": "niklas@niklaslogren.com",
      "date": "2014-04-05"
    },
    {
      "title": "massive attack",
      "text": "Make the flowers blossom",
      "author": "Niklas Logren",
      "authorEmail": "niklas@niklaslogren.com",
      "date": "2014-04-05"
    },
    {
      "title": "monster",
      "text": "and slowly, you come to realise",
      "author": "Niklas Logren",
      "authorEmail": "niklas@niklaslogren.com",
      "date": "2014-04-05"
    }
  ];

  var query = Article.findOne({key: key});

  query.exec(function (err, article) {
    if(article) return next();
    var fns = _.map(articles, function (article) {
      article.key = key;

      return (function (article) {
        return function (done) {
          var a = new Article(article);

          a.save(done);
        }
      })(article);
    });

    async.parallel(fns, function (err, res) {
      next();
    });
  });
}

function ensureKey(req, res, next) {
  if(!req.query || !req.query.key) return res.send(404);

  next();
}

function enableCORS(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  next();
}

Article.register(app, '/articles');

app.listen(process.env.PORT || 3000);
