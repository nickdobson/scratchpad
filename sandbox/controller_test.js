(function(angular) {
  var app = angular.module('myApp', []);
  app.controller('FirstCtrl', function($scope) {
    $scope.data = {message: "Hello"};
  });
}(angular));
