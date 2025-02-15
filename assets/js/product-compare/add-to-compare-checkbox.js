addToCompareCheckboxController.$inject = ['$rootScope', '$scope', 'catalogService', 'compareProductService'];
function addToCompareCheckboxController($rootScope, $scope, catalogService, compareProductService) {
  var $ctrl = this;
  $ctrl.containProduct = false;

  $ctrl.$onInit = function () {
      $ctrl.containProduct = compareProductService.isInProductCompareList(
          $ctrl.productId
      );
  };

  $ctrl.addProductToCompareList = function (event) {
      event.preventDefault();
      catalogService.getProduct($ctrl.productId).then(function (response) {
          var product = response.data[0];
          event.preventDefault();
          var isInProductList = compareProductService.isInProductCompareList(
              $ctrl.productId
          );
          if (!isInProductList) {
              var count = compareProductService.getProductsCount();
              if (count < 5) {
                  $ctrl.containProduct = true;
                  compareProductService.addProduct($ctrl.productId);
                  $rootScope.$broadcast("productCompareListChanged");
              }
          } else {
              $ctrl.containProduct = false;
              compareProductService.removeProduct($ctrl.productId);
              $rootScope.$broadcast("productCompareListChanged");
          }
      });
  };

  $scope.$on("productRemovedFromCompareList", function (event, data) {
      if ($ctrl.productId == data) {
          $ctrl.containProduct = false;
      }
  });

  $scope.$on("productCompareListCleared", function (event, data) {
      $ctrl.containProduct = false;
  });
}

var storefrontApp = angular.module('storefrontApp');
storefrontApp.component('addToCompareCheckbox', {
  templateUrl: "themes/assets/js/product-compare/add-to-compare-checkbox.tpl.html",
  bindings: {
    productId: '<',
    buttonType: '<',
    customClass: '<',
    buttonWidth: '<'
  },
  controller: addToCompareCheckboxController
});

storefrontApp.component('addToCompareCheckboxMigration', {
  templateUrl: "themes/assets/js/bootstrap-migration/product-compare/add-to-compare-checkbox.tpl.html",
  bindings: {
    productId: '<',
    buttonType: '<',
    customClass: '<',
    buttonWidth: '<'
  },
  controller: addToCompareCheckboxController
});


