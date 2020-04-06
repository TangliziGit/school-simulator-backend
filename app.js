const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const logger = require('morgan');
const fs = require('fs');

const app = express();

// start up models
require('./models/event');

// use components
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'wechat_app_secret',
    resave: true,
    saveUninitialized: true
}));

// use routers
app.use('/events', require('./routes/events'));
app.use('/sessions', require('./routes/sessions'));
app.use('/courses', require('./routes/courses'));

// module.exports = app;
const listen = () => app.listen(3000);
const connect = () => {
    mongoose.connection
        .on('error', console.log)
        .on('disconnected', connect)
        .once('open', listen);
    return mongoose.connect('mongodb://localhost:27017/mini');
};

connect();
