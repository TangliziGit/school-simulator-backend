const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema({
    id: {type: String, default: () => Date.now().toString()},
    uid: {type: String},
    title: {type: String, maxlength: 100},
    description: {type: String, default: '', maxlength: 400},
    start: {type: Date},
    end: {type: Date}
});

EventSchema.path('uid').required(true, 'Event user id is necessary');
EventSchema.path('title').required(true, 'Event title is necessary');
EventSchema.path('start').required(true, 'Event start time is necessary');
EventSchema.path('end').required(true, 'Event end time is necessary');

// check time collision
EventSchema.pre('save', function(next) {
    const self = this;

    EventModel.count({'start': {$lte: self.start}, 'end': {$gt: self.start}}, (err, count) => {
        EventModel.count({'start': {$gt: self.start, $lt: self.end}}, (err2, count2) => {
            if (count2 === 0 && count === 0) next();
            else next(new Error('time collision'));
        });
    });
});

EventSchema.methods = {
    update: function(event) {
        Object.assign(this, event);
        return this.save();
    }
};

const EventModel = mongoose.model('Event', EventSchema);
