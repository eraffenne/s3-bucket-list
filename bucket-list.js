/*
Amazon S3 Bucket listing.

Copyright (C) 2008 Francesco Pasqualini
Copyright (C) 2014 Stratio

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
    Original fetched from: https://aws.amazon.com/code/JavaScript/1713
    Modified by: Emmanuelle Raffenne (eraffenne@stratio.com)
    Date: 26-aug-2014
    Added features:
        - human readable file size
        - list of files to exclude from listing
        - subdirectories listing (only one level for now)
        - indication of sorting column and order type
*/

// Get list of files to exclude from listing
if (!("excludeFiles" in window)) {
    excludeFiles = [];
}

// Get dir to display or "" for root dir
// Remember it ends up with a "/"
var curdir = getQueryVariable("s");
var curdirName = curdir.substring(0, curdir.lastIndexOf("/"));
var sortParams = getSortParams();
var cursort = getQueryVariable("sort");

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return "";
}

function createRequestObject(){
    var request_o; //declare the variable to hold the object.
    var browser = navigator.appName; //find the browser name
    if (browser == "Microsoft Internet Explorer"){
        /* Create the object using MSIE's method */
        request_o = new ActiveXObject("Microsoft.XMLHTTP");
    } else {
        /* Create the object using other browser's method */
        request_o = new XMLHttpRequest();
    }
    return request_o; //return the object
}

/* You can get more specific with version information by using
    parseInt(navigator.appVersion)
    Which will extract an integer value containing the version
    of the browser being used.
*/
/* The variable http will hold our new XMLHttpRequest object. */
var http = createRequestObject();
function getList(){
    if ("sampleXML" in window) {
        var url = sampleXML;
    } else {
        var fullURL = location.href;
        var querystring = location.search;
        var i = fullURL.indexOf(querystring);
        if(querystring && i != -1) {
            fullURL = fullURL.substr(0, i);
        }
        var url = fullURL.substring(0, fullURL.lastIndexOf("/") + 1);
    }
    http.open('get', url);
    http.onreadystatechange = handleList;
    http.send(null);
}

/* ------------------------------------------ */
/* Parsing and rendering list                 */
/* ------------------------------------------ */
function handleList(){
    /* Make sure that the transaction has finished. The XMLHttpRequest object
        has a property called readyState with several states:
        0: Uninitialized
        1: Loading
        2: Loaded
        3: Interactive
        4: Finished */
    if(http.readyState == 4){ //Finished loading the response
        /* We have got the response from the server-side script,
            let's see just what it was. using the responseText property of
            the XMLHttpRequest object. */

        var response = http.responseXML;

        try {
            var filex = response.getElementsByTagName('Contents');
            var fileList = new Array();
            var j = 0;

            // Set initial HTML depending on the current directory
            var res = ""
            if (curdir) {
                res = "<tr><td><a href=\"" + getParentURL() + "\">Parent directory ...</a></td><td></td><td></td></tr>"
            }

            for(var i=0; i<filex.length; i++){
                var name = filex[i].getElementsByTagName('Key')[0].firstChild.data;
                if ( excludeFiles.indexOf(name) == -1 && isCurdirMember(name) ) {
                    var size = filex[i].getElementsByTagName('Size')[0].firstChild.data;
                    var lastmod = filex[i].getElementsByTagName('LastModified')[0].firstChild.data;
                    if (name.charAt(name.length-1) == "/") {
                        var uri = encodeURI(getDirURL(name));
                    } else {
                        var uri = encodeURI(name);
                    }
                    var link = "<A HREF=\"" + uri + "\">" + getPrettyname(name) + "</A>";
                    var fileData = new Array();
                    fileList[j++] = fileData;
                    fileData[0] = name;
                    fileData[1] = humanReadableFileSize(size);
                    fileData[2] = lastmod;
                    fileData[3] = link;
                }
            }
            fileList.sort(getSort());
            for(var i=0; i<fileList.length; i++){ //length is the same as count($array)
                var fileData = fileList[i];
                var name = fileData[0];
                var size = fileData[1];
                var lastmod = fileData[2];
                var link = fileData[3];
                var row = "<td>" + link + "</td><td align=\"right\">" + size + "</td><td>" + lastmod + "</td>"
                res = res + "<tr>" + row + "</tr>"
            }

            if (fileList.length == 0) {
                document.getElementById('bucket_list').innerHTML = "<table cellpadding=\"5\" cellspacing=\"5\"><thead>"
                    + getListHeader() + "</thead><tbody>" + res + "</tbody></table><p>No content found</p>";
            } else {
                document.getElementById('bucket_list').innerHTML = "<table cellpadding=\"5\" cellspacing=\"5\"><thead>"
                    + getListHeader() + "</thead><tbody>" + res + "</tbody></table>";
            }
        } catch(err) {
            document.getElementById('bucket_list').innerHTML = "<p>No content found</p>"
            console.log(err.message);
        }
        if (curdir) {
            document.getElementById('page_subtitle').innerHTML = curdir;
        }
    }
}

function getPrettyname(name) {
    if ( name.charAt(name.length-1) == "/" ) {
        var path = name.substring(0, name.length - 1).split("/");
        path[path.length - 1] += "/";
    } else {
        var path = name.split("/");
    }
    return path[path.length - 1];
}

function isCurdirMember(name) {
    if ( name.charAt(name.length-1) == "/" ) {
        // name is a directory
        var path = name.substring(0, name.length - 1).split("/");
    } else {
        // name is a file
        var path = name.split("/");
    }
    // check name is direct subdir/file of curdir
    return ((curdir == "" && path.length == 1) || (curdir != "" && path.length >=2 && path.indexOf(curdirName) == path.length - 2));
}

function humanReadableFileSize(size) {
    if ( size == 0 ) {
        return "0 B"
    } else {
        var i = Math.floor( Math.log(size) / Math.log(1024) );
        return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    }
};

function getParentURL() {
    var curdirArr = curdirName.split("/");
    return getDirURL(curdirArr.slice(0, curdirArr.length - 1).join("/"));
}

function getDirURL(dirName) {
    var dirParam = ["s", dirName].join("=");
    return "index.html?" + [getSortParams(), dirParam].join("&");
}

function getSortParams() {
    var querystring = location.search.substring(1);
    var sortParamsArr = new Array();
    if (querystring) {
        var params = querystring.split("&");
        var i = 0;
        for (var p in params) {
            if ( params[p].split("=")[0] != "s" ) {
                sortParamsArr[i] = params[p];
                i++
            }
        }
    }
    return sortParamsArr.join("&");
}

function addCurdir2Params(someParams) {
    var dirParam = ["s", curdir].join("=");
    return [someParams, dirParam].join("&");
}
function getArrow() {
    var direction = getQueryVariable("sortdir");
    switch (direction) {
        case "asc":
            return "&#x25BC;";
            break;
        case "desc":
            return "&#x25B2;";
            break;
        default:
            return "";
    }
}
function getLink(colID) {
    var colName = colID.charAt(0).toUpperCase() + colID.slice(1);
    var label = ( cursort == colID ) ? colName + getArrow() : colName;
    return "<A HREF=\"index.html?" + addCurdir2Params("sort=" + colID + "&sortdir=" +getNextSortDir(colID)) +"\">" + label + "</A>";
}
function getListHeader(){
    var colArr = ["name", "size", "lastmod"];
    var cells = ""
    for (var i = 0; i < colArr.length; i++) {
       cells +=  "<th>" + getLink(colArr[i]) + "</th>";
    }
    return "<tr>" + cells + "</tr>" ;
}

/* ------------------------------------------ */
/* Sorting function                           */
/* ------------------------------------------ */
function sortSize(a,b) {
   if(parseInt(a[1]) > parseInt(b[1])) return 1;
   if(parseInt(a[1]) < parseInt(b[1])) return -1;
   return 0;
 }
function sortSizeDesc(a,b) { return (-sortSize(a,b)); }
function sortLastmod(a,b) {
   if(a[2] > b[2]) return 1;
   if(a[2] < b[2]) return -1;
   return 0;
}
function sortLastmodDesc(a,b) { return (-sortLastmod(a,b)); }

function sortName(a,b) {
   if(a[0] > b[0]) return 1;
   if(a[0] < b[0]) return -1;
   return 0;
}
function sortNameDesc(a,b) { return -sortName(a,b); }

function getSort(){
  var s = getQueryVariable("sort");
  var d = getQueryVariable("sortdir");
  if(s=='size'){ return d == 'desc' ? sortSizeDesc : sortSize};
  if(s=='name'){ return d == 'desc' ? sortNameDesc : sortName};
  if(s=='lastmod'){ return d == 'desc' ? sortLastmodDesc : sortLastmod};
  return sortName;
}

function getNextSortDir(sortCol){
  if (sortCol == getQueryVariable("sort"))
      return getQueryVariable("sortdir") == 'desc' ? 'asc' : 'desc';
  return 'asc'
}
