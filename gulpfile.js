var dateFormat = require('dateformat');
var fs = require('fs');
var gulp = require('gulp');
var secrets = require('./secrets.json');

gulp.task('default', function () {});
gulp.task('fetch-all', [
  'fetch-goodreads',
  'fetch-spotify',
  'fetch-strava'
]);
gulp.task('fetch-goodreads', function (cb) {
  let books = [];
  let currentPage = 1;
  const https = require('https');
  const xml2js = require('xml2js');
  let totalPages = 1;




  const getRequest = new Promise((resolve, reject) => {
    let parser = new xml2js.Parser();
    let tmp = [];

    return https.get(`https://www.goodreads.com/review/list/76558.xml?key=${secrets.goodreads.key}&v=2&page=${currentPage}&per_page=200shelf=read`, (response) => {
      response.on('data', chunk => tmp.push(chunk));
      response.on('end', e => {
        return parser.parseString(tmp.join(''));
      });
      response.setEncoding('utf8');

      return parser.on('end', result => resolve(result));
    }).end();
  });
  const handleResponse = (response) => {
    const obj = response.GoodreadsResponse.reviews[0];

    books = books.concat(obj.review);
    totalPages = Math.ceil(obj.$.total / 200);

    if (currentPage < totalPages) {
      currentPage++;
      getRequest.then(handleResponse);
    } else {
      cleanedBooks.pu


      fs.writeFile('_data/books.json', JSON.stringify(books), function (error) {
        if (error) {
          return console.log('Error: ' + error);
        }

        cb();
      });
    }
  };

  getRequest.then((response) => {
    handleResponse(response);
  });
});
gulp.task('fetch-spotify', function (cb) {
  var SpotifyApi = require('spotify-web-api-node');
  var spotify = new SpotifyApi({
    clientId: secrets.spotify.client_id,
    clientSecret: secrets.spotify.client_secret
  });

  spotify.clientCredentialsGrant()
    .then(function (data) {
      return data.body['access_token'];
    })
    .then(function (accessToken) {
      spotify.setAccessToken(accessToken);
      spotify.getUserPlaylists('nateirwin', {
        limit: 50
      })
        .then(function (data) {
          return data.body.items;
        })
        .then(function (playlists) {
          var accept = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
          ];
          var count = 0;
          var i = playlists.length;

          console.log(i + ' playlists retrieved (out of 50 maximum in the request)');

          while (i--) {
            var name = playlists[i].name;
            var valid = false;

            for (var j = 0; j < accept.length; j++) {
              if (name.indexOf(accept[j]) > -1) {
                valid = true;
                break;
              }
            }

            if (!valid) {
              playlists.splice(i, 1);
            }
          }

          playlists.forEach(function (playlist) {
            spotify.getPlaylist('nateirwin', playlist.id)
              .then(function (data) {
                playlist.tracks = data.body.tracks.items;

                count++;

                if (count === playlists.length) {
                  fs.writeFile('_data/playlists.json', JSON.stringify(playlists), function (error) {
                    if (error) {
                      return console.log('Error: ' + error);
                    }

                    cb();
                  });
                }
              });
          });
        });
    });
});
gulp.task('fetch-strava', function (cb) {
  var polyline = require('polyline');
  var strava = require('strava-v3');

  strava.athlete.listActivities({
    access_token: secrets.strava.access_token
  }, function (error, data) {
    var json;

    if (error) {
      throw new Error(JSON.stringify(error));
    }

    for (var i = 0; i < data.length; i++) {
      var obj = data[i];
      var summaryPolyline = obj.map.summary_polyline;

      if (summaryPolyline) {
        var latLngs = polyline.decode(summaryPolyline);
        var reversedLatLngs = [];

        for (var j = 0; j < latLngs.length; j++) {
          var latLng = latLngs[j];

          reversedLatLngs.push([latLng[1], latLng[0]]);
        }

        obj.formattedDate = dateFormat(new Date(obj.start_date), 'mm-dd-yyyy, h:MM TT');
        obj.map.latLngs = reversedLatLngs;
      }
    }

    json = JSON.stringify(data);

    fs.writeFile('_data/activities.json', json, function (error) {
      if (error) {
        return console.log('Error: ' + error);
      }

      fs.writeFile('active/assets/data/activities.json', json, function (error) {
        var regex = /<span class="updated"(.*?)>(.*?)<\/span>/;
        var replace = require('gulp-replace');

        if (error) {
          return console.log('Error: ' + error);
        }

        gulp.src([
          'active/index.html'
        ])
          .pipe(replace(regex, '<span class="updated">' + dateFormat(new Date(), 'mmmm d, yyyy') + '</span>'))
          .pipe(gulp.dest('active/.'));
      });
    });
  });
});
