const Response = require('../models/response');

const validSession = (req, res, callback) => {
    if (req.session.hasOwnProperty('uid'))
        callback();
    else
        callback(); // res.status(403).send(Response.fail('Please login'));
};

module.exports = {
    validSession: validSession
};
