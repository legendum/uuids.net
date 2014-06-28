(function(exports, global) {

var _session = null
  , _selected = {
      bucket: null
    , file: null
    };

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

function getBuckets() {
  var $ul = $('#bucket-list');
  if ($ul.length == 0) return;
  $.get('/buckets')
  .done(function(response) {
    var buckets = [], bucket, $li, i;
    $('#file-list').html('');
    $ul.html('');
    for (bucket in response.buckets) {
      buckets.push(bucket);
    }
    buckets.sort();
    for (i in buckets) {
      bucket = buckets[i];
      $li = $('<li/>').appendTo($ul);
      $('<a href="#">').text(bucket).appendTo($li);
    }
    $('#bucket-list a').click(function(e) {
      _selected.bucket = $(e.target).text();
      _selected.file = null;
      $('#upload-files-button').removeClass('disabled');
      $('#bucket-list a').removeClass('selected');
      $(e.target).addClass('selected');
      showActions();
      getBucketFiles();
    });
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#buckets'), 'alert', response.error);
  });
}

function getBucketFiles() {
  var $ul = $('#file-list');
  $.get('/bucket/' + encodeURIComponent(_selected.bucket))
  .done(function(response) {
    var files = [], file, $li, i;
    $ul.html('');
    for (file in response.bucket.files) {
      files.push(file);
    }
    files.sort();
    for (i in files) {
      file = files[i];
      $li = $('<li/>').appendTo($ul);
      $('<a href="#">').text(file).appendTo($li);
    }
    $('#file-list a').click(function(e) {
      _selected.file = $(e.target).text();
      $('#file-list a').removeClass('selected');
      $(e.target).addClass('selected');
      showActions();
    });
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#files'), 'alert', response.error);
  });
}

function showActions() {
  $('#actions .actions').addClass('hidden');
  if (_selected.file) {
    $('#file-name').text(_selected.file);
    $('#file-actions').removeClass('hidden');
  } else if (_selected.bucket) {
    $('#bucket-name').text(_selected.bucket);
    $('#bucket-actions').removeClass('hidden');
  }
  getUsage();
}

function getUsage() {
  $.get('/usage')
  .done(function(response) {
    var usage = response.usage
      , total = (usage.stored || 0) + (usage.input || 0) + (usage.output || 0)
      , pct = parseInt(total / usage.quota);
console.log(usage);
    $('.usage').text('' + pct + '% of quota used');
  });
}

function setupButtons() {
  if (_session.nameDigest && _session.session) {
    $('a#login-button').addClass('hidden');
    $('a#files-button, a#logout-button').removeClass('hidden');
  } else {
    $('a#login-button').removeClass('hidden');
    $('a#files-button, a#logout-button').addClass('hidden');
  }
}

function setupUploader() {
  var path = '/bucket/' + encodeURIComponent(_selected.bucket) + '/upload';
  $('#uploaded').html('');
  $('#progress .meter').css('width', '0%');
  $('#fileupload').fileupload({
    url: path
  , dataType: 'json'
  , done: function (e, response) {
      $.each(response.files, function(index, file) {
        $('<li/>').text(file.name).appendTo($('#uploaded'));
        getBucketFiles();
      });
    },
    progressall: function(e, response) {
      var progress = parseInt(response.loaded / response.total * 100, 10);
      $('#progress .meter').css('width', progress + '%');
    }
  });
}

function storeLocally(key, value) {
  if (value != null) {
    window.localStorage.setItem(key, JSON.stringify(value));
  } else {
    value = JSON.parse(window.localStorage.getItem(key));
  }
  return value;
}

function setupSession(nameDigest, session) {
  if (nameDigest && session) {
    _session = {
      nameDigest: nameDigest
    , session: session
    };
    storeLocally('session', _session);
  } else {
    _session = storeLocally('session') || {};
  }
  if (_session.nameDigest && _session.session) {
    $.ajaxSetup({
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", "Basic " + btoa(_session.nameDigest + ":" + _session.session));
      }
    });
  }
};

function submitAccountForm($form, path, successMessage) {
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
    setupSession(params.nameDigest, response.session)
    setupButtons();
    window.location.pathname = '/app/files.html';
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($form, 'alert', response.error);
  });
  return false; // don't submit the form!
}

function createAccount($form) {
  return submitAccountForm($form, '/signup', 'Account created');
}

function createBucket($form) {
  var bucket = $('input[name="name"]', $form).val();
  $.post('/bucket/' + encodeURIComponent(bucket))
  .done(function(response) {
    getBuckets();
    alertMessage($form, 'success', 'Bucket created');
    $('a.close-reveal-modal', $form.parent()).trigger('click');
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($form, 'alert', response.error);
  });
  return false;
}

function renameBucket() {
  var name = prompt("New name", _selected.bucket);
  if (name === null) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/rename/' + encodeURIComponent(name))
  .done(function(response) {
    getBuckets();
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
  });
}

function deleteBucket() {
  var ok = confirm('Are you sure you want to delete "' + _selected.bucket + '"?');
  if (ok === false) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/delete')
  .done(function(response) {
    getBuckets();
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
  });
}

function renameBucketFile() {
  var name = prompt("New name", _selected.file);
  if (name === null) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file) + '/rename/' + encodeURIComponent(name))
  .done(function(response) {
    getBucketFiles();
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
  });
}

function deleteBucketFile() {
  var ok = confirm('Are you sure you want to delete "' + _selected.bucket + '"?');
  if (ok === false) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file) + '/delete')
  .done(function(response) {
    getBucketFiles();
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
  });
}

function login($form) {
  return submitAccountForm($form, '/login', 'Login successful');
}

exports.setup = function() {

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

  // Handle new buckets
  $('form#create-bucket-form').on('submit', function(e) {
    return createBucket($(e.target));
  });

  // Handle renamed buckets
  $('a#rename-bucket-button').on('click', function(e) {
    return renameBucket();
  });

  // Handle deleted buckets
  $('a#delete-bucket-button').on('click', function(e) {
    return deleteBucket();
  });

  // Handle renamed files
  $('a#rename-file-button').on('click', function(e) {
    return renameBucketFile();
  });

  // Handle deleted files
  $('a#delete-file-button').on('click', function(e) {
    return deleteBucketFile();
  });

  // Handle uploads
  $('a#upload-files-button').on('click', function(e) {
    if (!$(e.target).hasClass('disabled')) {
      setupUploader();
      $('#upload-files-modal').foundation('reveal', 'open');
    }
  });

  // Handle downloads
  $('a#download-file-button').on('click', function(e) {
    var options = location.protocol == 'https:' ? {secure: true} : {};
    options.path = '/';
    $.cookie('nameDigest', _session.nameDigest, options);
    $.cookie('session', _session.session, options);
    window.open('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file))
    setTimeout(function() {
      $.removeCookie('nameDigest');
      $.removeCookie('session');
    }, 1000);
  });

  // Setup the buttons, session and uploader
  setupSession();
  setupButtons();
  getBuckets();
}

})(typeof module !== 'undefined' && module['exports'] ? module['exports'] : (window['uuids'] = {}), typeof GLOBAL !== 'undefined' ? GLOBAL : window );
