const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const got = require('got');
const SunCalc = require('suncalc');
const { format, addDays, addHours, isWithinRange } = require('date-fns');

dotenv.config({
    path: process.env.ENV_FILE || '.env',
});

var app = express();
var upload = multer({ dest: '/tmp/' });

function isDarkOutside() {
    const latlng = process.env.SUN_LATLNG;
    if (!latlng) {
        return true;
    }
    const [latitude, longitude] = latlng.split(',');

    const now = addHours(new Date(), 1);
    const tomorrow = addDays(new Date(), 1);
    const duskDate = SunCalc.getTimes(now, latitude, longitude).sunset;
    const sunriseDate = SunCalc.getTimes(tomorrow, latitude, longitude).sunrise;

    return isWithinRange(now, duskDate, sunriseDate);
}
console.log('asdf', isDarkOutside());

// Plex webhook event constants
const PLAY = 'media.play';
const PAUSE = 'media.pause';
const RESUME = 'media.resume';
const STOP = 'media.stop';

const PLEX_RELEVANT_TYPES = ['movie', 'episode'];

app.post('/plex_webhook', upload.single('thumb'), function(req, res, next) {
    var payload = JSON.parse(req.body.payload);

    const { event, Player, Metadata } = payload;
    console.log('Plex webhook:', Metadata.type, event, 'player uuid:', Player.uuid);

    if (
        process.env.PLEX_PLAYER_UUID === Player.uuid && // Event came from the correct player
        PLEX_RELEVANT_TYPES.includes(Metadata.type) && // Event type is from a movie
        ([PLAY, STOP, PAUSE, RESUME].includes(event)) // Event is a valid type
    ) {
        // If it is not dark outside, we don't care about dimming the lights.
        if (!isDarkOutside()) {
            return;
        }
        const scene = event === PLAY || event === RESUME
        ? process.env.HUE_SCENE_THEATER // Turn the lights off because it's playing
        : process.env.HUE_SCENE_DIMMED; // Turn the lights on because it's not playing
        // Construct Hue API body
        const body = `clipmessage={ bridgeId: "${process.env
            .HUE_BRIDGE_ID}", clipCommand: { url: "/api/0/groups/${process.env
            .HUE_GROUP_ID}/action", method: "PUT", body: { scene: "${scene}" } } }`;

        got.post(`https://www.meethue.com/api/sendmessage?token=${process.env.HUE_TOKEN}`, {
            body,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })
        .then((res) => {
            console.log('Succesfull api response', res.body);
        })
    }

    res.sendStatus(200);
});

app.listen(process.env.PORT);
