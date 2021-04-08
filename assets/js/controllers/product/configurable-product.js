var storefrontApp = angular.module('storefrontApp');

storefrontApp.controller('configurableProductController', ['$rootScope', '$scope', '$window', 'dialogService', 'catalogService', 'cartService', '$filter', 'roundHelper', 'availabilityService', 'storeCurrency', 'pricingService', 'storefrontApp.mainContext',
    function ($rootScope, $scope, $window, dialogService, catalogService, cartService, $filter, roundHelper, availabilityService, storeCurrency, pricingService, mainContext) {
        $scope.configurationQty = 1;
        $scope.isProductUnavailable = false;
        $scope.customer = mainContext.customer;

        $scope.addSelectedProductsToCart = function() {
            const configuredProductId = $window.product.id;
            const products = $scope.isFlatConfigurationList
                ? $scope.defaultProductParts
                : $scope.productParts.map((part) => part.items.find((item) => item.id === part.selectedItemId));
            const inventoryError = products.some(product => product.trackInventory && product.availableQuantity < $scope.configurationQty);
            const dialogData = toDialogDataModel(products, $scope.configurationQty, inventoryError, configuredProductId);
            dialogService.showDialog(dialogData, 'recentlyAddedCartItemDialogController', 'storefront.recently-added-cart-item-dialog.tpl', 'lg');

            if (!inventoryError) {
                const items = products.map((item) => {
                    return { id: item.id, quantity: $scope.configurationQty, configuredProductId: configuredProductId };
                });

                cartService.addLineItems(items).then(response => {
                    const result = response.data;
                    if (result.isSuccess) {
                        $rootScope.$broadcast('cartItemsChanged');
                    }
                });
            }
        }

        $scope.changeGroupItem = function (productPart) {
            const dialogInstance = dialogService.showDialog(productPart, 'changeConfigurationGroupItemDialogController', 'storefront.select-configuration-item-dialog.tpl');
            dialogInstance.result.then(id => {
                const foundIndex = $scope.productParts.findIndex(x => x.name === productPart.name);
                $scope.productParts[foundIndex].selectedItemId = id;
                recalculateTotals();
            });
        };

        $scope.changeAdditionalItem = function (product, event) {
            const wasSelected = event.target.checked;
            const index = $scope.defaultProductParts.indexOf(product);

            if (wasSelected && index === -1) {
                $scope.defaultProductParts.push(product);
            } else if (!wasSelected && index > -1) {
                $scope.defaultProductParts.splice(index, 1);
            }

            recalculateTotals();
        };

        $scope.getSelectedItem = function(configPart) {
            const item = configPart.items.find(x => x.id === configPart.selectedItemId);
            return item.name;
        }

        $scope.getCurrentTotal = function() {
            let total;

            if ($scope.updatedTotal) {
                total = roundHelper.bankersRound($scope.updatedTotal * $scope.configurationQty);
            } else {
                total = roundHelper.bankersRound($scope.defaultPrice * $scope.configurationQty);
            }

            return $filter('currency')(total, storeCurrency.symbol);
        }

        $scope.getDefaultPrice = function() {
            return $filter('currency')($scope.defaultPrice, storeCurrency.symbol);
        }

        $scope.getCustomChangesTotal = function() {
            return $scope.differenceSign + $filter('currency')($scope.totalDifference, storeCurrency.symbol) || $filter('currency')(0, storeCurrency.symbol);
        }

        $scope.quantityChanged = function(qty) {
            const intValue = parseInt(qty, 10);

            if (isNaN(intValue) || intValue === 0) {
                $scope.configurationQty = 1
            } else {
                $scope.configurationQty = intValue;
            }
        }

        function toDialogDataModel(products, quantity, inventoryError, configuredProductId) {
            const productIds = products.map(product => {
                return product.id;
            });
            const items = products.map(product => {
                return angular.extend({ }, product, { quantity: +quantity, inventoryError: product.availableQuantity < quantity, configuredProductId: configuredProductId })
            });
            return { productIds, items, inventoryError, configuredProductId, configurationQty: quantity };
        }

        function initialize() {
          let product = $window.product;
          if (!product) {
              return;
          }
          catalogService.getProduct([product.id]).then(response => {
              product = response.data[0];
              $scope.selectedVariation = product;
              $scope.productParts = response.data[0].parts;
              $scope.defaultProductParts = $scope.isFlatConfigurationList
                  ? [product] // adding the main product
                  : [];

              if ($scope.productParts.length) {
                _.each($scope.productParts, part => {
                  if (!part.items || !part.items.length) {
                    $scope.isProductUnavailable = true;
                    return;
                  }

                  if (!$scope.isFlatConfigurationList) {
                      $scope.defaultProductParts.push(part.items.find((item) => item.id === part.selectedItemId));
                  } else if (['contained', 'preselected'].includes(part.name.toLowerCase())) {
                      $scope.defaultProductParts = $scope.defaultProductParts.concat(part.items);
                  }
                });

                const defaultPartsTotalsObject = $scope.defaultProductParts.map((item) => ({ id: item.id, quantity: 1 }));

                if (!$scope.isProductUnavailable) {
                  pricingService.getProductsTotal(defaultPartsTotalsObject).then(result => {
                    $scope.defaultPrice = $scope.showPricesWithTaxes ? result.data.totalWithTax.amount : result.data.total.amount;
                  });
                } else {
                  $scope.defaultPrice = 0;
                }

              } else {
                $scope.defaultPrice = 0;
              }


              return availabilityService.getProductsAvailability([product.id]).then(res => {
                  $scope.availability = _.object(_.pluck(res.data, 'productId'), res.data);
              });
          });
        }

        function recalculateTotals() {
            const selectedProductParts = $scope.isFlatConfigurationList
                ? $scope.defaultProductParts.map((item) => ({ id: item.id, quantity: 1 }))
                : $scope.productParts.map((part) => ({ id: part.items.find((item) => item.id === part.selectedItemId).id, quantity: 1 }));

            pricingService.getProductsTotal(selectedProductParts).then(result => {
              $scope.updatedTotal = $scope.showPricesWithTaxes ? result.data.totalWithTax.amount : result.data.total.amount;
              $scope.totalDifference = Math.abs($scope.updatedTotal - $scope.defaultPrice);
              $scope.differenceSign = ($scope.updatedTotal === $scope.defaultPrice) ? '' :
                                      ($scope.updatedTotal > $scope.defaultPrice) ? '+' : '-';
            });
        }

        initialize();
    }]);
