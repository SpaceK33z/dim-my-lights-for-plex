# Dim My Lights For Plex

I have [Philips Hue Lights](http://www2.meethue.com/) and a [Plex Media Server](http://plex.tv/). When I start playing a movie or TV show on my TV, I want to automatically dim my lights and turn on lighting again when I press pause.

This package acomplishes exactly that. It is highly inspired by [this blog post](https://hackernoon.com/automate-your-home-theater-lights-from-the-cloud-cdb29a8685a6), with the biggest difference that this doesn't use any external services like AWS. I already have the PC that runs Plex Media Server, so why not run it on that. Furthermore I found that some crucial links in that article weren't working, so I documented everything you need here.

A nice addition is also that the lights only dim when it is dark outside (calculated based on your location).

# Requirements

- Node.js v6+
- npm

# Install

```
mv .env.example .env
npm install
```

Open the `.env` file and fill in the variables;

`HUE_BRIDGE_ID` - go to https://account.meethue.com/bridge and copy/paste the value next to the label "ID".

For the next variables, go to https://my.meethue.com/en-us/my-devices, open the Developer Tools (F12), refresh page, go to the Network tab and search for a request that ends with `/api/0`.

`HUE_TOKEN` - In the "Headers" tab, copy/paste the value after "x-token".

`HUE_SCENE_THEATER` - in the "Preview" tab, click on "scenes" and copy/paste the id from the scene you want to use when Plex is playing.

`HUE_SCENE_DIMMED` - in the "Preview" tab, click on "scenes" and copy/paste the id from the scene you want to use when Plex is stopped.

`HUE_GROUP_ID` - in the "Preview" tab, click on "groups" and copy/paste the id from the group of Hue lights you want to use.

With `PLEX_PLAYER_UUID` we can configure which player should trigger the lights to be dimmed. To know the uuid of e.g. an Apple TV or Plex Media Player, we first need to run this server.

`SUN_LATLNG` - optional; if you set this to your latitude and longitude (ex; `51.438397,5.477039`), it will only dim your lights if it is dark outside.

<hr />

Run the service with `node index.js`.

Now you need to get Plex to post its data to your server. Learn how to do that here: https://support.plex.tv/hc/en-us/articles/115002267687-Webhooks. By default this service will run on port 12000.

An example of the webhook URL: `https://12.34.56.78:12000/plex_webhook`.

After you have configured this, Plex should start posting data to your service. On the Plex player that you want to use, start playing a random movie and hit pause. In the terminal that is running, you should now see something like this:

```
movie media.play player uuid: adzd24d3a32s3dx2k1f3avjk
movie media.stop player uuid: adzd24d3a32s3dx2k1f3avjk
```

Copy this player uuid, open `.env` and paste this value in `PLEX_PLAYER_UUID`.

Restart the service and play a random movie again. The lights should now dim automatically!

## Bonus

If you run a web server on your server you can optionally proxy the service, e.g. with nginx:

```
location /plex_webhook {
    proxy_pass http://127.0.0.1:12000;
    include proxy_params;
}
```

This way you don't have to change your IP address time via the Plex interface.
