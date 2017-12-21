'use strict';

moment.locale( myUtil.getBrowserLang() );

(function () {
    
    const initPage = "INITIAL",
          summaryPage = "SUMMARY",
          detailPage = "DETAIL"
          ;

    var app = angular.module('usageAnaApp', [ 'ui.bootstrap', 'pascalprecht.translate', 'chart.js', 'angular.filter' ]),
        lang,
        initUri = 'http://mo-0a20d9d7b.mo.sap.corp:8006/sap/bc/zwdyn_usages?mode=INIT',
        summaryUri = 'http://mo-0a20d9d7b.mo.sap.corp:8006/sap/bc/zwdyn_usages?mode=SUMMARY',
        detailUri = 'http://mo-0a20d9d7b.mo.sap.corp:8006/sap/bc/zwdyn_usages?mode=DETAIL',
        createPage,
        getJson,
        setInit,
        setSummary,
        setDetail,
        procInit,
        procSummary,
        procDetail,
        createPivot,
        renderOptions = {},
        filterData = {},
        initPivotOptions,
        handlePageFlags
        ;

    app.config(['$translateProvider', function( $translateProvider ) {
        $translateProvider.useStaticFilesLoader({
            prefix : 'lang/lang_',
            suffix : '.json'
        });
        $translateProvider.preferredLanguage( lang = myUtil.getBrowserLang() === undefined ? "en" : myUtil.getBrowserLang() );
        //$translateProvider.useSanitizeValueStrategy('escape');
        $translateProvider.useSanitizeValueStrategy(null); // In order to show "&" with cording style {{ "text" | translate }}
    }]);

    app.controller('MainCtrl', ['$scope', '$http', '$uibModal', '$translate', function( $scope, $http, $uibModal, $translate ) {

        var showSummary,
            showDetail
            ;

        $scope.isBtnSummary = false; $scope.isBtnDetail = false;

        // For Language
        $scope.languages = {
            en : "English", 
            ja: "日本語"
        };
        $scope.currentLang = $scope.languages[$translate.proposedLanguage()];

        // For Accordion
        $scope.oneAtATime = true;
        $scope.status = {
            isCustomHeaderOpen: false,
            isFirstOpen: true,
            isFirstDisabled: false
        };
        // For Lanaguage Selection
        $scope.selectLang = function ( langKey )
        {
            $translate.use( langKey );
            $scope.currentLang = $scope.languages[$translate.proposedLanguage()];

            //$scope.summaryMode = setIndirMsg( $scope.radioModel, $translate );
        };

        // For Table Sort/Filter
        $scope.summarySortType = 'OBJECT';    // Default Sort Type in Summary Table.
        $scope.summarySortReverse = false;      // Default Sort Order in Summary Table.
        $scope.summarySearchObj = '';           // Default Search/Filter Term.


        //getJson( $scope, $http, initUri, setInit );
        $scope.readInitial = function () { createPage( initPage, $scope, $http, initUri, setInit); };
        $scope.readSummary = function ( sid, rfcDes ) { createPage( summaryPage, $scope, $http, summaryUri, setSummary, sid, rfcDes ); };
        $scope.readDetail = function () { createPage( detailPage, $scope, $http, detailUri, setDetail ); };

        $scope.readInitial();

    }]); // End of app.controller


    // ==========================================================================
    // Functions out of app.controller scope.
    // ==========================================================================
    initPivotOptions = function () {
        renderOptions = {
            rows: undefined,
            cols: undefined,
            vals: undefined,
            aggregatorName: undefined,
            rendererName: undefined
        };

        filterData = {
            pivotItemName: undefined,
            pivotItemValue: undefined
        };
    };

    createPage = function( mode, scope, http, v_uri, callback, sid, rfcDes ) {

        var jsonData,
            isInitial,
            isSummary;

        // From the initial page
        if ( sid !== undefined ) {
            // 1st time of selection from the initial page 
            if ( scope.currentSID === undefined ) {
                scope.currentSID = sid;
            }
            // 2nd time of selection from the initial page
            else {
                // Different SID from the previous time was chosen.
                if ( sid !== scope.currentSID ) {
                    scope.summaryResults = undefined;
                    scope.detailResults = undefined;
                    scope.currentSID = sid;
                }
            }
        }
        // From the detail page ("sid" was not passed)
        else {
            // No sid variant, and no scope.currentSID
            if ( scope.currentSID === undefined ) {
                // This case should not be happened.
            }
            // Back to the summary page from the detail page. Set the currentSID to sid.
            else {
                sid = scope.currentSID;
            }
        }

        switch ( mode ) {
            case initPage:
                scope.isBtnInitial = true; scope.isBtnSummary = false; scope.isBtnDetail = false;
                isInitial = true; isSummary = false;
                jsonData = scope.repoData;
                break;
            case summaryPage:
                scope.isBtnInitial = false; scope.isBtnSummary = true; scope.isBtnDetail = false;
                isInitial = false; isSummary = true;
                jsonData = scope.summaryResults;
                v_uri += '&rfcdes=' + rfcDes;
                scope.currentSID = sid;
                break;
            case detailPage:
                scope.isBtnInitial = false; scope.isBtnSummary = false; scope.isBtnDetail = true;
                isInitial = false; isSummary = false;
                jsonData = scope.detailResults;
                v_uri += '&sid=' + sid;
                break;
        }

        if ( jsonData === undefined ) {
            getJson ( scope, http, v_uri, callback );
        }
        else {
            console.log ("JSON Data is already exist and the page has been created once before. So the page creation process is omitted.");

            //callback( scope, jsonData )

            // These changing flags are possible to do in the SWITCH satement above,
            // but if it is executed in the SWITCH statement, showing empty page in a few seconds, 
            // that's why changing flags are exected here.
            if ( isInitial ) {
                handlePageFlags ( scope, initPage ); 
            }
            else if ( isSummary ) {
                handlePageFlags ( scope, summaryPage );
            }
            else {
                handlePageFlags ( scope, detailPage );
            }

        }
    };

    getJson = function ( scope, http, v_uri, callback ) {

        console.log( "Get JSON data from " + v_uri );

        http({
            method: 'GET',
            url: v_uri,
            headers: {
                //'x-requested-with': 'XMLHttpRequest',
                //'x-csrf-token': 'Fetch',
                //'Authorization': 'Basic U1VZQU1BVDp0ZXN0MTIzNA==',
                'Content-Type': 'application/json'                    
            }
        }).then( function( response ){
            //console.log(response.headers('x-csrf-token'));
            console.log("GET method finished. Next is the processing of JSON data");
            callback( scope, JSON.parse( JSON.stringify(response.data) ) );
        })
        .catch( function( response ) {
            // Error handling
            console.log( response.data.status );
        });
    };

    handlePageFlags = function ( scope, mode ) {
        switch ( mode ) {
            case initPage:
                scope.showHdrBtns = false;
                scope.showInit = true; scope.showSummary = false; scope.showDetail = false; 
                break;
            case summaryPage:
                scope.showHdrBtns = true;
                scope.showInit = false; scope.showSummary = true; scope.showDetail = false; 
                break;
            case detailPage:
                scope.showHdrBtns = true;
                scope.showInit = false; scope.showSummary = false; scope.showDetail = true; 
                break; 
        }
    };

    setInit = function( scope, jsonData ) {
        handlePageFlags ( scope, initPage ); 
        scope.repoData = jsonData; 
        procInit( scope ); 
    };

    setSummary = function( scope, jsonData ) {
        handlePageFlags ( scope, summaryPage ); 
        scope.summaryResults = jsonData; 
        procSummary( scope ); 
    };

    setDetail = function( scope, jsonData ) {
        handlePageFlags ( scope, detailPage ); 
        scope.detailResults = jsonData; 
        procDetail( scope ); 
    };

    procInit = function ( scope )
    {
        var recentRepoArray = [],
            addDataSet = {},
            recentSID,
            recentDate,
            recentWdynCnt,
            recentWdyaCnt,
            recDateBySID = [],
            wdynCntBySID = [],
            wdyaCntBySID = [],
            repoDataLength,
            _pushRecentInfoArray,
            _pushObjCntArray
            ;

        scope.repoOptions = { 
            responsive: true,
            scales: {
                yAxes: [{
                    display: true,
                    ticks: {
                        min: 0
                    }
                }],
                xAxes: [{
                    display: true,
                    ticks: {
                        fontSize: 11
                    }
                }],
            },
            elements: {
                line: {
                    fill: false
                }
            }
        };
        scope.repoSeries = ["WDYN", "WDYA"];
        scope.repoColors =["#5f9ea0", "#ffa500"];

        repoDataLength = scope.repoData.length - 1;

        _pushRecentInfoArray = function ( sid, recDate, wdynCnt, wdyaCnt, rfcDes, recDates, wdynHist, wdyaHist ) {
            addDataSet = { SYSTEMID: sid, 
                           RECENT_DATE: recDate, 
                           RECENT_WDYNCNT: wdynCnt, 
                           RECENT_WDYACNT: wdyaCnt,
                           RECENT_RFCDES: rfcDes,
                           REC_DATES: recDates,
                           OBJS_CNT: [ wdynHist, wdyaHist ] };

            recentRepoArray.push( addDataSet );
        }

        _pushObjCntArray = function ( recDate, wdynCnt, wdyaCnt ) {
            recDateBySID.push( recDate );
            wdynCntBySID.push( wdynCnt );
            wdyaCntBySID.push( wdyaCnt );
        };


        for ( var i in scope.repoData ){

            if ( i != 0 && scope.repoData[i].SYSTEMID !== scope.repoData[i -1].SYSTEMID ) {

                _pushRecentInfoArray( scope.repoData[i - 1].SYSTEMID,
                                      scope.repoData[i - 1].RECDATE,
                                      scope.repoData[i - 1].WDYN_CNT,
                                      scope.repoData[i - 1].WDYA_CNT,
                                      scope.repoData[i - 1].USED_RFC_DEST,
                                      recDateBySID,
                                      wdynCntBySID,
                                      wdyaCntBySID );

                recDateBySID = [];
                wdynCntBySID = [];
                wdyaCntBySID = [];
                _pushObjCntArray( scope.repoData[i].RECDATE, scope.repoData[i].WDYN_CNT, scope.repoData[i].WDYA_CNT );

            }
            else if ( i == repoDataLength ){
                _pushObjCntArray( scope.repoData[i].RECDATE, scope.repoData[i].WDYN_CNT, scope.repoData[i].WDYA_CNT );
                
                _pushRecentInfoArray( scope.repoData[i].SYSTEMID,
                                      scope.repoData[i].RECDATE,
                                      scope.repoData[i].WDYN_CNT,
                                      scope.repoData[i].WDYA_CNT,
                                      scope.repoData[i].USED_RFC_DEST,
                                      recDateBySID,
                                      wdynCntBySID,
                                      wdyaCntBySID );
                
            }
            else {
                _pushObjCntArray( scope.repoData[i].RECDATE, scope.repoData[i].WDYN_CNT, scope.repoData[i].WDYA_CNT );
            }
        }

        scope.recentRepoData = recentRepoArray;

    };


    procSummary = function ( scope )
    {
        var rowGeneral = ["DEVCLASS", "AUTHOR", "OBJECT", "OBJ_NAME", "CREATED_ON"],
            rowPkg = ["DEVCLASS"],
            rowAuthor = ["AUTHOR"],
            colObjType = ["OBJECT"],
            colUsedFlag = ["USED_FLAG"]
            ;

        scope.usageLabels = ["Used", "Not Used"];
        scope.usageColors = ["#3CB371", "#CD5C5C"];
        scope.options = { responsive: false };

        //scope.chartHeight = window.innerHeight * 0.12;
        //scope.chartWidth = window.innerWidth * 0.12;

        scope.usedObjCnt = scope.summaryResults.filter( function( elem ){ return elem.USED_FLAG === "X"; }).length;
        scope.unUsedObjCnt = scope.summaryResults.filter( function( elem ){ return elem.USED_FLAG === ""; }).length;
        scope.usageData = [ scope.usedObjCnt, scope.unUsedObjCnt ];

        scope.usedObjCntWdyn = scope.summaryResults.filter( function( elem ){ return elem.USED_FLAG === "X" && elem.OBJECT === "WDYN"; }).length;
        scope.unUsedObjCntWdyn = scope.summaryResults.filter( function( elem ){ return elem.USED_FLAG === "" && elem.OBJECT === "WDYN"; }).length;
        scope.usageDataWdyn = [ scope.usedObjCntWdyn, scope.unUsedObjCntWdyn ];

        scope.usedObjCntWdya = scope.summaryResults.filter( function( elem ){ return elem.USED_FLAG === "X" && elem.OBJECT === "WDYA"; }).length;
        scope.unUsedObjCntWdya = scope.summaryResults.filter( function( elem ){ return elem.USED_FLAG === "" && elem.OBJECT === "WDYA"; }).length;
        scope.usageDataWdya = [ scope.usedObjCntWdya, scope.unUsedObjCntWdya ];

        // Reset renderOptions.
        initPivotOptions();

        // For Used Objects
        filterData.pivotItemName = "USED_FLAG";
        filterData.pivotItemValue = "X";

        renderOptions.rows = rowGeneral; renderOptions.rendererName = "Heatmap";
        createPivot( scope.summaryResults, "#sumUsedObjTab", renderOptions, filterData );

        renderOptions.rows = rowPkg; renderOptions.cols = colObjType;
        createPivot( scope.summaryResults, "#sumUsedObj_pkg", renderOptions, filterData );

        renderOptions.rendererName = "Horizontal Stacked Bar Chart";
        createPivot( scope.summaryResults, "#sumUsedObj_pkgChart", renderOptions, filterData );

        renderOptions.rows = rowAuthor; renderOptions.rendererName = "Heatmap";
        createPivot( scope.summaryResults, "#sumUsedObj_author", renderOptions, filterData );

        renderOptions.rendererName = "Horizontal Stacked Bar Chart";
        createPivot( scope.summaryResults, "#sumUsedObj_authorChart", renderOptions, filterData );


        // Reset renderOptions.
        initPivotOptions();
        // For Not Used Objects
        filterData.pivotItemName = "USED_FLAG";
        filterData.pivotItemValue = "";

        renderOptions.rows = rowGeneral; renderOptions.rendererName = "Heatmap";
        createPivot( scope.summaryResults, "#sumNotUsedObjTab", renderOptions, filterData);
        
        renderOptions.rows = rowPkg; renderOptions.cols = colObjType;
        createPivot( scope.summaryResults, "#sumNotUsedObj_pkg", renderOptions, filterData );
        
        renderOptions.rendererName = "Horizontal Stacked Bar Chart";
        createPivot( scope.summaryResults, "#sumNotUsedObj_pkgChart", renderOptions, filterData );
        
        renderOptions.rows = rowAuthor; renderOptions.rendererName = "Heatmap";
        createPivot( scope.summaryResults, "#sumNotUsedObj_author", renderOptions, filterData );
        
        renderOptions.rendererName = "Horizontal Stacked Bar Chart";
        createPivot( scope.summaryResults, "#sumNotUsedObj_authorChart", renderOptions, filterData );


        // Free Selection
        filterData.pivotItemName = undefined;
        renderOptions.rows = rowGeneral; renderOptions.cols = colUsedFlag; renderOptions.rendererName = "Table";
        createPivot( scope.summaryResults, "#sumFreeSelectTab", renderOptions, filterData );
    };


    procDetail = function ( scope ) 
    {
        var itemWdyaWdyn = ["WDYA_NAME", "WDYN_NAME"],
            itemWdya = ["WDYA_NAME"],
            itemUser = ["RUNBY"],
            valueItems = ["COUNTER"]
            ;

        // Reset renderOptions.
        initPivotOptions();

        // Execution with respect to objects
        renderOptions.rows = itemWdyaWdyn; renderOptions.vals = valueItems; 
        renderOptions.aggregatorName = "Integer Sum"; renderOptions.rendererName = "Heatmap"; 
        createPivot( scope.detailResults, "#usageExecCnt", renderOptions, filterData );

        renderOptions.rows = itemWdya; renderOptions.rendererName = "Horizontal Bar Chart";
        createPivot( scope.detailResults, "#usageExecCnt_chart", renderOptions, filterData );

        // Execution with respect to objects
        renderOptions.rows = itemUser; renderOptions.rendererName = "Heatmap"; 
        createPivot( scope.detailResults, "#usageExecUser", renderOptions, filterData );

        renderOptions.rendererName = "Horizontal Bar Chart"; 
        createPivot( scope.detailResults, "#usageExecUser_chart", renderOptions, filterData );

        // Free selection pivot table
        renderOptions.rows = itemWdyaWdyn; renderOptions.rendererName = "Table";
        createPivot( scope.detailResults, "#detailFreeSelectTab", renderOptions, filterData );

    };

    createPivot = function ( json, divID, renderOptions, filterSet )
    {
        var derivers = $.pivotUtilities.derivers,
            pivotOptions
            ;

        pivotOptions = {
            renderers: $.extend(
                $.pivotUtilities.renderers,
                $.pivotUtilities.c3_renderers
                ),
            rendererOptions: {
                heatmap: {
                    colorScaleGenerator: function( values ) {
                        return d3.scale.linear()
                            .domain( [d3.min(values), d3.max(values)] )
                            .range( ["#ffffff", "#f08080"] )
                    }
                }
            }
        };

        for ( var key in renderOptions ) {
            if ( renderOptions[key] !== undefined ){
                var value = renderOptions[key];
                pivotOptions[key] = renderOptions[key];
            }
        };

        if ( pivotOptions.rendererName.match( /Chart/ ) ){
            pivotOptions.rendererOptions.c3 = { size:{ height: 400, width: 600 } };
            pivotOptions.rendererOptions.c3.color = { pattern: ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'] };
        };

        if ( filterSet.pivotItemName !== undefined ){
            // I don't know why but it is necessary to assign the value to the another variant for correct processing of next statement.
            var item = filterSet.pivotItemName,
                val = filterSet.pivotItemValue;

            pivotOptions.filter = function( record ){ return record[ item ] === val; };
        };

        // Generating Pivot 
        $(divID).pivotUI( json, pivotOptions );

    };

})();
