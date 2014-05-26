/*global alert:false cookie:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

function initPersona($scope, $http) {
    var currentUser = cookie.get('persona');
    if (currentUser) $scope.signedIn = currentUser;
 
    navigator.id.watch({
        loggedInUser: currentUser,
        onlogin: function(assertion) {
            
            // A user has logged in! Here you need to:
            // 1. Send the assertion to your backend for verification and to create a session.
            // 2. Update your UI.
            console.log('posting /signin');
            $http({ 
                method: 'POST',
                url: '/__api/signin', // This is a URL on your website.
                data: {assertion: assertion} })
                .success(function(data, status, headers, config) {
                    $scope.signedIn = data.email;
                    // $scope.$apply(;
                    cookie.set('persona', data.email);
                    console.log('Posted signin. It was a success', data);
                })
                .error(function(data, status, headers, config) {
                    cookie.remove('persona');
                    navigator.id.logout();
                    console.log('Posted signin. Failure', data, status);
                    alert("Sign in failure: " + data.reason);
                });
        },
        onlogout: function() {
            // A user has logged out! Here you need to:
            // Tear down the user's session by redirecting the user or making a call to your backend.
            // Also, make sure loggedInUser will get set to null on the next page load.
            // (That's a literal JavaScript null. Not false, 0, or undefined. null.)
            console.log('posting /signout');
            $http({
                method: 'POST',
                url: '/__api/signout'})
                .success(function(data, status, headers, config) {
                    cookie.remove('persona');
                    $scope.signedIn = false;
                    console.log('signout post success', data);
                })
                .error(function(data, status, headers, config) {
                    cookie.remove('persona');
                    navigator.id.logout();
                    $scope.signedIn = false;
                    alert("Sign out failure: " + data.reason);
                });

        }
    });
}
