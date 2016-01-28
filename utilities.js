// utilities
String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
};

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

function loadInVariables () {
	// body...
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
			"fillColor": "#ff0000",
			"color": "#ff0000",
		});
	});
	layer.on("mouseout", function () {
		this.setStyle({
			"fillColor": "#0000ff",
			"color": "#0000ff",
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
		response.features.map(function (ea) {
			var popupContent = "";
			Object.keys(ea.properties).forEach(function (k) {
				popupContent += "<b>" + String(k.capitalize()) + ":</b> " + String(ea.properties[k]) + "<br>";
			});
			ea.properties.popupContent = popupContent;
			return ea;
		});
		var gj = L.geoJson(response, {
			onEachFeature: onEachFeature,
			style: {
				"fillColor": "#0000ff",
				"color": "#0000ff",
				"weight": 1
			}
		});
		console.log(gj);
		gj.addTo(map);
		loadDone();
	 });
}

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
}