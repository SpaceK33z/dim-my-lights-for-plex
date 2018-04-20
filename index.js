const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const got = require('got');
const SunCalc = require('suncalc');
const { addDays, addHours, isWithinRange } = require('date-fns');

dotenv.config({
  path: process.env.ENV_FILE || '.env',
});

const toggleLights = require('./lights');

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
  console.log(
    'Plex webhook:',
    Metadata.type,
    event,
    'player uuid:',
    Player.uuid
  );

  if (
    process.env.PLEX_PLAYER_UUID === Player.uuid && // Event came from the correct player
    PLEX_RELEVANT_TYPES.includes(Metadata.type) && // Event type is from a movie
    [PLAY, STOP, PAUSE, RESUME].includes(event) // Event is a valid type
  ) {
    const turnOff = event === PLAY || event === RESUME;
    if (turnOff) {
      toggleLights(true);
      return res.sendStatus(200);
    }
    if (!isDarkOutside()) {
      console.log('Skip toggling lights because it is not yet dark outside');
      return res.sendStatus(200);
    }
    toggleLights(false);
  }

  res.sendStatus(200);
});

app.listen(process.env.PORT);
