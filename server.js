// Copyright © Mapotempo, 2014-2015
//
// This file is part of Mapotempo.
//
// Mapotempo is free software. You can redistribute it and/or
// modify since you respect the terms of the GNU Affero General
// Public License as published by the Free Software Foundation,
// either version 3 of the License, or (at your option) any later version.
//
// Mapotempo is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.  See the Licenses for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with Mapotempo. If not, see:
// <http://www.gnu.org/licenses/agpl.html>
//
var http = require('http');
var url = require('url');
var querystring = require('querystring');
var config = require('config');
var OSRM = require('osrm');
var isochrone = require('osrm-isochrone');
var argv = require('minimist')(process.argv.slice(2));
var hull = require('hull.js');
var buffer = require('turf-buffer');

console.log('Usage [--osrm file.osrm] [--port 1723]');
var osrm_file = argv['osrm']; // prebuild dc osrm network file
console.log(osrm_file ? 'Booting with file.osrm provided' : 'No file.osrm provided, using shared-memory');

var port = 1723;
if ('port' in argv) {
  port = parseInt(argv['port']);
}

var maxMatrixSize = config.get('maxMatrixSize');
var osrm = osrm_file ? new OSRM(osrm_file) : new OSRM({shared_memory: true, distance_table: maxMatrixSize});

var server = http.createServer(function(req, res) {
  var page = url.parse(req.url).pathname;
  var params = querystring.parse(url.parse(req.url).query);
  console.log(page, params);

  if (page == '/0.1/isochrone') {
    var resolution = config.get('resolution'); // sample resolution, number of points (must be less than square root of maxMatrixSize)
    var time = 300; // 300 second drivetime (5 minutes)
    var location = [-77.02926635742188,38.90011780426885]; // center point

    if ('resolution' in params) {
      resolution = parseInt(params['resolution']);
    }
    if ('time' in params) {
      time = parseInt(params['time']);
    }
    if ('distance' in params) {
      time = parseInt(params['distance']);
      params.distance = true;
    }
    if ('lat' in params) {
      location[1] = parseFloat(params['lat']);
    }
    if ('lng' in params) {
      location[0] = parseFloat(params['lng']);
    }
    if ('approach' in params) {
      params.approach = params.approach.split(',');
    }
    if ('exclude' in params) {
      params.exclude = params.exclude.split(',');
    }

    params.resolution = resolution;
    params.maxspeed = config.get('maxspeed');
    params.unit = 'kilometers';
    params.network = osrm;

    var iso = new isochrone(location, time, params, function(err, drivetime) {
      if (err) {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write(JSON.stringify(err));
        console.log('500 ' + JSON.stringify(err));
      }
      else {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(drivetime));
        console.log('200 Done');
      }
      res.end();
    });
    iso.draw = function(destinations) {
      var points = destinations.features.filter(function(feat) {
        return feat.properties.eta <= time;
      }).map(function(feat) {
        return feat.geometry.coordinates;
      });
      if(params.distance === true) {
        var concavity = 0.0758 * this.sizeCellGrid;
      } else {
        var concavity = 0.0368 * this.sizeCellGrid - 0.0010;
      }
      var result = hull(points, concavity);
      var precisionFloat = config.get('precisionFloat');
      if (precisionFloat) result = result.map(function(coord) {
        return [+coord[0].toFixed(precisionFloat), +coord[1].toFixed(precisionFloat)];
      });
      var result = {
        type: 'FeatureCollection',
        features: [
          buffer({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [result]
            },
            properties: {}
          }, this.sizeCellGrid, 'kilometers')
        ]
      };
      return result;
    };
    iso.getIsochrone();
  } else {
    console.log(404);
    res.writeHead(404);
    res.end();
  }
});

server.listen(port);
console.log('Listen on port ' + port);
