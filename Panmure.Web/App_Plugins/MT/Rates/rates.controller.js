var app = angular.module("umbraco");


app.filter("startsInYear", function () {
    return function (items, y) {
        var filtered = [];
        var j = 0;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (new Date(item.fromDate).getFullYear() === y) {

                filtered.push(item);
                filtered[j++].index = i;
            }
        }

        // sort filtered by from date?
        filtered.sort(function (a, b) {
            var dateA = new Date(a.fromDate), dateB = new Date(b.fromDate);
            return dateA - dateB;
        });

        return filtered;
    };
});


app.controller("MT.Rates.RatesController",
    function($scope, notificationsService) {


        // default settings for new nodes
        var defaultData = {
            minGuests: 2,
            maxGuests: 4,
            rates: []
        };



        // seed some test data for now
        var dummyData = {
            minGuests: 2,
            maxGuests: 4,
            rates: [
                {
                    "fromDate": "2018-05-01",
                    "minimumStay": 5,
                    "prices": [
                        {},
                        {},
                        {
                            "ratePounds": 300,
                            "rateEuros": 350
                        },
                        {
                            "ratePounds": 314,
                            "rateEuros": 365
                        },
                        {
                            "ratePounds": 328,
                            "rateEuros": 370
                        }
                    ]
                },
                {
                    "fromDate": "2018-01-01",
                    "minimumStay": 5,
                    "prices": [
                        {},
                        {},
                        {
                            "ratePounds": 280,
                            "rateEuros": 330
                        },
                        {
                            "ratePounds": 290,
                            "rateEuros": 340
                        },
                        {
                            "ratePounds": 300,
                            "rateEuros": 350
                        }
                    ]
                },
                {
                    "fromDate": "2017-12-01",
                    "minimumStay": 3,
                    "prices": [
                        {},
                        {},
                        {
                            "ratePounds": 250,
                            "rateEuros": 300
                        },
                        {
                            "ratePounds": 260,
                            "rateEuros": 310
                        },
                        {
                            "ratePounds": 270,
                            "rateEuros": 320
                        }
                    ]
                }
            ]
        };

        // issue in V8 with initiating the JSON - see this URL:
        // https://our.umbraco.com/forum/umbraco-8/96478-custom-property-editor-with-valuetype-json
        var initModelValue = $scope.$watch('model.value', function (model) {
            if (typeof model === 'string' && model.length == 0)
                $scope.model.value = defaultData;
            initModelValue(); //Deregisters the watch so we wont waste resources
        });


        // force the dummy data for now, for test purposes
        // $scope.model.value = dummyData;


        function calculateAllYears() {
            // need to get all distinct years from rates to populate dropdown
            $scope.allYears = [];
            for (var x = 0; x < $scope.model.value.rates.length; x++) {
                var thisYear = new Date($scope.model.value.rates[x].fromDate).getFullYear();
                if ($scope.allYears.indexOf(thisYear) === -1) {
                    $scope.allYears.push(thisYear);
                }
            }

            $scope.allYears.sort(function (a, b) {
                return a - b;
            });
        }


        // use current year as the default view filter
        $scope.showYear = new Date().getFullYear();
        $scope.allYears = [];

        if ($scope.model.value.rates) {

            // ensure all rates are sorted by start date
            $scope.model.value.rates.sort(function (a, b) {
                var dateA = new Date(a.fromDate), dateB = new Date(b.fromDate);
                return dateA - dateB;
            });

            calculateAllYears();

            // if the default current year isn't in the list, then use the most recent one (the last in the list)
            if ($scope.allYears.indexOf($scope.showYear) === -1) {
                $scope.showYear = $scope.allYears[$scope.allYears.length - 1];
            }

        }



        // date picker options for existing rows

        $scope.defaultDateTimeConfig = {
            weekNumbers: true,
            altInput: true,
            altFormat: "F j, Y",
            dateFormat: "Y-m-d",
            onChange: function(selectedDates, dateStr, instance) {

                var rootIndex = instance.element.parentElement.parentElement.getAttribute('data-index'); // hacky, much?
                $scope.model.value.rates[rootIndex].fromDate = dateStr;

                // set current year to this one
                var thisYear = new Date(dateStr).getFullYear();
                if (thisYear !== $scope.showYear) {
                    $scope.showYear = thisYear;
                }

                calculateAllYears();

            },
            onReady: function () {
                console.log("setting date...");
                console.log(this);
                this.setDate(new Date(this.element.parentElement.parentElement.getAttribute('value')));
            }
        };




        // check for changes in sleepsTo to pad objects ready to store values

        $scope.$watch("model.value.maxGuests",
            function (newValue, oldValue, scope) {
                for (var i = 0; i < $scope.model.value.rates.length; i++) {

                    if ($scope.model.value.rates[i].prices.length <= newValue) {

                        // padding - create new empty objects ready to store values

                        for (var x = $scope.model.value.rates[i].prices.length; x <= newValue; x++) {
                            $scope.model.value.rates[i].prices.push({});
                        }

                    } else if ((newValue < oldValue) && ((newValue + 1) < $scope.model.value.rates[i].prices.length)) {

                        // trimming - remove any *empty* price objects at the end of the array
                        // don't remove any objects that have data in them, in case the
                        // value is increased later; need the data to be persistent

                        var lastIndex = $scope.model.value.rates[i].prices.length - 1;
                        var lastObjectEmpty = isEmpty($scope.model.value.rates[i].prices[lastIndex]);

                        while (lastObjectEmpty && lastIndex > newValue) {
                            $scope.model.value.rates[i].prices.pop();
                            lastIndex--;
                            lastObjectEmpty = isEmpty($scope.model.value.rates[i].prices[lastIndex]);
                        }

                    }
                }

                //$scope.$apply();

            });



        $scope.getNumber = function (num) {
            return new Array(num + 1);
        };






        // adding a new row
        $scope.newMinNights = 1;
        $scope.newPounds = [];
        $scope.newEuros = [];


        $scope.newDateTimeConfig = {
            weekNumbers: true,
            altInput: true,
            altFormat: "F j, Y",
            altInputClass: "rates-datepicker",
            dateFormat: "Y-m-d",
            onChange: function (selectedDates, dateStr, instance) {
                $scope.newFromDate = dateStr;
            }
        };


        $scope.addRates = function () {

            if ($scope.newFromDate) {

                var newRow = {};

                newRow.fromDate = $scope.newFromDate;
                newRow.minNights = $scope.newMinNights;
                newRow.prices = [];


                for (var i=0; i <= $scope.model.value.maxGuests; i++) {

                    var newPrices = {};
                    newPrices.ratePounds = $scope.newPounds[i];
                    newPrices.rateEuros = $scope.newEuros[i];

                    newRow.prices.push(newPrices);

                    // clear the form as you go
                    $scope.newPounds[i] = null;
                    $scope.newEuros[i] = null;
                }

                $scope.model.value.rates.push(newRow);


                // set current year to this one
                var thisYear = new Date($scope.newFromDate).getFullYear();
                if (thisYear !== $scope.showYear) {
                    $scope.showYear = thisYear;
                }

                calculateAllYears();


                // leave the date picker with the date in it
                // to make it easier to add the date in the next new row (which should be near-ish to the one just added)
                // plus, not sure how to clear the picker from here anyway ;-)


                // success notification
                // maybe a bit too in-your-face?
                // notificationsService.success('Rates added', "New rates added to the list successfully - don't forget to save and publish!");


            } else {

                // use notification service to show an error
                notificationsService.warning('No date selected', 'You must select a starting date before adding the rates.');

            }

        };





        // removing a row

        $scope.removeRates = function (rate) {

            if (confirm("Are you sure you want to remove this row?")) {

                var thisYear = new Date(rate.fromDate).getFullYear();

                $scope.model.value.rates.splice($scope.model.value.rates.indexOf(rate), 1);

                calculateAllYears();

                // if the current year is no longer in the list, show the latest year
                if (($scope.allYears.length > 0) && ($scope.allYears.indexOf(thisYear) === -1)) {
                    $scope.showYear = $scope.allYears[$scope.allYears.length - 1];
                }

            }

        };


    }
);