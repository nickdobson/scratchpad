(function(angular) {

  var app = angular.module('directiveAPI', []);

  app.directive("position", function () {
    return {
      restrict: "E",
      scope: {},

      controller: function ($scope) {
        $scope.abilities = [];

        this.addExperience = function () {
          $scope.abilities.push("Experienced")
        }
        this.addKnowledge = function () {
          $scope.abilities.push("Knowledgable")
        }
        this.addLearning = function () {
          $scope.abilities.push("Learning")
        }
      },

      link: function (scope, element) {
        element.addClass("button");
        element.bind("mouseenter", function () {
          console.log(scope.abilities);
        })
      }
    }
  })

  app.directive("experience", function () {
    return {
      require:"position",
      link: function (scope, element, attrs, positionCtrl) {
        positionCtrl.addExperience();
      }
    }
  })
  app.directive("knowledgable", function () {
    return {
      require:"position",
      link: function (scope, element, attrs, positionCtrl) {
        positionCtrl.addKnowledge();
      }
    }
  })
  app.directive("learning", function () {
    return {
      require:"position",
      link: function (scope, element, attrs, positionCtrl) {
        positionCtrl.addLearning();
      }
    }
  })

}(angular));
