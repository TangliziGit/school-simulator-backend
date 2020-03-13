const Response = function(success, payload, message, time = Date.now()) {
    this.success = success;
    this.payload = payload;
    this.message = message;
    this.time = time;
};

exports.ok = (payload, message) => new Response(true, payload, message);
exports.fail = (message) => new Response(false, null, message);
exports.create = (success, payload, message, time = Date.now()) =>
    new Response(success, payload, message, time);
