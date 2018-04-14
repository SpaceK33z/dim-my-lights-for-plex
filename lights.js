const dotenv = require('dotenv');
const got = require('got');

dotenv.config({
  path: process.env.ENV_FILE || '.env',
});

const lightGroups = (process.env.HUE_GROUP_ID || '').split(',');
const theaterScenes = (process.env.HUE_SCENE_THEATER || '').split(',');
const dimmedScenes = (process.env.HUE_SCENE_DIMMED || '').split(',');

if (
  lightGroups.length !== theaterScenes.length ||
  lightGroups.length !== dimmedScenes.length
) {
  throw new Error(
    'The env variables HUE_GROUP_ID, HUE_SCENE_THEATER and HUE_SCENE_DIMMED should have the same amount of values (comma-separated)'
  );
}

module.exports = function(turnOff) {
  const requests = lightGroups.map((lightGroup, i) => {
    // Turn the lights off because it's playing
    // Turn the lights on because it's not playing
    const scene = turnOff ? theaterScenes[i] : dimmedScenes[i];

    console.log('OKAY', scene);

    // Construct Hue API body
    const body = scene === 'off' ? { on: false } : { scene };

    return got.put(
      `${process.env.HUE_URL}/api/${
        process.env.HUE_TOKEN
      }/groups/${lightGroup}/action`,
      {
        body,
        json: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  });

  Promise.all(requests).then(res => {
    console.log('Successfully toggled lights');
  });
};
