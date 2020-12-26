class Navigation extends MapGeolocation
{
    constructor(pathInstance, map){
        // Initialise the attributes of the parent class.
        super(map);
        
        // Get path.
        if (pathInstance instanceof Path)
        {
            this._navPath = pathInstance;
        }

        // Path-following parameters.
        this._totalDistance = 0;
        this._waypointIdx = 0;  // Start at first waypoint in path.
        this._waypointMarker;  // Identifies current waypoint to naviagte to.
        this._endOfPath = false;  // Flag to record whether route has been completed.
        this._positionHistory = [];

        // Record start time in ms. Used to compute average speed.
        this._startTime = Date.now();
    }

    // Display path on map, along with markers for start and end waypoints, and for the next waypoint.
    displayPath()
    {
        // Show start and end waypoints.
        let startMarker = new google.maps.Marker({
            position: this._navPath.waypoints[0],
            map: this._map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: "#cc6600",
                fillOpacity: 1.0,
                strokeColor: "#cc6600",
                strokeWeight: 1 
            }
        });
        let endMarker = new google.maps.Marker({
            position: this._navPath.waypoints[this._navPath.waypoints.length - 1],
            map: this._map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: "#cc6600",
                fillOpacity: 1.0,
                strokeColor: "#cc6600",
                strokeWeight: 1 
            }
        });

        // Show polyline between waypoints.
        let linePath = new google.maps.Polyline({
            path: this._navPath.waypoints,
            map: this._map,
            strokeColor: "#FF8C00",
            strokeWeight: 7
        });

        // Show marker at next waypoint.
        this._waypointMarker = new google.maps.Marker({
            position: this._navPath.waypoints[this._waypointIdx],
            map: this._map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillOpacity: 0.0,
                strokeColor: "#000099",
                strokeWeight: 4 
            }
        });
    }
    
    // Distance to next waypoint
    _distanceToNext()
    {
        return this._navPath.distanceToWaypoint(this._position, this._waypointIdx);
    }

    // Update heading as bearing from last position to current position.
    // Update distance between last position and current position.
    // Update position array with current position.
    _updatePositionAndHeading(position)
    {
        if (this._position !== null)
        {
            this._heading = google.maps.geometry.spherical.computeHeading(this._position, position);
            this._totalDistance += google.maps.geometry.spherical.computeDistanceBetween(this._position, position);
        }
        // Update current position and position array.
        this._position = position;
        this._positionHistory.push(position);
    }
    
    // Update the current waypoint, and the marker for the next waypoint.
    // Detect route completion.
    _updateWaypoint(accuracy)
    {
        // Only update if position is within uncertainty of the next waypoint.
        if (!this._endOfPath && this._distanceToNext() < accuracy)
        {
            // If not at end of path...
            if (this._waypointIdx < this._navPath.waypoints.length - 1)
            {
                displayMessage("You have reached the next waypoint.");
                this._waypointIdx++;
                this._waypointMarker.setPosition(this._navPath.waypoints[this._waypointIdx]);
            }
            // If at end of path...
            else if (this._waypointIdx == this._navPath.waypoints.length - 1)
            {
                displayMessage("You have reached the destination!", 5000);
                this._endOfPath = true;
                this._waypointMarker.setMap(null);
            }
        }
    }
    
    updateMap(newPosition)
    {
        // Update stored position and heading
        this._updatePositionAndHeading(newPosition.position);
        // Update next waypoint to naviagte to.
        this._updateWaypoint(newPosition.accuracy)
        // Update marker location and orientation to current position and heading
        this._updateMarker();
        // Update precision circle to current position with given accuracy
        this._updatePrecisionCircle(newPosition.accuracy);
    }

    // Average speed from beginning of journey (m/s).
    _getAverageSpeed()
    {
        let endTime = Date.now()
        // Get elapsed time in seconds.
        let elapsedTime = (endTime - this._startTime) / 1000;

        // Return average speed in m/s.
        return this._totalDistance / elapsedTime;
    }

    // Distance from current position to end of route (m). Calculate the shortest distance.
    _getRemainingDistance()
    {
        let distanceList = this._navPath.distances;
        let distRemaining = 0;

        // Add distance to next waypoint.
        distRemaining += this._distanceToNext();

        for (let distIdx = this._waypointIdx + 1; distIdx < distanceList.length; distIdx++)
        {
            // Add distances between all successive waypoints.
            distRemaining += distanceList[distIdx]
        }

        // Return distance in metres.
        return distRemaining;
    }

    // Time from current position to end of route (s).
    _getRemainingTime()
    {
        // Get time remaining in seconds.
        let timeRemaining = this._getRemainingDistance() / this._getAverageSpeed();
        if (timeRemaining === Infinity){
            timeRemaining = NaN
        }
        return timeRemaining
    }
    
    // Path being navigated
    get path()
    {
        return this._navPath
    }
    // Index of waypoint to navigate to.
    get waypointIdx()
    {
        return this._waypointIdx
    }
    // Flag to record whether current path has been completed.
    get endOfPath()
    {
        return this._endOfPath
    }
    // Distance to next waypoint as a readable string.
    get distanceToNext()
    {
        if (!this._endOfPath)
        {
            // Return remaining distance in m.
            let distanceValue = this._distanceToNext().toFixed(2);
            return distanceValue.toString() + " m"
        }
        else
        {
            return "None"
        }
    }
    // Total path distance as a readble string.
    get totalDistance()
    {
        // Return total distance in km.
        let distanceValue = this._totalDistance.toFixed(2);
        return distanceValue.toString() + " m"
    }
    // Average speed from start of navigation as a readable string.
    get averageSpeed()
    {
        // Return average speed in m/s.
        let speedValue = this._getAverageSpeed().toFixed(2);
        return speedValue.toString() + " m/s"
    }
    // Shortest remaining ditance in path as a readble string.
    get remainingDistance()
    {
        if (!this._endOfPath)
        {
            // Return remaining distance in km.
            let distanceValue = this._getRemainingDistance().toFixed(2);
            return distanceValue.toString() + " m"
        }
        else
        {
            return "None"
        }
    }
    // Remaining time until end of path is reached as a readable string.
    get remainingTime()
    { 
        if (!this._endOfPath)
        {
            // Return remaining time in minutes.
            let minutesValue = (this._getRemainingTime() / 60).toFixed(2);
            if (isNaN(minutesValue))
            {
                return "NaN"
            }
            return minutesValue.toString() + " mins"
        }
        else
        {
            return "None"
        }
    }
    // Angle from the user to the next waypoint.
    get directionToWaypoint()
    {
        let waypointBearing = this._navPath.waypointBearing(this._position, this._waypointIdx);
        let direction = waypointBearing - this._heading;  // Returns a number in the interval (-360, +360).
        
        // Handle out of bounds directions
        if (direction <= -180)
        {
            direction += 360;
        }
        else if (direction > 180)
        {
            direction -= 360;
        }
        
        return direction
    }
}

let currentNav;
let geolocationTimestamp = 0;

// Change the direction arrow image depending on user's current location and heading.
function showDirection(direction)
{       
    // Get DOM element reference.
    let arrowRef = document.getElementById("direction-arrow");

    // Set image based on direction.
    if(-180 < direction && direction <= -112.5)
    {
        arrowRef.src = "images/uturn.svg";
    }
    else if(-112.5 < direction && direction <= -67.5)
    {
        arrowRef.src = "images/left.svg";
    }
    else if(-67.5 < direction && direction <= -22.5)
    {
        arrowRef.src = "images/slight_left.svg";
    }
    else if(-22.5 < direction && direction <= 22.5)
    {
        arrowRef.src = "images/straight.svg";
    }
    else if(22.5 < direction && direction <= 67.5)
    {
        arrowRef.src = "images/slight_right.svg";
    }
    else if(67.5 < direction && direction <= 112.5)
    {
        arrowRef.src = "images/right.svg";
    }
    else if(112.5 < direction && direction <= 180)
    {
        arrowRef.src = "images/uturn.svg";
    }
    else
    {
        arrowRef.src = "images/straight.svg";
        console.log("direction out of range");
    }
}

// Display data output in HTML, in the div given by the idString.
// Used for the navigation info output.
function infoOutput(idString, data)
{
    let elementRef = document.getElementById(idString);
    elementRef.innerHTML = "<b>" + data + "</b>";
}

// Callback function for watchPosition. Called whenever the user's location changes.
function showPosition(geolocationPosition)
{
    // Check this is a unique call
    if (geolocationPosition.timestamp !== geolocationTimestamp)
    {
        // Update timestamp
        geolocationTimestamp = geolocationPosition.timestamp;

        // Construct position object
        let userLatitude = geolocationPosition.coords.latitude;
        let userLongitude = geolocationPosition.coords.longitude;
        let posAccuracy = geolocationPosition.coords.accuracy;

        let userPosition = {
            position: new google.maps.LatLng(userLatitude, userLongitude),
            accuracy: posAccuracy
        };

        // Check whether new position is outside uncertainty of the last position. If so, update map.
        // Handle first position.
        let distanceFromLast;

        if (currentNav.position === null)
        {
            distanceFromLast = userPosition.accuracy;
        }
        else
        {
            distanceFromLast = google.maps.geometry.spherical.computeDistanceBetween(currentNav.position, userPosition.position);
        }
        // Handle other positions
        
        // Define this threshold so that map updates position more regularly, and position displayed is more reflective of reality. Provides a better user experience.
        // Waypoints are still updated based on the unmodified accuracy.
        let thresholdFactor = 0.4;
        if (distanceFromLast >= userPosition.accuracy * thresholdFactor)
        {
            // Pan to position
            currentNav.map.panTo(userPosition.position);

            // Update position, heading, marker and precision circle.
            currentNav.updateMap(userPosition);

            // Update direction image
            if (!currentNav.endOfPath)
            {    
                showDirection(currentNav.directionToWaypoint);
            }
            else
            {
                let arrowRef = document.getElementById("direction-arrow");
                arrowRef.src = "images/straight.svg";
            }

            // Update information panel
            infoOutput("dist-to-waypoint", currentNav.distanceToNext);
            infoOutput("waypoint-num", currentNav.waypointIdx + 1);
            infoOutput("dist", currentNav.totalDistance);
            infoOutput("speed", currentNav.averageSpeed);
            infoOutput("dist-remaining", currentNav.remainingDistance);
            infoOutput("eta", currentNav.remainingTime);
        }
    }
}

// Get path to naviagte from local storage, initialise path as instance of Path class.
function getPathToNavigate()
{
    if (typeof(Storage) !== "undefined")
    {
        // Retrieve the object containing the path list storage key and the path index.
        let pathKeyAndIdx = JSON.parse(localStorage.getItem(NAVIGATE_KEY));

        // Retrieve the path list PDO from the storage key
        let pathListPDO = JSON.parse(localStorage.getItem(pathKeyAndIdx.pathListKey));

        // Get the path from the pathList PDO (access using the path index), initialise as path class instance. 
        let pathIdx = pathKeyAndIdx.pathIdx;
        path = new Path();
        path.initialiseFromPathPDO(pathListPDO.paths[pathIdx]);
        return path
    }
    else
    {
        alert("Local storage is not available. Could not get routes.");
    }
}

function initMap()
{
    // Generate Navigation class instance
    let map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: { lat: -37.910667, lng: 145.133291}
    });

    let path = getPathToNavigate();
    currentNav = new Navigation(path, map);

    // Display path, begin geolocation.
    currentNav.displayPath();
    locateOnMap();
}
