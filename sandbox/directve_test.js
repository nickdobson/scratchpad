(function(angular) {

  var app = angular.module('superhero', []);

  app.directive("superman", function () {
    return {
      restrict: "E",
      template: "<div>Here I am to save the day</div>"
    }
  })

  app.directive("batman", function () {
    return {
      restrict: "A",
      link: function () {
        alert("I'm working batman")
      }
    }
  })

  app.directive("robin", function () {
    return {
      restrict: "C",
      link: function () {
        alert("I'm working robin")
      }
    }
  })

  app.directive("flash", function () {
    return {
      restrict: "A",
      link: function () {
        alert("I'm working faster")
      }
    }
  })

}(angular));
