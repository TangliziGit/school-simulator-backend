const router = require('express').Router();
const Response = require('../models/response');

router.post('/', (req, res, next) => {
    const uid = req.query.uid;
    req.session.uid = uid;
    res.send(Response.ok(uid, 'Login successfully'));
});

router.delete('/', (req, res, next) => {
    delete req.session.uid;
    res.send(Response.ok(null, 'Logout successfully'));
});

module.exports = router;