const express = require('express');
const router = express.Router();
const only = require('only');
const Event = require('mongoose').model('Event');
const Response = require('../models/response');

const validSession = (req, res, callback) => {
    if (req.session.hasOwnProperty('uid')) callback();
    else res.status(403).send(Response.fail('Please login'));
};

const findByIdAndUid = (req, res, callback) =>
    validSession(req, res, () => Event.find({id: req.params.id, uid: req.session.uid}, callback));
const findByUid = (req, res, callback) =>
    validSession(req, res, () => Event.find({uid: req.session.uid}, callback));

router.get('/', (req, res, next) =>
    findByUid(req, res, (err, events) => res.send(Response.ok(events))));

router.get('/:id', (req, res, next) => findByIdAndUid(req, res, (err, events) => {
    if (events.length === 0)
        res.send(Response.fail('no such event'));
    else
        res.send(Response.ok(events[0]))
}));

router.post('/', (req, res, next) => validSession(req, res, () => {
    const event = new Event(only(req.query, 'title description start end'));
    event.uid = req.session.uid;
    event.save({}, (err) => {
        if (err)
            res.status(404).send(Response.fail(err.message));
        else
            res.status(201).send(Response.ok(event, 'event created'))
    });
}));

router.put('/:id', (req, res, next) => findByIdAndUid(req, res, (err, event) => {
    event[0].update(only(req.query, 'title description start end'));
    res.send(Response.ok(event, 'event updated'));
}));

router.delete('/:id', (req, res, next) => findByIdAndUid(req, res, (err, events) =>
    events[0].remove((err) => res.send(Response.ok(null, 'Event has been removed')))
));

module.exports = router;
