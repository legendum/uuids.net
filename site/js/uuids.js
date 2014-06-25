(function(exports, global) {

function alertMessage($el, clss, message) {
  $('.alert-box', $el).addClass(clss).text(message);
  $('.alerter', $el).show(400, function() {
    setTimeout(function() {
      $('.alerter', $el).hide(400, function() {
        $('.alert-box', $el).removeClass(clss).text('');
      });
    }, 5000);
  });
}

function getUsage(next) {
  $.get('/usage')
  .done(function(response) {
    if (next) next(response.usage);
  });
}

function setupButtons(localSession) {
  if (localSession) {
    $('a#login-button').addClass('hidden');
    $('a#logout-button').removeClass('hidden');
  } else {
    $('a#login-button').removeClass('hidden');
    $('a#logout-button').addClass('hidden');
  }
}

function storeLocally(key, value) {
  if (value != null) {
    window.localStorage.setItem(key, JSON.stringify(value));
  } else {
    value = JSON.parse(window.localStorage.getItem(key));
  }
  return value;
}

function startSession(nameDigest, session) {
  var localSession;
  if (nameDigest && session) {
    localSession = {
      nameDigest: nameDigest
    , session: session
    };
    storeLocally('session', localSession);
  } else {
    localSession = storeLocally('session') || {};
  }
  if (localSession.nameDigest && localSession.session) {
    $.ajaxSetup({
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", "Basic " + btoa(localSession.nameDigest + ":" + localSession.session));
      }
    });
    return localSession;
  } else {
    return null;
  }
};

function submitForm($form, path, successMessage) {
  var fields = $form.serializeArray()
    , field, value, params = {};
  for (var i in fields) {
    field = fields[i];
    value = field.value.toLowerCase();
    if (field.name == 'name') params.nameDigest = Sha256.hash(value);
    if (field.name == 'password') params.passwordDigest = Sha256.hash(value);
    if (field.name == 'invitation') params.invitation = value;
  }
  $.post(path, params)
  .done(function(response) {
    alertMessage($form, 'success', successMessage);
    setupButtons( startSession(params.nameDigest, response.session) );
    window.location.pathname = '/app/dashboard.html';
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($form, 'alert', response.error);
  });
  return false; // don't submit the form!
}

function createAccount($form) {
  return submitForm($form, '/signup', 'Account created');
}

function login($form) {
  return submitForm($form, '/login', 'Login successful');
}

exports.init = function() {

  // Handle new signups
  $('form#create-account-form').on('submit', function(e) {
    return createAccount($(e.target));
  });

  // Handle logins
  $('form#login-form').on('submit', function(e) {
    return login($(e.target));
  });

  // Handle logouts
  $('a#logout-button').on('click', function(e) {
    storeLocally('session', {});
    setupButtons();
    window.location.pathname = '/app/';
  });

  // Setup the buttons and  session
  setupButtons( startSession() );
}

})(typeof module !== 'undefined' && module['exports'] ? module['exports'] : (window['uuids'] = {}), typeof GLOBAL !== 'undefined' ? GLOBAL : window );
