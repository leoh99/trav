(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : (factory((global.trav = global.trav || {})));
}(this, (function(exports) {

  var data = (function() {
    var features = {};
    var itinerary = {};
    var cache = [];
    return {
      init: function(json1, json2) {
        features = json1.features;
        itinerary = json2.itinerary;
      },
      days: function() {
        return itinerary.days;
      },
      day: function(day) {
        return itinerary.days[day];
      },
      listByDay: function(day) {
        if (!cache[day]) {
          cache[day] = [];
          var tour = itinerary.days[day].tour;
          for (i = 0; i < tour.length - 1; i++) {
            cache[day].push(features[tour[i]]);
          }
        }
        return cache[day];
      },
      feature: function(day, index) {
        var tour = itinerary.days[day].tour;
        return features[tour[index]];
      },
      features: function() {
        return features;
      }
    }
  })();

  var map = (function() {
    var iconBase = "https://maps.gstatic.com/mapfiles/ms2/micons/";
    var icons = {
        "transit": iconBase + "blue.png",
        "food": iconBase + "yellow.png"
      };
    var markers = [];
    var map, geocoder, infowindow;

    function initMap(div) {
      geocoder = new google.maps.Geocoder;
      infowindow = new google.maps.InfoWindow;
      var args = {
        zoom: 15,
        center: new google.maps.LatLng(0, 0),
        zoomControlOptions: {
          style: google.maps.ZoomControlStyle.SMALL,
          fullscreenControl: 'true'
        }
      };
      map = new google.maps.Map(document.getElementById(div), args);
      google.maps.event.addListener(map, 'click', function() {
        infowindow.close();
      });
      showMarkers(data.features());
    }

    var getCurrentLocation = function(callback) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          callback({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }, function() {});
      }
    }

    var getPos = function(f) {
      var pos = f.geometry.coordinates;
      return pos[1] + ',' + pos[0];
    };

    var getIcon = function(f) {
      var cat = f.properties.category;
      return icons[cat];
    };

    var addMarker = function(f) {
      var marker = new google.maps.Marker({
        position: getLatLng(f),
        icon: getIcon(f),
        map: map
      });

      google.maps.event.addListener(marker, 'click', function(event) {
        var link = "#";
        if (f.properties.links.length > 0)
          link = f.properties.links[0].url;
        var info = '<p><a href="' + link + '" target="_blank">' + f.properties.name + '</a></p>';
        infowindow.setContent(info);
        infowindow.setPosition(event.latLng);
        infowindow.setOptions({
          pixelOffset: new google.maps.Size(0, -34)
        });
        infowindow.open(map);
      });
      f['marker'] = marker;
      markers.push(marker);
    }

    function zoomFit(features) {
      if (!map)
        return;
      $.each(markers, function(i, m) {
        m.setLabel('');
        m.setZIndex(10);
        //m.setIcon(dot1);
      });
      var bounds = new google.maps.LatLngBounds();
      $.each(features, function(i, f) {
        f.marker.setLabel("" + i);
        f.marker.setZIndex(15);
        //f.marker.setIcon(dot2);
        bounds.extend(getLatLng(f));
      });

      if (features.length == 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(17);
      } else {
        map.fitBounds(bounds);
      }
    }

    function showMarkers(features) {
      $.each(features, function(idx, obj) {
        addMarker(obj);
      });
    }

    function findLatLng(address, callback) {
      geocoder.geocode({
        'address': address
      }, function(results, status) {
        var ret;
        if (status == 'OK') {
          ret = results[0].geometry.location;
        } else {
          console.log('findLatLng: ' + status);
        }
        callback(ret);
      });
    }

    function findAddress(latlng, callback) {
      geocoder.geocode({
        'location': latlng
      }, function(results, status) {
        var ret;
        if (status === 'OK') {
          if (results[1]) {
            ret = results[1].formatted_address;
          } else {
            console.log('No results found');
          }
        } else {
          console.log('Geocoder failed due to: ' + status);
        }
        callback(ret);
      });
    }

    function calculateRoute(from, to) {
      var directionsDisplay = new google.maps.DirectionsRenderer;
      var directionsService = new google.maps.DirectionsService;
      directionsDisplay.setMap(map);
      directionsService.route({
        origin: from,
        destination: to,
        travelMode: 'TRANSIT'
      }, function(response, status) {
        if (status == 'OK') {
          directionsDisplay.setDirections(response);
        } else {
          console.log('Directions request failed due to ' + status);
        }
      });
    }

    function getLatLng(f) {
      var pos = f.geometry.coordinates;
      return {
        lat: pos[1],
        lng: pos[0]
      };
    }

    function showCurrent() {
      getCurrentLocation(function(pos) {
        map.setCenter(pos);
      });
    }

    function getDirLink(f1, f2) {
      var ret = '#';
      if (f2) {
        ret = 'https://maps.google.com?saddr=' + getPos(f1) +
          '&daddr=' + getPos(f2) + '&dirflg=r';
      }
      return ret;
    }

    return {
      map: map,
      geocoder: geocoder,
      initMap: initMap,
      zoomFit: zoomFit,
      showCurrent: showCurrent,
      getLatLng: getLatLng,
      findLatLng: findLatLng,
      findAddress: findAddress,
      getDirLink: getDirLink,
      calRoute: calculateRoute
    }
  })();

  var utils = (function() {
    var saveFile = function(output, text) {
      var blob = new Blob([text], {
        type: "text/plain"
      });
      var url = window.URL.createObjectURL(blob);

      var link = document.createElement("a");
      link.download = output;
      link.innerHTML = "Save";
      link.href = url;
      link.onclick = destroyClickedElement;
      link.style.display = "none";
      $('#footer2').append(link);
      link.click();
    };

    var destroyClickedElement = function(event) {
      event.target.remove();
    };

    var search = function(data, pp, done) {
      var btn = document.createElement('BUTTON');
      var aIdx = 0;
      var pIdx = 0;
      var arg;
      btn.addEventListener("click", onClick);
      arg = data[0];
      btn.click();

      function onClick() {
        setTimeout(process, 1500);
      }

      function process() {
        pp[pIdx].func(arg, onResult);
      }

      function onResult(r) {
        pp[pIdx].callback(r, data[aIdx]);
        arg = r;
        pIdx++;
        if (pIdx < pp.length) {
          next();
        } else {
          aIdx++;
          if (aIdx < data.length) {
            arg = data[aIdx];
            pIdx = 0;
            next();
          } else {
            allDone(data);
          }
        }
      }

      function next() {
        btn.click();
      }
    }

    function gotLoc(loc, obj) {
      if (loc) {
        obj["geometry"] = {
          "type": "Point",
          "coordinates": [loc.lng(), loc.lat()]
        };
        console.log(obj.geometry.coordinates);
      }
    }

    function gotAddr(address, obj) {
      if (address) {
        console.log(address);
        obj.properties['description'] = address;
      }

    }

    function getLoc(obj, callback) {
      map.findLatLng(obj.properties.name, callback);
    }

    function getAddr(loc, callback) {
      map.findAddress(loc, callback);
    }

    function allDone(data) {
      var json = JSON.parse('{"features": []}');
      json.features = data;
      saveFile('na.json', JSON.stringify(json));
    }

    var getInfo = function(ff) {
      var pp = [{
          "func": getLoc,
          "callback": gotLoc
        },
        {
          "func": getAddr,
          "callback": gotAddr
        }
      ];
      search(ff, pp, allDone)
    }

    var convert = function(text) {
      var ff = [];
      var n = -1;
      var keywords = ["category", "img"];
      $.each(text.split('\n'), function(idx, obj) {
        if (obj && !obj.startsWith("#")) {
          if (obj.startsWith("[")) {
            n++;
            var name = obj.slice(1, -1);
            ff[n] = {
              "type": "Feature",
              "properties": {
                "id": n,
                "name": name,
                "description": "",
                "category": "none",
                "links": []
              }
            };
          } else if (obj.startsWith("http")) {
            ff[n].properties.links.push({
              "title": "Link",
              "url": obj
            });
          } else {
            var i = obj.indexOf('=');
            key = obj.substr(0, i);
            value = obj.substr(i + 1);
            if (key && value) {
              if (keywords.includes(key))
                ff[n].properties[key] = value;
              else
                ff[n].properties.links.push({
                  "title": key,
                  "url": value
                });
            }
          }
        }
      });
      getInfo(ff);
    };

    function process(input) {
      var fileReader = new FileReader();
      fileReader.onload = function(event) {
        var text = event.target.result;
        convert(text);
      };
      fileReader.readAsText(input, "UTF-8");
    }
    return {
      process: process
    }
  })();
  
  var page = (function() {
    var PAGE1 = "#one";
    var PAGE2 = "#two";
    var features = [];
    var curday = 0;
    var showButton = function(count) {
      var days = [];
      var bg = "#d23f31";
      days.push({
        "bgcolor": bg,
        "icon": "+"
      });
      var i;
      for (i = 1; i <= count; i++) {
        days.push({
          "url": "javascript:trav.page.showList(" + (i - 1) + ");",
          "bgcolor": bg,
          "color": "#fffff",
          "icon": i,
          "target": "_self",
          "title": "Day " + i
        });
      }

      days.push({
        "url": "#popup",
        "bgcolor": "#CD5C5C",
        "color": "#fffff",
        "icon": 'i',
        "target": "_self",
        "title": "info"
      });

      $('.kc_fab_wrapper').kc_fab(days);
    };

    var showDate = function(day) {
      var d = data.day(day);
      var date = new Date(d.date);
      var options = {
        weekday: 'short',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      };

      $('#header1 p').html(date.toLocaleDateString("zh", options) +
        '  (' + date.toLocaleDateString(d.lang, {
          weekday: 'short'
        }) + ')');
    };

    var showMap = function(h) {
      var m = $("#map");
      m.detach();
      $(h).append(m);
    };

    var addEventHandlers = function() {
      $(document).on("pagebeforeshow", PAGE1, function() {
        console.log(PAGE1);
        map.zoomFit(features);
        showMap('#map1');
      });

      $(document).on("pagebeforeshow", PAGE2, function() {
        console.log(PAGE2);
        showMap('#map2');
      });

      $("#header1").on("swiperight", function(event) {
        if (curday > 0) {
          showList(curday - 1);
        }
      });

      $("#header1").on("swipeleft", function(event) {
        if (curday < data.days().length - 1) {
          showList(curday + 1);
        }
      });
    };

    var isListItem = function(f) {
      return f.properties.category=='site' || 
             f.properties.category=='hotel' || 
             f.properties.category=='airport';
    };

    var refreshView = function(list, items) {
      $(list).html(items.join(""));
      $(list).listview().listview('refresh');
    }
    
    function showList(day) {
      curday = day;
      features = data.listByDay(day);
      var items = [];
      var ff = [];
      $.each(features, function(i, f) {
        var prop = f.properties;
        if (isListItem(f)) {
          ff.push(f);
          items.push(
            '<li data-icon="arrow-r" id="' + i + '">' +
            '<a href="javascript:trav.page.showPlace(' + i + ');" >' +
            '<img src="' + prop.img + '">' +
            '<h2>' + prop.name + '</h2>' +
            '<p>' + prop.description + '</p>' +
            '</a>' +
            '<a href="javascript:trav.page.showTransit(' + i + ')"></a>' +
            '</li>');
        }
      });
      refreshView('#main-list', items);
      showDate(day);
      map.zoomFit(ff);
      $.mobile.navigate(PAGE1);
    }

    function showPlace(index) {
      var f = features[index];
      $('#header2 p').html(f.properties.name);
      var items = [];
      $.each(f.properties.links, function(idx, obj) {
        items.push('<li><a href="' + obj.url + '" target="_blank">' +
          '<h2>' + obj.title + '</h2>' +
          '</a></li>');
      });
      refreshView('#info-list', items);
      map.zoomFit([f]);
      $.mobile.navigate(PAGE2);
    }

    function showTransit(index) {
      var items = [];
      var i = index + 1;
      while (i<features.length) {
        var prop = features[i].properties;       
        if (prop.category != 'transit')
          break;
        items.push(
            '<li><a href="javascript:trav.page.showPlace(' + i + ');" >' +
           // '<img src="' + prop.img + '">' +
            '<h2>' + prop.name + '</h2>' +
            '<p>' + prop.description + '</p>' +
            '</a>' +
            '</li>');
        i++;
      }
      refreshView('#info-list', items);

      var ff = [features[index]];
      if (i<features.length) {
        ff.push(features[i]);
        $('#header2 p').html(
        '<a href="' + map.getDirLink(ff[0], ff[1]) + '" target="_blank ">' +
        ff[0].properties.name + ' - ' + ff[1].properties.name + '</a>');
      } else {
         $('#header2 p').html(ff[0].properties.name);
      }      

      map.zoomFit(ff);
      $.mobile.navigate(PAGE2);
    }

    function showInfo() {
      //fix me
    }

    function init() {
      showButton(data.days().length);
      showList(0);
      addEventHandlers();
    }

    return {
      init: init,
      showList: showList,
      showPlace: showPlace,
      showTransit: showTransit,
      showInfo: showInfo
    }
  })();

  function init(place) {
    var loadJsonFile = function(file) {
      var d = $.Deferred();
      $.getJSON(file, function(data) {
        d.resolve(data);
      });
      return d;
    };
    $.when(loadJsonFile(place + '.json'), loadJsonFile(place + '_itry.json'))
      .done(function(data1, data2) {
        data.init(data1, data2);
        try {
          map.initMap('map');
        } catch(err) {}
        page.init();
      });
  }

  exports.init = init;
  exports.page = page;
  exports.map = map;
  exports.utils = utils;
})));

$(document).ready(function() {
  trav.init("na");
  
  document.getElementById('file').onchange = function() {
    var file = this.files[0];
    trav.utils.process(file);
  };
});
