const express = require('express');
const app = express();
const { MongoClient } = require('mongodb')
const env = require('dotenv').config()
const URI = process.env.URI
const SECRET = process.env.SECRET
const mongoclient = new MongoClient(URI, { useUnifiedTopology: true });
app.use(express.urlencoded({ extended: false }));
const session = require('express-session')
const MongoDBSession = require("connect-mongodb-session")(session)
 const store = new MongoDBSession({
    uri: URI,
    collection: 'mySessions'
})
app.use(session({
    secret: SECRET,
    resave: false,
    saveUninitialized: false,
    store: store
}))
app.use('/routes/upload', express.static(__dirname + '/routes/upload/'));

mongoclient.connect(async function (err, mongoclient) {
    console.log("Successfully connected to MongoDB!");

    global.mongoclient = mongoclient;

    let port = 3000;
    app.set('port', port);

    app.set('view engine', 'ejs');
    app.use(express.static('static'));

    require('./router')(app);

    app.listen(port, () => console.info(`Listening on port ${port}`));
})
