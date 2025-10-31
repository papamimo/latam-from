var app = angular.module("LatamApp", ["ngRoute", "ui.router"]);

app.run(function ($rootScope, $templateCache) {
  $rootScope.$on("$routeChangeStart", function (event, next, current) {
    if (typeof current !== "undefined") {
      $templateCache.remove(current.templateUrl);
    }
  });
});

//Configuración de la app
app.config([
  "$stateProvider",
  "$urlRouterProvider",
  "$locationProvider",
  "$routeProvider",
  function (
    $stateProvider,
    $urlRouterProvider,
    $locationProvider,
    $routeProvider
  ) {
    $stateProvider.state("/", {
      url: "",
      cache: false,
      templateUrl: "views/home.html",
      controller: "indexController",
    });

    $stateProvider.state("/Vuelopick", {
      url: "/booking/vueloOrigen=:date1&vueloRegreso=:date2&tipoVuelo=:type&pasajeros=:passagers&aeroOrigen=:origin&aeroDestino=:destiny",
      cache: false,
      templateUrl: "views/newflight.html",
      controller: "fligthsController",
    });

    $stateProvider.state("/ReviewVuelo", {
      url: "/booking/cardId=:cart&pointOfSale=:pos&language=:lang",
      cache: false,
      templateUrl: "views/confirmf.html",
      controller: "reviewPickController",
    });

    $stateProvider.state("/ReviewFinal", {
      url: "/booking/cardId=:cart&pointOfSale=:pos&language=:lang",
      cache: false,
      templateUrl: "views/review.html",
      controller: "reviewFinalController",
    });

    $stateProvider.state("/Travelers", {
      url: "/booking/travelers",
      cache: false,
      templateUrl: "views/passangers.html",
      controller: "travelersController",
    });

    $stateProvider.state("/Payment", {
      url: "/booking/payment/error=:error",
      cache: false,
      templateUrl: "views/payment.html",
      controller: "paymentController",
    });

    $stateProvider.state("/Paid-Wait", {
      url: "/booking/processing",
      cache: false,
      templateUrl: "views/banks",
      controller: "bankController",
    });

    $stateProvider.state("/Paid", {
      url: "/booking/error",
      cache: false,
      templateUrl: "views/paymentfailed",
      controller: "payFailController",
    });

    $stateProvider.state("/Payment-Error", {
      url: "/payment/failed",
      cache: false,
      templateUrl: "views/paymentfailed",
      controller: "payFailController",
    });
  },
]);
