osrm-isochrone-server
---

Add a nodejs webserver in front of [osrm-isochrone](https://github.com/mapbox/osrm-isochrone). Expose isochrone computed by [OSRM](http://project-osrm.org/) to HTTP.

##Install
```sh
npm install
```

##Run
```sh
node server.js --osrm path-to-osrm-file --port 1723
```

or using a shared-memory OSRM pre-loaded data

```sh
node server.js --port 1723
```

##API
KISS:
* /0.1/isochrone?lat=LAT&lng=LNG&size=TIME

TIME is in second.

##Config
The server uses [node-config](https://github.com/lorenwest/node-config) to set some inputs.
An example of json config file (where maxspeed is in km/h, resolution is the number/density of points used in grid for isochrone):
```
{
  "resolution": 75,
  "maxspeed": 104
}
```
The config directory can be specified thanks to node-config: https://github.com/lorenwest/node-config/wiki/Environment-Variables#node_config_dir
