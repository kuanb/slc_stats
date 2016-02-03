// utilities

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
};

Array.max = function (array) {
	return Math.max.apply(Math, array);
};

Array.min = function (array) {
	return Math.min.apply(Math, array);
};



// operations

function loadStart () { 
	$("#loadbar").show();
	$("#main")[0].style.opacity = "0.3";
};
function loadDone () { 
	$("#loadbar").hide();
	$("#main")[0].style.opacity = "1.0";
};

function isHighDensity() {
	return ((window.matchMedia && (window.matchMedia('only screen and (min-resolution: 124dpi), only screen and (min-resolution: 1.3dppx), only screen and (min-resolution: 48.8dpcm)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (min-device-pixel-ratio: 1.3)').matches)) || (window.devicePixelRatio && window.devicePixelRatio > 1.3));
};

function isRetina() {
	return ((window.matchMedia && (window.matchMedia('only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx), only screen and (min-resolution: 75.6dpcm)').matches || window.matchMedia('only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min--moz-device-pixel-ratio: 2), only screen and (min-device-pixel-ratio: 2)').matches)) || (window.devicePixelRatio && window.devicePixelRatio >= 2)) && /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
};

function setUpTiles (map) {
	var url;
	if (isHighDensity() || isRetina()) {
		url = "http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png";
	} else {
		url = "http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
	}
	L.tileLayer(url, {attribution: ""}).addTo(map);
};

function loadInVariables (acs_vars) {
	["0", "1"].forEach(function (num) {
		acs_vars.forEach(function (v) {
			$("#sel_dependent" + num).append("<option>" + v + "</option>")
		});
	});
}

function setUpCitySDK (key) {
	var sdk = new CitySDK(); // create the CitySDK Instance
	census = sdk.modules.census; // create an instance of the module
	census.enable(key); // enable the module with the api key
	$("#prompt").hide();
	$("#main").show();
	$("#map1")[0].scrollIntoView({block: "end", behavior: "smooth"});
	map.invalidateSize();

	// initial map contents
	loadZips();
};

function onEachFeature (feature, layer) {
	if (feature.properties && feature.properties.popupContent) {
		layer.bindPopup(feature.properties.popupContent);
	}
	layer.on('mouseover', function () {
		this.setStyle({
			"fillOpacity": 0.70,
		});
	});
	layer.on("mouseout", function () {
		this.setStyle({
			"fillOpacity": 0.30,
		});
	});
}

function loadZips () {
	loadStart();
	var request = {
		"level": "county",
		"lat": g.slc.lat,
		"lng": g.slc.lng,
		"sublevel": true,
		"variables": []
	};

	census.GEORequest(request, function(response) {
		console.log("Loaded GEORequest response: ", response);
		response.features.map(function (ea) {
			var popupContent = "";
			Object.keys(ea.properties).forEach(function (k) {
				popupContent += "<b>" + String(k.capitalize()) + ":</b> " + String(ea.properties[k]) + "<br>";
			});
			ea.properties.popupContent = popupContent;
			return ea;
		});
		g.slc.gj = L.geoJson(response, {
			onEachFeature: onEachFeature,
			style: {
				"fillColor": "#238CAD",
				"color": "#238CAD",
				"weight": 1,
				"fillOpacity": 0.30,
			}
		});
		g.slc.gj.addTo(map);
		loadDone();
	 });
};

function startTool () {
	var key = $("#prompt #api_key")[0].value;
	if (key == "") {
		// try and use the back up api key, which we will expose to public but dump if ever misused (so don't)
		key = "8f1426b1e1b75ef19ba3883e8e12372f5ae2008a";
		setUpCitySDK(key);
	} else if (key.length < 5) {
		window.alert("Bad key entered, try again.");
		$("#prompt #api_key")[0].value = "";
	} else {
		setUpCitySDK(key);
	}
};

function loadSocrata () {
	var url = $(".url-entry").val();
	$.get(url)
		.fail(function (e) {
			alert("That endpoint failed to return a result.");
			$("#socrata-load").fadeIn();
		})
		.done(function (r) {
			g.socrata.data = r;
			plotSocrata();
		});
};

function nestedStringify (j, pad) {
	var popup_text = "";
	Object.keys(j).forEach(function (k) {
		var js_conversion = null;
		try {
			js_conversion = JSON.parse(j[k]);
		} catch (e) {
			js_conversion = j[k];
		}

		console.log()
		if (typeof js_conversion == "object") {
			popup_text = popup_text + "<b style='padding-left:" + pad + "px'>" + k.capitalize() + ":</b> <br>";
			popup_text = popup_text + nestedStringify(js_conversion, pad+10);
		} else {
			popup_text = popup_text + "<b style='padding-left:" + pad + "px'>" + k.capitalize() + ":</b> " + String(js_conversion) + "<br>";
		}
	});
	return popup_text;
}

function plotSocrata () {
	if (g.socrata.plot.length > 0) {
		g.socrata.plot.forEach(function (ea) {
			map.removeLayer(ea);
		});
	}
	g.socrata.data.forEach(function (ea) {
		var lat = ea.location.latitude,
				lng = ea.location.longitude;
		var circle = L.circle([lat, lng], 100, {
			color: "#33C3F0",
			fillColor: "#053746",
			fillOpacity: 0.5,
			weight: 2
		});

		var popup_text = nestedStringify(ea, 0);
		circle.bindPopup(popup_text);
		circle.addTo(map);
		g.socrata.plot.push(circle);
	});
};

function plotHeatmap () {
	if (g.socrata.plot.length > 0) {
		if (g.socrata.heat !== null) {
			map.removeLayer(g.socrata.heat);
		}

		g.socrata.plot.forEach(function (ea) {
			map.removeLayer(ea);
		});

		var heat_array = [];
		g.socrata.data.forEach(function (ea) {
			var lat = ea.location.latitude,
					lng = ea.location.longitude;
			heat_array.push([lat, lng]);
		});

		var heat_map = L.heatLayer(heat_array, {radius: 50, blur: 25, maxZoom: 19, max: 0.8});
		heat_map.addTo(map);
		g.socrata.heat = heat_map;
	}
};

function runWeight () {
	loadStart();
	var dep = $("#sel_dependent0")[0].value;
	var cor = $("#sel_dependent1")[0].value;
	var request = {
		"level": "county",
		"lat": g.slc.lat,
		"lng": g.slc.lng,
		"sublevel": true,
		"variables": []
	};

	var tracks_have = [];
	g.slc.gj.eachLayer(function (ea) {
		tracks_have.push(String(ea.feature.properties.tract));
	});

	if (dep == "-- select an option --") {
		runReset(loadDone);
	} else {
		// only dependent
		if (cor == "-- select an option --") {
			request.variables.push(dep);

			census.APIRequest(request, function (response) {
				var res_vals = [],
						res_dic = {};

				response.data.filter(function (ea) {
					var keyval = Number(ea[dep]);

					if (tracks_have.indexOf(String(ea.tract)) > -1) {
						res_vals.push(keyval);
						res_dic[String(ea.tract)] = keyval;
						return true;

					} else {
						return false;
					}
				});

				var max = Array.max(res_vals),
						min = Array.min(res_vals);

				var rainbow = new Rainbow();
				rainbow.setSpectrum('#f9c422', '#b60202');
				rainbow.setNumberRange(min, max);

				g.slc.gj.eachLayer(function (ea) {
					var t = String(ea.feature.properties.tract);
					var num = res_dic[t]
					ea.setStyle({fillColor: "#" + String(rainbow.colourAt(num))});
					if (ea.hasOwnProperty("_popup")) {
						if (ea._popup.hasOwnProperty("setContent")) {
							ea._popup.setContent("<b>Tract " + t + ": </b> " + String(num));
						} else {
							ea._popup._content = "<b>Tract " + t + ": </b> " + String(num);
						}
					}
				});

				loadDone();
			 });

		// comparison results
		} else {
			request.variables.push(dep);
			request.variables.push(cor);

			// get operator
			var op = null;
			if ($("#sel_operator").val().indexOf("Divide") > -1) {
				op = "/"
			} else if ($("#sel_operator").val().indexOf("Multiply") > -1) {
				op = "*"
			} else if ($("#sel_operator").val().indexOf("Add") > -1) {
				op = "+"
			}

			census.APIRequest(request, function (response) {

				console.log("response");
				console.log(response);

				var res_vals = [],
						res_dic = {},
						res_dic_d = {},
						res_dic_c = {};

				response.data.filter(function (ea) {
					var keyval_d = Number(ea[dep]);
					var keyval_c = Number(ea[cor]);

					if (tracks_have.indexOf(String(ea.tract)) > -1) {

						var com;
						if (["/", "*", "+"].indexOf(op) > -1) { com = eval(keyval_d + op + keyval_c); }
						else { com = Math.pow(keyval_d, keyval_c); }

						if (isNaN(com)) com = 0;
						if (isFinite(com)) res_vals.push(com);
						res_dic[String(ea.tract)] = com.toFixed(2);

						if (isNaN(keyval_d)) keyval_d = 0;
						res_dic_d[String(ea.tract)] = keyval_d.toFixed(2);

						if (isNaN(keyval_c)) keyval_c = 0;
						res_dic_c[String(ea.tract)] = keyval_c.toFixed(2);

						console.log(com, keyval_d, keyval_c);

						return true;

					} else {
						return false;
					}
				});

				var max = Array.max(res_vals),
						min = Array.min(res_vals);

				var rainbow = new Rainbow();
				rainbow.setSpectrum('#f9c422', '#b60202');
				rainbow.setNumberRange(min, max);

				g.slc.gj.eachLayer(function (ea) {
					var t = String(ea.feature.properties.tract);
					var num = Number(res_dic[t])
					if (isFinite(num)) {
						ea.setStyle({fillColor: "#" + String(rainbow.colourAt(num))});
					} else {
						ea.setStyle({fillColor: "#000"});
						num = String(num) + " (Operation could not be performed. Results inaccurate.)";
					}
					
					var content_for_popup = "<b>Tract " + t + ": </b><br>Combined: " + String(num) + 
																	"<br>" + String(dep) + ": " + String(res_dic_d[t]) + 
																	"<br>" + String(cor) + ": " + String(res_dic_c[t])
					if (ea.hasOwnProperty("_popup")) {
						if (ea._popup.hasOwnProperty("setContent")) {
							ea._popup.setContent(content_for_popup);
						} else {
							ea._popup._content = content_for_popup;
						}
					}
				});

				loadDone();
			 });
		}
	}
};

function runReset (cb) {
	g.slc.gj.eachLayer(function (ea) {
		ea.setStyle({fillColor: "#238CAD"});
		ea._popup.setContent(ea.feature.properties.popupContent);
	});
	if (cb) { cb(); }
}







