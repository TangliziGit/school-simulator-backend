const _ = require('lodash');
const fs = require('fs');
const moment = require('moment');
const only = require('only');
const Event = require('mongoose').model('Event');
const request = require('request');
const xpath = require('xpath');
const parser = require('xmldom').DOMParser;
const router = require('express').Router();
const Response = require('../models/response');
const validSession = require('../util/sessionUtil').validSession;

loginUrl = "http://us.nwpu.edu.cn/eams/login.action";
idsUrl = "http://us.nwpu.edu.cn/eams/courseTableForStd.action";
tableUrl = "http://us.nwpu.edu.cn/eams/courseTableForStd!courseTable.action";
courseStartTimeTable = {
    "1": { hour: 8, minute: 0 },
    "2": { hour: 9, minute: 25 },
    "3": { hour: 10, minute: 30 },
    "4": { hour: 11, minute: 25 },
    "5": { hour: 12, minute: 20 },
    "6": { hour: 13, minute: 5 },
    "7": { hour: 14, minute: 30 },
    "8": { hour: 14, minute: 55 },
    "9": { hour: 16, minute: 0 },
    "10":{ hour: 16, minute: 55 },
    "11":{ hour: 19, minute: 30 },
    "12":{ hour: 19, minute: 55 },
    "13":{ hour: 20, minute: 40 }
};

courseEndTimeTable = {
    "1": { hour: 8, minute: 50 },
    "2": { hour: 10, minute: 10 },
    "3": { hour: 11, minute: 15 },
    "4": { hour: 12, minute: 10 },
    "5": { hour: 13, minute: 5 },
    "6": { hour: 13, minute: 50 },
    "7": { hour: 15, minute: 20 },
    "8": { hour: 15, minute: 40 },
    "9": { hour: 16, minute: 45 },
    "10":{ hour: 17, minute: 40 },
    "11":{ hour: 20, minute: 20 },
    "12":{ hour: 20, minute: 40 },
    "13":{ hour: 21, minute: 25 }
};

const getCookies = async (form) =>
    new Promise((resolve, reject) => {
        request.post({
            url: loginUrl,
            form: form
        }, (err, resp, html) => {
            let cookiesHeader = resp.headers["set-cookie"].join("; ");

            if (err)
                reject(err);
            else
                resolve({"Cookie": /JSESSIONID=[^;]*/.exec(cookiesHeader)[0]});
        });
    });

const getIds = async (cookies) =>
    new Promise((resolve, reject) =>
        request.get({
            url: idsUrl,
            headers: cookies
        }, (err, resp, html) => {
            if (err)
                reject(err);
            else
                resolve(/(?<=bg.form.addInput\(form,"ids",").*(?="\);)/.exec(html)[0]);
        })
    );

const getTable = async (cookies, ids) =>
    new Promise((resolve, reject) =>
        request.post({
            url: tableUrl,
            headers: cookies,
            form: {
                "ignoreHead":"1",
                "setting.kind":"std",
                "ids":ids
            }
        }, (err, resp, html) => {
            let dom = new parser().parseFromString(html.replace(/<html\s.*?>/g, "<html>"));

            const nameMapper = (str) => str.replace(/<.*?>/g, '').trim();
            const courseMapper = (str) => str
                .match(/[a-zA-Z]{3,4}\. [0-9]*?-[0-9]*? \[[0-9]*?-[0-9]*?\]/g);

            let name = xpath.select('(//tbody)[2]/tr/td[4]', dom)
                .map(x => x.toString())
                .map(nameMapper);

            let info = xpath.select('(//tbody)[2]/tr/td[8]', dom)
                .map(x => x.toString())
                .map(courseMapper);


            if (err)
                reject(err);
            else
                resolve([name, info]);
        })
    );

router.post("/", (req, res, next) => validSession(req, res, async () => {
    const uid = req.session['uid'];
    const startDate = req.query['startDate'];
    const cookies = await getCookies({
        "username": req.query['username'],
        "password": req.query['password']
    });

    if (startDate === undefined)
        res.status(404).send(Response.fail('Please enter the date of first course weeks'));
    else {
        let [name, info] = await getIds(cookies)
            .then(ids => getTable(cookies, ids));

        const courses = _.zip(name, info)
            .reduce((xs, x) => {
                let arr = [];

                if (x[1]) for (const rule of x[1]){
                    const weekday = rule.match(/^[^\.]*/)[0];
                    const startWeekNumber =     parseInt(rule.match(/(?<=\[)[0-9]*/)[0]);
                    const endWeekNumber =       parseInt(rule.match(/[0-9]*(?=\])/)[0]);

                    const startCourseNumber =   rule.match(/(?<= )[0-9]*/)[0];
                    const endCourseNumber =     rule.match(/[0-9]*(?= \[)/)[0];

                    for (let i = startWeekNumber; i <= endWeekNumber; i++){
                        let start = moment(startDate, 'YYYY-MM-DD')
                            .add(i , 'weeks')
                            .day(weekday)
                            .set(courseStartTimeTable[startCourseNumber])
                            .toDate();

                        let end = moment(startDate, 'YYYY-MM-DD')
                            .add(i , 'weeks')
                            .day(weekday)
                            .set(courseEndTimeTable[endCourseNumber])
                            .toDate();

                        arr.push({"title": x[0], "description": "", "start": start, "end": end});
                    }
                }

                return xs.concat(arr);
            }, []);

        console.log('courses', courses);
        courses.forEach(x => {
            const event = new Event(x);
            event.uid = uid;
            event.save();
        });

        res.send(Response.ok())
    }
}));

module.exports = router;
