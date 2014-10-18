'use strict';

/* Controllers */

var mainController = angular.module('mainController', []);

// Controller for the app
mainController.controller('MainCtrl', ['$scope', '$http', '$filter',
        function ($scope, $http, $filter) {

            /********** Members and Variables ***************************************/

            // Loading 
            $scope.doneLoading = false;
            var isUpdating = false;

            // Filtering
            var displayedData = [];
            var filteredData = [];

            $scope.searchesShown = {
                "Main": 1
            };
            $scope.showSearch = {
                "Main": { 0: true, 1: false, 2: false, 3: false, 4: false }
            };
            $scope.query = {
                "Main": { 0: "", 1: "", 2: "", 3: "", 4: "" }
            };
            $scope.resultsCount = {
                "Main": 0
            };

            // Mapping column names to item attributes
            var mainAttributesMap = {
                "Champion": "championName",
                "Items": "items",
                "Spells": "spells"
            };

            // Sorting
            $scope.collapseChar = {
                "Main": { "championName": '\u25b2' }
            };
            $scope.predicate = {
                "Main": 'championName'
            };
            $scope.reverse = {
                "Main": false
            };

            // Pagination
            $scope.pagedItems = [];
            $scope.itemsPerPage = { value: 5 };
            $scope.currentPage = { value: 0 };
            $scope.numItemsDisplayed = 100;
            $scope.newPage = {};
            $scope.percentToDisplay = { value: 0.1 };

/********** On Startup **************************************************/

            // Set up timer to update the list every 5 seconds
            setInterval(scheduledUpdate, (1000 * 60 * 5));

/********** Functions ***************************************************/

/********** Loading **********************/

            // Every time the timer elapses, updates the data from the BE
            function scheduledUpdate() {
                isUpdating = true;
                $scope.doneLoading = false;
                $scope.grabData();
            }

            // Calls the BE API to get the data then displays them
            $scope.grabData = function () {
                $http.get("https://api.mongolab.com/api/1/databases/leagueapp/collections/Champions?apiKey=LbdsOrwTL5008Fb-T4TLQMtnFaXFI7D-").success(function (data) {
                    $scope.data = data;

                    filteredData = $scope.data;
                    $scope.search('Main');

                    if (isUpdating) {
                        isUpdating = false;
                    }

                    $scope.doneLoading = true;
                });
            }

/********** Filtering **********************/

            // Hides and disables a search
            $scope.removeSearch = function (index, tableName) {
                $scope.query[tableName][index] = "";
                $scope.showSearch[tableName][index] = false;
                $scope.search(tableName);
                $scope.searchesShown[tableName]--;
            }

            // Adds and enables a search
            $scope.addSearch = function (tableName) {
                for (var visible in $scope.showSearch[tableName]) {
                    if (!$scope.showSearch[tableName][visible]) {
                        $scope.showSearch[tableName][visible] = true;
                        break;
                    }
                }
                $scope.searchesShown[tableName]++;
            }

            // Returns true if any data member in item contains query
            var searchMatchAll = function (item, query) {
                if (!query) {
                    return true;
                }

                var doesContain = false;
                for (var column in item) {
                    var compare = item[column];

                    if (compare instanceof Object || compare instanceof Array) {
                        if (searchMatchAll(compare, query)) {
                            doesContain = true;
                            break;
                        }
                    }

                    if (compare.toString().toLowerCase().indexOf(query.toString().toLowerCase()) !== -1) {
                        doesContain = true;
                        break;
                    }
                }

                return doesContain;
            };

            // Returns true if a specific data member in item contains query
            var searchMatchOne = function (item, query, attribute, attributeMap, matchWholeWord) {
                var attributeMapping = attributeMap[attribute];

                if (!query) {
                    return true;
                }

                var doesContain = false;

                var compare = item[attributeMapping];

                if (compare instanceof Object || compare instanceof Array) {
                    for (var index in compare) {
                        if (searchMatchAll(compare[index], query)) {
                            doesContain = true;
                            break;
                        }
                    }
                }
                else {
                    if (!matchWholeWord) {
                        if (compare.toString().toLowerCase().indexOf(query.toString().toLowerCase().trim()) !== -1) {
                            doesContain = true;
                        }
                    }
                    else {
                        if (compare.toString().toLowerCase() === query.toString().toLowerCase().trim()) {
                            doesContain = true;
                        }
                    }
                }

                return doesContain;
            };

            // Filters the list of data based on all enabled searches
            $scope.search = function (tableName) {
                if (tableName === 'Main') {

                    displayedData = $filter('filter')(filteredData, function (data) {
                        var result = true;
                        for (var word in $scope.query['Main']) {
                            var tokens = $scope.query['Main'][word].split(":");
                            if (tokens.length === 2) {
                                if (!searchMatchOne(data, tokens[1], tokens[0], mainAttributesMap, false)) {
                                    result = false;
                                    break;
                                }
                            }
                            else {
                                if (!searchMatchAll(data, $scope.query['Main'][word])) {
                                    result = false;
                                    break;
                                }
                            }
                        }
                        return result;
                    });

                    // Take care of the sorting order
                    if ($scope.predicate['Main'] !== '') {
                        displayedData = $filter('orderBy')(displayedData, $scope.predicate['Main'], $scope.reverse['Main']);
                    }

                    $scope.resultsCount['Main'] = displayedData.length;

                    if (!isUpdating) {
                        $scope.currentPage.value = 0;
                    }

                    // Now group by pages
                    $scope.groupToPages();
                    $scope.newPage.value = $scope.currentPage.value + 1;
                }
            };

/********** Sorting ************************/

            // Sorts a list by columnName.  Reverses the list if already being sorted by columnName
            $scope.sort_by = function (columnName, tableName) {
                if ($scope.predicate[tableName] === columnName) {
                    $scope.reverse[tableName] = !$scope.reverse[tableName];
                }

                $scope.predicate[tableName] = columnName;

                if ($scope.reverse[tableName]) {
                    $scope.setChar = '\u25bc';
                }
                else {
                    $scope.setChar = '\u25b2';
                }

                for (var attribute in $scope.collapseChar[tableName]) {
                    $scope.collapseChar[tableName][attribute] = '';
                }

                $scope.collapseChar[tableName][columnName] = $scope.setChar;

                if (tableName === 'Main') {
                    var currPage = $scope.currentPage.value;

                    $scope.search(tableName);
                    $scope.currentPage.value = currPage;
                    $scope.newPage.value = currPage + 1;
                }
            };

/********** Pagination *********************/

            // Splits the list of data into pages based on $scope.itemsPerPage.value
            $scope.groupToPages = function () {
                $scope.pagedItems = [];

                if ($scope.itemsPerPage.value != 0) {
                    for (var i = 0; i < displayedData.length; i++) {
                        if (i % $scope.itemsPerPage.value == 0) {
                            $scope.pagedItems[Math.floor(i / $scope.itemsPerPage.value)] = [displayedData[i]];
                        }
                        else {
                            $scope.pagedItems[Math.floor(i / $scope.itemsPerPage.value)].push(displayedData[i]);
                        }
                    }
                }
                else {
                    $scope.pagedItems[0] = displayedData;
                }
            };

            // Navigates to the next page
            $scope.nextPage = function () {
                if ($scope.currentPage.value < $scope.pagedItems.length - 1) {
                    $scope.currentPage.value++;
                }
                $scope.newPage.value = $scope.currentPage.value + 1;
            };

            // Navigates to the previous page
            $scope.prevPage = function () {
                if ($scope.currentPage.value > 0) {
                    $scope.currentPage.value--;
                }
                $scope.newPage.value = $scope.currentPage.value + 1;
            };

            // Navigates to a specific page
            $scope.goToPage = function (number) {
                var page = parseInt(number);
                $scope.currentPage.value = (page - 1);
            }

            // Reveals 25 more items when the 'More' button is pressed
            $scope.increaseDisplayLimit = function () {
                $scope.numItemsDisplayed += 25;
            };

            // Resets the # limit of displayed items to 100
            $scope.changeResultsPerPage = function () {
                $scope.numItemsDisplayed = 100;
                $scope.search('Main');
            };

            // Changes the minimum % wins to show an item or spell
            $scope.changePercentDisplay = function () {
                $scope.isUpdating.value = true;
                $scope.search('Main');
                $scope.isUpdating.value = false;
            };

            $scope.shouldShow = function (item, parent) {
                if((item.count / parent.totalWins) >= $scope.percentToDisplay.value)
				{
                    return true;
                }
				else
				{
					return false;
				}
            }

			$scope.getStyle = function (xCoord, yCoord, ISprite) {
				return 'url("http://ddragon.leagueoflegends.com/cdn/4.4.3/img/sprite/' + ISprite + ') ' + xCoord + 'px ' + yCoord + 'px no-repeat';
			};

            $http.get("https://api.mongolab.com/api/1/databases/leagueapp/collections/ItemIds?apiKey=LbdsOrwTL5008Fb-T4TLQMtnFaXFI7D-").success(function (data) {
                $scope.itemIds = data;
                $scope.grabData();
            });
        }]);