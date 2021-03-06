function initAutocomplete(lat, lng) {
  console.log(document.getElementById('map'));
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: lat,
      lng: lng,
    },
    zoom: 10,
    mapTypeId: 'roadmap',
    mapTypeControl: false,
    styles: styles,
    streetViewControl: false,
  });
  window.map = map;
  // [name, date, location, lat, lng, type]

  // Create the search box and link it to the UI element.
  var wrapper = document.getElementById('pac-wrapper');
  var input = document.getElementById('pac-input');

  function updateMap(controller) {
    var appElement = document.querySelector('#map');
    var $scope = angular.element(appElement).scope();
    var controller = controller || $scope.search || {query: {}};

    var b = map.getBounds();
    if (!b) {
      console.error('map bounds missing');
    }

    controller.query['status'] = 'visible';
    controller.query["location.coordinates.lat"] = {
      "$gt": Math.min(b.f.f, b.f.b),
      "$lt": Math.max(b.f.f, b.f.b),
    };
    controller.query["location.coordinates.lng"] = {
      "$gt": Math.min(b.b.b, b.b.f),
      "$lt": Math.max(b.b.b, b.b.f),
    };
    var r = new Request(window.apiurl + 'race?limit=100000&query='+JSON.stringify(controller.query));
    fetch(r).then(function(response) {
      return response.json()
    }).then(function(json) {
      races = json;

      var appElement = document.querySelector('#map');
      var $scope = angular.element(appElement).scope();
      $scope.$apply(function() {
        races = $scope.search.updateRaces(races);
        updateMarkers();
      });
    });
  }
  window.updateMap = updateMap;

  var mapElement = $('#map');
  mapElement.addClass('scrolloff'); // set the pointer events to none on doc ready
  $('#map-container').on('click', function () {
    mapElement.removeClass('scrolloff');
  });
  $('#map-container').mouseleave(function () {
    mapElement.addClass('scrolloff');
  });

  map.addListener('bounds_changed', updateMap);

  var lastWindow = null;
  var prevClusterer = null;

  function updateMarkers() {
    if (prevClusterer) {
      prevClusterer.clearMarkers();
    }

    var race_markers = races.map(function(race, i) {
      position = {
        'lat': parseFloat(race.location.coordinates.lat) + (pseudoRandom(race, 31)-.5) / 50,
        'lng': parseFloat(race.location.coordinates.lng) + (pseudoRandom(race, 71)-.5) / 50
      }
      var icon = {
        labelOrigin: new google.maps.Point(15, 40),
        url: '/imgs/mapiconA2x.png',
        scaledSize: new google.maps.Size(20, 34),
      }
      m = new google.maps.Marker({
        icon: icon, //'http://api.racepass.com/static/concepts/images-dark/pin2.png',
        position: position,
        label: race[0]
      });

      race.temp = {
        'marker': m,
        'map': map,
      }

      m.addListener('mouseover', function() {
        var appElement = document.querySelector('#map');
        var $scope = angular.element(appElement).scope();
        $scope.$apply(function() {
          $scope.search.selectRace(race);
        });
      });

      m.addListener('click', function() {
        var appElement = document.querySelector('#map');
        var $scope = angular.element(appElement).scope();
        $scope.$apply(function() {
          $scope.search.selectRace(race);
        });
      });

      return m;
    });

    prevClusterer = new MarkerClusterer(map, race_markers, {
      imagePath: '/imgs/markers/m',
      gridSize: 100,
      maxZoom: 6,
    });
  }
}

$(function() {
  if (localStorage.lat) {
    initAutocomplete(parseFloat(localStorage.lat), parseFloat(localStorage.lng));
  }
});
