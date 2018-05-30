(function(angular) {

  var app = angular.module('filterApp', []);

  app.factory('People', function() {
    var People = {};
    People.software = [
      {name: "Andrew", position: "Intern"},
      {name: "Nick", position: "Supervisor"},
      {name: "Brad", position: "Coworker"},
      {name: "Joe", position: "Coworker"},
      {name: "Eric", position: "Coworker's Supervisor"}
    ];
    return People;
  })

  app.controller('PeopleCtrl', function($scope, People) {
    $scope.people = People;
  });

}(angular));
