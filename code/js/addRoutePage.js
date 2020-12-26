class RouteCreator extends MapGeolocation
{
    constructor(map){
        // Initialise the attributes of the parent class.
        super(map);
        
        // Add more drawn map elements.
        this._pathElements = [];  // Array of elements for the path - polyline, start and end markers.

        // Draggable marker.
        this._routeMarker = new google.maps.Marker({
            position: this._map.getCenter(),
            map: map,
            draggable: true,
            zIndex: google.maps.Marker.MAX_ZINDEX
        });

        // Array of waypoints as LatLng objects.
        this._waypoints = [];
    }
    
    // Display the path created by the user. If no path exists, initialise the path elements.
    displayPath()
    {
        if (this._pathElements.length ==0)
        {
            // No path exists yet. Initialise the drawn elements.
            this._initialiseDisplayPath();
        }
        else
        {            
            // Get references to drawn elements
            let startMarker = this._pathElements[0];
            let linePath = this._pathElements[1];
            let endMarker = this._pathElements[2];

            let startPos, path, endPos;

            // Handling for few waypoints.
            if (this._waypoints.length == 0)
            {
                startPos = null;
                path = [];
                endPos = null;
            }
            else if (this._waypoints.length == 1)
            {
                startPos = this._waypoints[0];
                path = [];
                endPos = null;
            }
            // General handling.
            else
            {
                startPos = this._waypoints[0];
                path = this._waypoints;
                endPos = this._waypoints[this._waypoints.length - 1];
            }
            
            // Update drawn elements
            startMarker.setPosition(startPos); 
            linePath.setPath(path);
            endMarker.setPosition(endPos);
        }
    }

    // Initialise drawn elements to display on map.
    _initialiseDisplayPath()
    {
        // Show start and end waypoints.
        // Icon URL source: https://stackoverflow.com/questions/7095574/google-maps-api-3-custom-marker-color-for-default-dot-marker/7686977.
        let startMarker = new google.maps.Marker({
            map: this._map,
            icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
        });
        let endMarker = new google.maps.Marker({
            map: this._map,
            icon: 'http://maps.google.com/mapfiles/ms/icons/pink-dot.png'
        });

        // Show polyline between waypoints.
        let linePath = new google.maps.Polyline({
            map: this._map,
            strokeColor: "#8080ff",
            strokeWeight: 3
        });
        
        // Store drawn elements
        this._pathElements = [startMarker, linePath, endMarker];
    }
    
    // Construct a PDO for use with local storage.
    // Construct in same form as campusnav object, so it can be processed in the same way in Main Page.
    createRoutePDO(name)
    {
        // Construct list of location objects containing lat and lng values.
        let locationList = [];
        for (let waypointIdx = 0; waypointIdx < this._waypoints.length; waypointIdx++)
        {
            let location = {
                lat: this._waypoints[waypointIdx].lat(),
                lng: this._waypoints[waypointIdx].lng()
            }
            // Push the location's attribute into locationList array.
            locationList.push(location);
        }
        
        // Construct and return object.
        let routePDO = {
            title: name,
            locations: locationList
        }
        return routePDO
    }

    // Path waypoints. An array of LatLng objects.
    get waypoints()
    {
        return this._waypoints
    }
    // Draggable marker on map.
    get routeMarker()
    {
        return this._routeMarker;
    }
}


let currentRoute;
let geolocationTimestamp = 0;

// Callback function called whenever the user's location changes.
function showPosition(geolocationPosition)
{   
    // Check this is a unique call.
    if (geolocationPosition.timestamp !== geolocationTimestamp)
    {
        // Update timestamp.
        geolocationTimestamp = geolocationPosition.timestamp;
        
        // Construct position object.
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
        
        if (currentRoute.position === null)
        {
            distanceFromLast = userPosition.accuracy;
        }
        else
        {   
            // Update user current location.
            distanceFromLast = google.maps.geometry.spherical.computeDistanceBetween(currentRoute.position, userPosition.position);
        }
        // Handle other positions.
        
        // Define this threshold so that map updates position more regularly, and position displayed is more reflective of reality. Provides a better user experience.
        // Waypoints are still updated based on the unmodified accuracy.
        let thresholdFactor = 0.4;
        if (distanceFromLast >= userPosition.accuracy * thresholdFactor)
        {
            // Update position, heading, marker and precision circle.
            currentRoute.updateMap(userPosition);
        }
    }
}

// Create a name for the new route created.
function getRouteName(pathNumber=0)
{
    let defaultName = "My Route " + (pathNumber + 1);
    let pathName = prompt("Enter the name of the route", defaultName);

    if (pathName === "")
    {
        pathName = defaultName;
    }

    return pathName
}

// Save the route created.
function saveRoute()
{
    // Check the path is long enough to be a valid route.
    if (currentRoute.waypoints.length > 1)
    {
        if (typeof(Storage) !== "undefined")
        {
            // Retrieve any previously-stored paths.
            let retrievedPDOString = localStorage.getItem(MYROUTES_KEY);
            if (retrievedPDOString !== null)
            {
                // Parse the previously-stored paths.
                let retrievedPDO = JSON.parse(retrievedPDOString);

                // Get a name for the new route.
                let pathListLength = retrievedPDO.paths.length;
                let pathName = getRouteName(pathListLength);
                if (pathName !== null)
                {
                    // Create a storable path PDO, add it to the 'paths' array in the stored paths object.
                    let routePDO = currentRoute.createRoutePDO(pathName);
                    retrievedPDO.paths.push(routePDO);

                    // Save to local storage.
                    saveObject(retrievedPDO, MYROUTES_KEY)
                }
            }
            else
            {
                // Get a name for the new route.
                let pathName = getRouteName();
                if (pathName !== null)
                {
                    // Create new storable path-list PDO, save to local storage.
                    let routePDO = currentRoute.createRoutePDO(pathName);
                    let savePDO = {
                        paths: [routePDO]
                    }
                    saveObject(savePDO, MYROUTES_KEY)
                }
            }
        }
        else
        {
            alert("Local storage is not available. Could not save new route.");
        }
    }
    else
    {
        alert("There are not enough points to save this route.")
    }
}

// Delete the route created.
function deleteRoute()
{
    if (confirm("Delete all points in the current route?"))
    {
        while (currentRoute.waypoints.length > 0)
        {
            currentRoute.waypoints.pop();
        }
        currentRoute.displayPath();
    }
}

// Add a new waypoint (as a LatLng object).
function addLocation()
{
    let newWaypoint = currentRoute.routeMarker.getPosition();
    currentRoute.waypoints.push(newWaypoint);
    currentRoute.displayPath();
}

// Remove the last waypoint.
function undo()
{
    if (currentRoute.waypoints.length > 0)
    {
        currentRoute.waypoints.pop();
    }
    currentRoute.displayPath();
}

// Pan to user's current location.
function myLocation()
{
    currentRoute.map.panTo(currentRoute.position);
}

// Drop the pin to the location that is centred in the screen.
function pinDrop()
{
    currentRoute.routeMarker.setPosition(currentRoute.map.getCenter());
}

function initMap()
{
    // Generate Navigation class instance.
    let map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: { lat: -37.910667, lng: 145.133291}
    });

    currentRoute = new RouteCreator(map);

    // Initialise path, begin geolocation.
    currentRoute.displayPath();
    locateOnMap();
}
