// Store the pathList key and path index in local storage, link to navigate.html.
// Use this so that the correct path can be loaded for navigation.
function goToNavigate(pathListKey, pathIdx)
{
    // Save to local storage
    navigateObject = {pathListKey: pathListKey, pathIdx: pathIdx};
    saveObject(navigateObject, NAVIGATE_KEY);
    
    // Load navigate.html.
    window.location.href='navigate.html';
}

// Construct interactive list of routes in the given pathList instance, output to the Main Page.
function displayRoutesList(pathList, pathListKeyString, targetDivID, deleteButtonFlag=false)
{
    // Generate list node dynamically
    let targetDivRef = document.getElementById(targetDivID);
    let listNode = document.createElement("ul");
    
    // Create reference for repeated use of pathList.paths
    let pathsArray = pathList.paths;
    
    // Initialise string to hold HTML list. This will be modified within the loop below.
    let listHTML = "";

    for(let pathIdx = 0; pathIdx < pathsArray.length; pathIdx++)
    { 

        // Create list elements in HTML with following structure:

        /*
        <li class="mdl-list__item mdl-list__item--three-line" style="width: 100vw; height: 120px; text-align: center; margin: auto;">
            <span class="mdl-list__item-primary-content">
                <center>
                    <span>[PATH NAME]</span>
                    <span class="mdl-list__item-text-body">
                        [PATH SUMMARY] <br>

                        <!-- Start button, links to navigate page-->

                        <button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect" type="button" onclick="goToNavigate([PATHLIST STORAGE KEY], [PATH INDEX IN PATHLIST])">
                            Get started
                        </button>                     
                    </span>
                </center>
            </span>
        </li>
        */
        
        // Create list elements
        let listStartTagsHTML = '<li class="mdl-list__item mdl-list__item--three-line" style="width: 100vw; height: 120px; text-align: center; margin: auto;"><span class="mdl-list__item-primary-content"><center><span>';
        let nameHTML = pathsArray[pathIdx].name + '</span>';
        let summaryHTML = '<span class="mdl-list__item-text-body">' + pathsArray[pathIdx].getDistanceAndTurns() + '<br>';
        let buttonsHTML = '<button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect" type="button" onclick="goToNavigate(' + pathListKeyString + ',' + pathIdx + ')">Get started</button>';
        let listEndTagsHTML = '</span></center></span></li>';

        // If deleteButtonFlag is set, add another button in HTML with the following structure:
        
        /*
            &nbsp;&nbsp;
            <button class="mdl-button mdl-js-button mdl-button--fab mdl-button--mini-fab" type="button" onclick="deletePath([PATHLIST STORAGE KEY], [PATH INDEX IN PATHLIST])">
                <i class="material-icons">delete_outline</i>
            </button>
        */
        if (deleteButtonFlag)
        {    
            buttonsHTML += '&nbsp;&nbsp;<button class="mdl-button mdl-js-button mdl-button--fab mdl-button--mini-fab" type="button" onclick="deletePath(' + pathListKeyString + ',' + pathIdx + ')"><i class="material-icons">delete_outline</i></button>';
        }
        
        // Add the entry for this loop iteration to the list.
        listHTML += listStartTagsHTML + nameHTML + summaryHTML + buttonsHTML + listEndTagsHTML;
    }
    
    // Dynamically add attributes of the list, add the list entries.
    listNode.class = "mdl-list";
    listNode.style = "padding-left: 0px";
    listNode.innerHTML = listHTML;
    targetDivRef.appendChild(listNode);
}

// A callback function for the JSONP request to campusnav.
// After the web service has been called, all other JS for the page is run from here.
function initPage(claytonPaths)
{
    // Save clayton campus routes
    claytonPathsObject = {paths: claytonPaths};
    saveObject(claytonPathsObject, CLAYTON_KEY);

    // Get path lists, display routes in main page (index.html).

    // Clayton:
    if (typeof(Storage) !== "undefined" && localStorage.getItem(CLAYTON_KEY) !== null)
    {
        // If any user-created paths have been stored, then create path list and display.
        let claytonPathList = new PathList("Clayton Routes");
        retrievePathlist(claytonPathList, CLAYTON_KEY);
        displayRoutesList(claytonPathList, 'CLAYTON_KEY', "clayton-routes");
    }
    else
    {
        // No user-created routes available.
        let targetDivRef = document.getElementById("clayton-routes");
        targetDivRef.innerHTML = "<center><h4><p>No routes found for Clayton Campus.</p></h4></center>";
    }


    // User-created:
    if (typeof(Storage) !== "undefined" && localStorage.getItem(MYROUTES_KEY) !== null)
    {
        // If any user-created paths have been stored, then create path list and display.
        let userPathList = new PathList("My Routes");
        retrievePathlist(userPathList, MYROUTES_KEY);
        displayRoutesList(userPathList, 'MYROUTES_KEY', "user-routes", true);
    }
    else
    {
        // No user-created routes available.
        let targetDivRef = document.getElementById("user-routes");
        targetDivRef.innerHTML = "<center><h4><p>No user-created routes found.</p><p>Press the + button to add routes</p></h4></center>";
    }
}

// Monash ENG1003 Lab Instructions Week 9, Monash University 2018.
// Construct a JSONP request to the given URL with a query string defined by the properties and values in a given data object.
function jsonpRequest(url, data)
{
    // Build URL parameters from data object.
    let params = "";
    // For each key in data object...
    for (let key in data)
    {
        if (data.hasOwnProperty(key))
        {
            if (params.length == 0)
            {
                // First parameter starts with '?'
                params += "?";
            }
            else
            {
                // Subsequent parameter separated by '&'
                params += "&";
            }

            let encodedKey = encodeURIComponent(key);
            let encodedValue = encodeURIComponent(data[key]);

            params += encodedKey + "=" + encodedValue;
        }
    }
    let script = document.createElement('script');
    script.src = url + params;
    document.body.appendChild(script);
}

// Make a request to the ENG1003 campusnav web service for Clayton campus paths.
function getClaytonPaths()
{
    let data = {
        campus: "clayton",
        callback: "initPage"
    };
    jsonpRequest("https://eng1003.monash/api/campusnav/", data);
}

// Delete the path specified by the pathList key and path index.
function deletePath(pathlistKey, pathIdx)
{
    if (typeof(Storage) !== "undefined")
    {
        if (confirm("Permanently delete this route?"))
        {
            // Retrieve stored paths, parse to object.
            let retrievedPDOString = localStorage.getItem(pathlistKey);
            let retrievedPDO = JSON.parse(retrievedPDOString);
            
            if (retrievedPDO.paths.length > 1)
            {
                // More than one path in the path list.
                // Remove path at pathIdx, save remaining paths to local storage.
                retrievedPDO.paths.splice(pathIdx, 1);
                saveObject(retrievedPDO, pathlistKey)
            }
            else
            {
                // Only one path in path list. Delete path list.
                localStorage.removeItem(pathlistKey)
            }

            // Reload page to update path lists.
            window.location.reload()
        }
    }
    else
    {
        alert("Local storage is not available. Could not remove route.");
    }
}

window.onload = getClaytonPaths;
