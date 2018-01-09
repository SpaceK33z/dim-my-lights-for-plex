const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const got = require('got');
const SunCalc = require('suncalc');
const { addDays, addHours, isWithinRange } = require('date-fns');

dotenv.config({
    path: process.env.ENV_FILE || '.env',
});

const lightGroups = (process.env.HUE_GROUP_ID || '').split(',');
const theaterScenes = (process.env.HUE_SCENE_THEATER || '').split(',');
const dimmedScenes = (process.env.HUE_SCENE_DIMMED || '').split(',');

if (lightGroups.length !== theaterScenes.length || lightGroups.length !== dimmedScenes.length) {
    throw new Error('The env variables HUE_GROUP_ID, HUE_SCENE_THEATER and HUE_SCENE_DIMMED should have the same amount of values (comma-separated)');
}

var app = express();
var upload = multer({ dest: '/tmp/' });
// Allows to easily modify the current time to test things
const now = () => new Date();

function isDarkOutside() {
    const latlng = process.env.SUN_LATLNG;
    if (!latlng) {
        return true;
    }
    const [latitude, longitude] = latlng.split(',');

    const sunriseDate = SunCalc.getTimes(now(), latitude, longitude).sunrise;
    const sunsetDate = SunCalc.getTimes(now(), latitude, longitude).sunset;

    return !isWithinRange(now(), sunriseDate, addHours(sunsetDate, 1));
}

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
        if (!isDarkOutside()) {
            console.log('Skip toggling lights because it is not yet dark outside');
            return;
        }

        const requests = lightGroups.map((lightGroup, i) => {
            const scene = event === PLAY || event === RESUME
                ? theaterScenes[i] // Turn the lights off because it's playing
                : dimmedScenes[i]; // Turn the lights on because it's not playing

            // Construct Hue API body
            const body = {
                bridgeId: process.env.HUE_BRIDGE_ID,
                clipCommand: {
                    url: `/api/0/groups/${lightGroup}/action`,
                    method: 'PUT',
                    body: scene === 'off' ? { on: false } : { scene }
                }
            };
    
            return got.post(`https://www.meethue.com/api/sendmessage?token=${process.env.HUE_TOKEN}`, {
                body: `clipmessage=${JSON.stringify(body)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
        });

        Promise.all(requests)
        .then((res) => {
            console.log('Successfully toggled lights');
        });
    }

    res.sendStatus(200);
});

app.listen(process.env.PORT);
