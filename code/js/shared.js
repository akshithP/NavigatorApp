// set storage keys for saving to local storage.
const NAVIGATE_KEY = "PathToNavigate";
const CLAYTON_KEY = "ClaytonRoutes";
const MYROUTES_KEY = "MyRoutes";

// set threshold to determine whether precision circle is red or green.
const PRECISION_THRESHOLD = 10;


class Path
{
    constructor(name, locations)
    {
        this._name = name;

        if (typeof(locations) !== "undefined")
        {
            this._initialiseWaypoints(locations);
        }
    }

    // Construct an array of LatLng objects form an array of objects with lat and lng attributes.
    _locationsToWaypoints(locations)
    {
        let waypoints = [];

        // Create LatLng class instacne for each set of coordinates.
        for (let coords of locations)
        {
            let coordsLatLng = new google.maps.LatLng(coords.lat, coords.lng);
            waypoints.push(coordsLatLng);
        }

        return waypoints
    }
    
    // Create waypoints, calculates total path distance and constructs distances array.
    _initialiseWaypoints(locations)
    {   
        // Array of LatLng class instances. May include duplicate consecutive waypoints.
        this._waypoints = this._locationsToWaypoints(locations);

        // Array of distances between successive waypoints. The distance stored at index i is the distance between that waypoint and the previous one. The first element holds a value of 0.
        this._distances = [0];

        // Total distance along path.
        this._totalDistance = 0;
        
        // Remove duplicate waypoints, fill distancees array, calculate total distance.
        for (let wpIndex = 1; wpIndex < this._waypoints.length; )
        {
            let distance = this.distanceToWaypoint(this._waypoints[wpIndex-1], wpIndex)
            if (distance > PRECISION_THRESHOLD)
            {
                // New waypoint. Update distances array and total distance.
                // Increment counter to move to next waypoint in next loop iteration.
                this._totalDistance += distance;
                this._distances.push(distance);
                wpIndex++
            }
            else
            {
                // Duplicate waypoint. Remove from waypoints array.
                // Repeat at same index in next loop iteration.
                this._waypoints.splice(wpIndex, 1);
            }
        }   
    }
    
    // Initialise using data from a path PDO.
    initialiseFromPathPDO(pathPDO)
    {
        this._name = pathPDO.title;
        this._initialiseWaypoints(pathPDO.locations); 
    }

    // Construct string for entry in Main Page. Contains total distance and number of turns in the path.
    // Note number of turns = waypoints.length - 2, because must exclude start and end waypoints.
    getDistanceAndTurns()
    {        
        let distanceAndTurnsString = "Total distance: " + this._totalDistance.toFixed(2) + " m, No. of turns: " + (this._waypoints.length - 2);

        return distanceAndTurnsString   
    }
    
    // Calculates distance from the current position to a waypoint (specified by index) along a geodesic (a straight line on a sphere).
    distanceToWaypoint(currentPos, waypointIdx)
    {
        let waypoint = this._waypoints[waypointIdx];
        return google.maps.geometry.spherical.computeDistanceBetween(currentPos, waypoint);
    }

    // Calculates bearing from the current position to a waypoint (specified by index) along a geodesic.
    // Returns a heading as a number of degrees clockwise from true north, in the range (-180,180].
    waypointBearing(currentPos, waypointIdx)
    {
        let waypoint = this._waypoints[waypointIdx];
        return google.maps.geometry.spherical.computeHeading(currentPos, waypoint);
    }
    
    // Construct string for general use, including debugging.
    // Contains path name, the waypoints' coordinates and total path distance.
    toString()
    {
        let printString = '';

        // print name.
        printString += "name: " + this._name + "\n";

        // print waypoints.
        for (let waypoint of this._waypoints){
            printString += "coords: " + waypoint.lat() + ", " + waypoint.lng() + "\n";
        }

        // print total distance.
        printString += "total distance: " + this._totalDistance + "\n";

        return printString
    }

    // Path name.
    get name()
    {
        return this._name
    }
    // Path waypoints (as LatLng objects).
    get waypoints()
    {
        return this._waypoints
    }
    // Array of distances between consecutive waypoints.
    get distances()
    {
        return this._distances
    }
    // Total path distance.
    get totalDistance()
    {
        return this._totalDistance
    }
}


class PathList
{
    constructor(name, paths)
    {
        this._name = name;

        // Array of Path class instances.
        this._paths = paths;
    }
    
    // Initialise using data from a pathList PDO.
    initialiseFromPathListPDO(pathListPDO)
    {
        this._paths = [];
        for (let pathIdx = 0; pathIdx < pathListPDO.paths.length; pathIdx++)
        {
            // For each path in the retrieved PDO path array, recreate the path as an instance of the Path class.
            let newPath = new Path();
            newPath.initialiseFromPathPDO(pathListPDO.paths[pathIdx]);
            this._paths.push(newPath);
        }
    }

    // Array of Path class incstances.
    get paths()
    {
        return this._paths
    }
}


class MapGeolocation
{
    constructor(map)
    {
        // Save map.
        if (map instanceof google.maps.Map)
        {
            this._map = map;
        }
        
        // Drawn map elements. Must set attributes so that they can be accessed later.
        this._positionMarker = null;
        this._precisionCircle = null;
        
        // geolocation parameters.
        this._heading = 0;
        this._position = null;
        this._positionPrecision = PRECISION_THRESHOLD;
    }

    // Update heading as bearing from last position to current position.
    _updatePositionAndHeading(position)
    {
        if (this._position !== null)
        {
            this._heading = google.maps.geometry.spherical.computeHeading(this._position, position);
        }
        // Update current position.
        this._position = position;
    }
    
    // Create new location marker with current position and heading / orientation.
    _updateMarker()
    {
        // Remove previous marker from map.
        if(this._positionMarker !== null)
        {
            this._positionMarker.setMap(null);
        }

        // Create new marker. This is the only way to update the rotation of the marker.
        this._positionMarker = new google.maps.Marker({
            position: this._position,
            map: this._map,
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 7,
                fillColor: "blue",
                fillOpacity: 0.5,
                strokeColor: "blue",
                strokeWeight: 1,
                anchor: new google.maps.Point(0,2.5),  // Make the marker rotate about it's midpoint.
                rotation: this._heading,
            }
        });
    }

    // Create precision circle if not previously defined.
    // Update colour based on precision, upate position.
    _updatePrecisionCircle(accuracy)
    {
        // Create precision circle if not previously defined
        if(this._precisionCircle === null)
        {
            this._precisionCircle = new google.maps.Circle({
                clickable: false,
                fillOpacity: 0.4,
                map: this._map,
                strokeOpacity: 0.8,
                strokeWeight: 3
            });
        }

        // Update precision circle colour depending on precision.
        if (accuracy > this._positionPrecision)
        {
            // Imprecise. Set colour of precision circle to red.
            this._precisionCircle.setOptions({
                fillColor: "#ff0000",
                strokeColor: "#ff0000"
            });
            displayMessage("GPS is inaccurate");
        }
        else
        {
            // Precise. Set colour of precision circle to green.
            this._precisionCircle.setOptions({
                fillColor: "#33cc33",
                strokeColor: "#33cc33"
            });
        }

        // Update position and radius.
        this._precisionCircle.setOptions({
            center: this._position,
            radius: accuracy
        });
    }
    
    updateMap(newPosition)
    {
        // Update stored position and heading.
        this._updatePositionAndHeading(newPosition.position);
        // Update marker location and orientation to current position and heading.
        this._updateMarker();
        // Update precision circle to current position with given accuracy.
        this._updatePrecisionCircle(newPosition.accuracy);
    }
    
    // Map on which location marker and precision circle are placed.
    get map()
    {
        return this._map;
    }
    // Current position of marker on the map.
    get position()
    {
        return this._position
    }
}


// Get path list PDO from local storage at the given key, 
// use it to initialise the pathList instance given.
function retrievePathlist(pathListInstance, key)
{
    if (typeof(Storage) !== "undefined")
    {
        // Retrieve the stored string and parse to an object.
        let pathsListString = localStorage.getItem(key);
        let pathListPDO = JSON.parse(pathsListString);

        // Use PDO and given path list instance to initialise a PathList instance.
        pathListInstance.initialiseFromPathListPDO(pathListPDO);   
    }
    else
    {
        alert("Local storage is not available. Could not get routes.");
    }
}

// Save an object in local storage, at the given key.
function saveObject(object, key)
{
    if (typeof(Storage) !== "undefined")
    {
        // Stringify and store in local storage.
        pathsJSON = JSON.stringify(object);
        localStorage.setItem(key, pathsJSON);
    }
    else
    {
        alert("Local storage is not available. Could not save routes.");
    }
}

// Monash ENG1003 Sensor Test App, Monash University 2018
// Handles watchPosition geolocation errors.
function handleLocationError(error)
{
    let errorMessage = "";
    if (error.code == 1)
    {
        errorMessage = "Location access denied by user.";
    }
    else if (error.code == 2)
    {
        errorMessage = "Location unavailable.";
    }
    else if (error.code == 3)
    {
        errorMessage = "Location access timed out";
    }
    else
    {
        errorMessage = "Unknown error getting location.";
    }

    // Display error message as an alert.
    alert('Error: ' + errorMessage);
}

// Monash ENG1003 Sensor Test App, Monash University 2018
// Performs geolocation using watchPosition.
function locateOnMap()
{
    if(navigator.geolocation)
    {
        // Options for GPS watching.
        // Note: Don't use default "timeout" value of "Infinity" as this causes both Safari and some versions of 
        // Chrome on iOS and Android to return error code 3: Location access timed out.
        positionOptions = {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
        };

        // Watch the user's GPS location. showCurrentLocation function will be called every time the user's 
        // location changes (if it can be successfully determined).
        // If the location can't be determined, then the errorHandler function will be called.    
        navigator.geolocation.watchPosition(showPosition, handleLocationError, positionOptions);
    }
    else 
    {
        alert("Geolocation is not supported by this browser!");
    }
}
