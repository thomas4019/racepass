function loadBraintree(authorization) {
  var submit = document.querySelector('button[type="submit"]');
  
  braintree.client.create({
    authorization: authorization
  }, function (clientErr, clientInstance) {
    if (clientErr) {
      // Handle error in client creation
      return;
    }
  
    braintree.hostedFields.create({
      client: clientInstance,
      styles: {
        'input': {
          'font-size': '18px',
          'background-color': 'white',
        },
        'input::-webkit-input-placeholder': {
          'color': '#ABAEB7',
        },
        'input::-moz-placeholder': {
          'color': '#ABAEB7'
        },
        'input:-ms-input-placeholder': {
          'color': '#ABAEB7'
        },
        'input.invalid': {
          'color': 'red'
        },
        'input.valid': {
          'color': 'black'
        }
      },
      fields: {
        number: {
          selector: '#card-number',
          placeholder: 'Card Number'
        },
        cvv: {
          selector: '#cvv',
          placeholder: 'CVC'
        },
        expirationDate: {
          selector: '#expiration-date',
          placeholder: 'MM/YYYY'
        }
      }
    }, function (hostedFieldsErr, hostedFieldsInstance) {
      if (hostedFieldsErr) {
        // Handle error in Hosted Fields creation
        return;
      }
      window.hostedFieldsInstance = hostedFieldsInstance;
  
      submit.removeAttribute('disabled');
    });
  });
}

angular.module('main')
  .controller('PaymentController', function($timeout, $filter, $http, $location) {
    var self = this;
    var fancyNameToSKU = {
      'Contender': '3races',
      'Athlete': '5races',
      'Pro': 'unlimited' 
    }
    this.passType = localStorage.buyType;
    this.passName = passNames[this.passType];
    this.email = window.localStorage.email || '';
    if (this.email == 'undefined') {
      this.email = '';
    }
    this.baseCost = passPrices[this.passType];
    this.finalCost = this.baseCost;
    this.promoCode = '';
    nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    this.endDate = (nextYear.getMonth()+1) + '/' + (nextYear.getDate()) + '/' + nextYear.getFullYear();
    
    this.promoOpen = false;
    this.promoApplied = false;
    this.purchaseInProgress = false;
    this.paymentComplete = false;

    this.togglePromo = function() {
      this.promoOpen = !this.promoOpen;
    }.bind(this);

    this.applyPromo = function() {
      //this.promoCodeField = '';
      data = { 'name' : this.promoCodeField.toUpperCase() }
      $http.get(window.apiurl + 'promo_code?limit=1&query=' + JSON.stringify(data))
        .then(function(response) {
          if (response.data.length == 0) {
            toastr.error(self.promoCodeField.toUpperCase() + ' is not a valid promo code.');
            return;
          }
          var code = response.data[0];
          self.promoApplied = true;
          self.promoDiscount = code.value;
          self.finalCost = self.baseCost - self.promoDiscount;
          self.promoCode = self.promoCodeField;
        }, function(err) {
          toastr.error('Error while attempting to apply promo code');
        })

    }.bind(this);
    this.purchase = function() {
      this.purchaseInProgress = true;

      hostedFieldsInstance.tokenize(function (tokenizeErr, payload) {
        if (tokenizeErr) {
          // Handle error in Hosted Fields tokenization
          console.log(tokenizeErr);
          return;
        }

        var paymentData = {
          passType: self.passType,
          payment_method_nonce: payload.nonce,
          promo: self.promoCode,
          base_cost: self.baseCost,
          final_cost: self.finalCost,
          start_date: $filter('date')(new Date(), 'MM/dd/yyyy'),
          end_date: $filter('date')(new Date().setDate(new Date().getDate() + 365)  , 'MM/dd/yyyy'),
        };
        $http.post(window.apiurl + 'purchase?token=' + localStorage.token, JSON.stringify(paymentData))
          .then(function(result) {
            var data = result.data;
            console.log(data);
            delete paymentData.payment_method_nonce;
            paymentData.details = data.transaction_id;
            window.localStorage.payment = JSON.stringify(paymentData);
            ga('ecommerce:addItem', {
              'id': data.transaction_id,        // Transaction ID. Required.
              'name': self.passName,
              'sku': self.passType,
              'price': self.cost_per_event,
              'quantity': self.num_races,
            });
            ga('ecommerce:addTransaction', {
              'id': data.transaction_id,        // Transaction ID. Required.
              'affiliation': 'racepass',        // Affiliation or store name.
              'revenue': self.finalCost,        // Grand Total.
              'tax': '0'                        // Tax.
            });
            ga('ecommerce:send');
            self.paymentComplete = true;
            self.cardDetails = data.cc;
            self.transaction_id = data.transaction_id;
          }, function(data) {
            self.setError('We ran into an issue while processing your card. Please try again and contact info@racepass.com if the issue continues. Thanks for your patience.')
            console.error(data);
          });
      });

      /*$timeout(function() {
        this.purchaseInProgress = false;
        this.paymentComplete = true;
      }.bind(this), 1000)*/
    }.bind(this);

    this.done = function() {
      $location.path('/');
    }
  });