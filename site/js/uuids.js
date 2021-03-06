(function(exports, global) {

var _spinner = '<img class="spinner" src="../img/spinner.gif">'
  , _sizes = {}
  , _session = null
  , _selected = {bucket: null, file: null}
  , _shareURL = 'https://uuid.is/'; // + 'shared/file/' if using another website

function alertMessage($el, message, clss) {
  clss = clss || 'alert';
  $('.alert-box', $el).addClass(clss).text(message);
  $('.alerter', $el).show(400, function() {
    setTimeout(function() {
      $('.alerter', $el).hide(400, function() {
        $('.alert-box', $el).removeClass(clss).text('');
      });
    }, 5000);
  });
}

function showActions() {
  $('#actions .actions').addClass('hidden');
  if (_selected.bucket && _selected.file) {
    $('#file-name').text(_selected.file);
    $('#file-size').text(formatSize(_sizes[_selected.bucket][_selected.file]));
    $('#file-actions').removeClass('hidden');
  } else if (_selected.bucket) {
    $('#bucket-name').text(_selected.bucket);
    $('#bucket-size').text(formatSize(_sizes[_selected.bucket].__totalSize));
    $('#bucket-actions').removeClass('hidden');
  }
  getUsage();
}

function formatSize(size) {
  if (size > 1000000000) return '' + (parseInt(size / 100000000) / 10) + ' GB';
  if (size > 1000000) return '' + (parseInt(size / 100000) / 10) + ' MB';
  if (size > 1000) return '' + (parseInt(size / 100) / 10) + ' KB';
  return '' + size + ' bytes';
}

function showUsage(usage) {
  var total = (usage.stored || 0) + (usage.input || 0) + (usage.output || 0)
    , pct = parseInt(100 * total / usage.quota);
  $('.usage').html('').text('' + pct + '% of ' + formatSize(usage.quota) + ' quota used').append(' - <a href="JavaScript:uuids.addQuota()">add more</a>');
}

function getUsage() {
  $.get('/usage')
  .done(function(response) {
    showUsage(response.usage);
  })
  .fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage('#actions', response.error);
  });
}

exports.addQuota = function() {
  var uuid = prompt("Enter the quota code from @UUIDs:");
  if (!uuid) return false;
  $.post('/quota/' + uuid)
  .done(function(response) {
    alertMessage('#actions', 'Quota increased', 'success');
    showUsage(response.usage);
  })
  .fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage('#actions', response.error);
  });
  return false;
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

function setupUploader(onComplete) {
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
      if (progress == 100) setTimeout(onComplete, 2000);
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
    if (field.name == 'newPassword' && value) {
      path = '/password';
      params.newPasswordDigest = Sha256.hash(value);
    }
    if (field.name == 'invitation') params.invitation = value;
  }
  $.post(path, params)
  .done(function(response) {
    alertMessage($form, successMessage, 'success');
    setupSession(params.nameDigest, response.session)
    setupButtons();
    window.location.pathname = '/app/files.html';
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($form, response.error);
  });
}

function createAccount($form) {
  submitAccountForm($form, '/signup', 'Account created');
}

function login($form) {
  submitAccountForm($form, '/login', 'Login successful');
}

function logout() {
  storeLocally('session', {});
  setupButtons();
  window.location.pathname = '/app/';
}

function getBuckets() {
  var $ul = $('#bucket-list');
  if ($ul.length == 0) return; // e.g. when on the index.html page
  $ul.html('<li>&nbsp;&nbsp;&nbsp;' + _spinner + '</li>');
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
      $('<a href="#files">').text(bucket).appendTo($li);
    }
    $('#bucket-list a').click(function(e) {
      _selected.bucket = $(e.target).text();
      _selected.file = null;
      $('#upload-files-button').removeClass('disabled');
      $('#bucket-list a').removeClass('selected');
      $(e.target).addClass('selected');
      getBucketFiles();
    });
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#actions'), response.error);
  });
}

function getBucketFiles() {
  var $ul = $('#file-list');
  $ul.html('<li>&nbsp;&nbsp;&nbsp;' + _spinner + '</li>');
  $.get('/bucket/' + encodeURIComponent(_selected.bucket))
  .done(function(response) {
    var files = [], file, $li, i, size, totalSize = 0;
    $ul.html('');
    _sizes[_selected.bucket] = {};
    for (file in response.bucket.files) {
      size = response.bucket.files[file].size;
      _sizes[_selected.bucket][file] = size;
      totalSize += size;
      files.push(file);
    }
    _sizes[_selected.bucket].__totalSize = totalSize;
    showActions();
    files.sort();
    for (i in files) {
      file = files[i];
      $li = $('<li/>').appendTo($ul);
      $('<a href="#actions">').text(file).appendTo($li);
    }
    $('#file-list a').click(function(e) {
      _selected.file = $(e.target).text();
      $('#file-list a').removeClass('selected');
      $(e.target).addClass('selected');
      showActions();
    });
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#actions'), response.error);
  });
}

function createBucket($form) {
  var $field = $('input[name="name"]', $form)
    , bucket = $field.val();
  $.post('/bucket/' + encodeURIComponent(bucket))
  .done(function(response) {
    $field.val('');
    getBuckets();
    alertMessage($form, 'Bucket created', 'success');
    $('a.close-reveal-modal', $form.parent()).trigger('click');
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($form, response.error);
  });
}

function renameBucket() {
  var name = prompt("New name", _selected.bucket);
  if (name === null) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/rename/' + encodeURIComponent(name))
  .done(function(response) {
    _sizes[name] = _sizes[_selected.bucket];
    _selected.bucket = name;
    showActions();
    getBuckets();
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#actions'), response.error);
  });
}

function deleteBucket() {
  var ok = confirm('Are you sure you want to delete "' + _selected.bucket + '"?');
  if (ok === false) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/delete')
  .done(function(response) {
    delete(_sizes[_selected.bucket]);
    _selected.bucket = null;
    showActions();
    getBuckets();
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#actions'), response.error);
  });
}

function downloadBucketFile() {
  var options = location.protocol == 'https:' ? {secure: true} : {};
  options.path = '/';
  $.cookie('nameDigest', _session.nameDigest, options);
  $.cookie('session', _session.session, options);
  window.open('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file))
  setTimeout(function() {
    $.removeCookie('nameDigest', options);
    $.removeCookie('session', options);
  }, 1000);
}

function shareBucketFile() {
  $('#share-file-modal .selected-file-name').text(_selected.file);
  $('#share-file-modal .selected-file-link').html(_spinner);
  $('#share-file-modal').foundation('reveal', 'open');
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file) + '/share/once')
  .done(function(response) {
    var uuid = response.bucket.share.uuid
      , link = _shareURL + uuid;
    $('#share-file-modal .selected-file-link').html(link);
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#actions'), response.error);
  });
}

function unshareBucketFile() {
  var ok = confirm('Are you sure you want to unshare "' + _selected.file + '"?');
  if (ok === false) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file) + '/unshare')
  .done(function(response) {
    alertMessage($('#actions'), 'File is not shared', 'success');
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#actions'), response.error);
  });
}

function renameBucketFile() {
  var name = prompt("New name", _selected.file);
  if (name === null) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file) + '/rename/' + encodeURIComponent(name))
  .done(function(response) {
    _selected.file = name;
    getBucketFiles();
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#actions'), response.error);
  });
}

function deleteBucketFile() {
  var ok = confirm('Are you sure you want to delete "' + _selected.file + '"?');
  if (ok === false) return;
  $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file) + '/delete')
  .done(function(response) {
    _selected.file = null;
    getBucketFiles();
  }).fail(function(jqXHR) {
    var response = JSON.parse(jqXHR.responseText);
    alertMessage($('#actions'), response.error);
  });
}

function moveBucketFile() {
  var $select = $('#select-bucket');
  $select.html('');
  $('#move-file-modal .selected-file-name').text(_selected.file);
  $('#bucket-list li').each(function(index) {
    var bucket = $(this).text();
    $('<option/>').text(bucket).appendTo($select);
  });
  $('#move-file-modal').foundation('reveal', 'open');
  $('form#move-file-form').on('submit', function(e) {
    var $form = $(e.target)
      , bucket = $select.val();
    $.post('/bucket/' + encodeURIComponent(_selected.bucket) + '/file/' + encodeURIComponent(_selected.file) + '/move/' + encodeURIComponent(bucket))
    .done(function(response) {
      _selected.file = null;
      getBucketFiles();
      $('a.close-reveal-modal', $form.parent()).trigger('click');
    }).fail(function(jqXHR) {
      var response = JSON.parse(jqXHR.responseText);
      alertMessage($('#move-file-modal'), response.error);
    });
    return false;
  });
}

exports.setup = function() {

  /**********
   * Accounts
   */

  // Handle new signups
  $('form#create-account-form').on('submit', function(e) {
    createAccount($(e.target));
    return false;
  });

  // Handle logins
  $('form#login-form').on('submit', function(e) {
    login($(e.target));
    return false;
  });

  // Handle logins
  $('a#change-password').on('click', function(e) {
    $('#new-password').toggle();
  });

  // Handle logouts
  $('a#logout-button').on('click', function(e) {
    logout();
  });

  /*********
   * Buckets
   */

  // Handle new buckets
  $('form#create-bucket-form').on('submit', function(e) {
    createBucket($(e.target));
    return false;
  });

  // Handle renamed buckets
  $('a#rename-bucket-button').on('click', function(e) {
    renameBucket();
  });

  // Handle deleted buckets
  $('a#delete-bucket-button').on('click', function(e) {
    deleteBucket();
  });

  /*******
   * Files
   */

  // Handle file uploads
  $('a#upload-files-button').on('click', function(e) {
    var reveal = $('#upload-files-modal');
    if (!$(e.target).hasClass('disabled')) {
      setupUploader(function() {
        reveal.foundation('reveal', 'close');
      });
      reveal.foundation('reveal', 'open');
    }
  });

  // Handle downloads
  $('a#download-file-button').on('click', function(e) {
    downloadBucketFile();
  });

  // Handle file sharing
  $('a#share-file-button').on('click', function(e) {
    shareBucketFile();
  });

  // Handle file share link copying
  $('#share-file-modal .copy-to-clipboard').on('click', function(e) {
    var link = $('#share-file-modal .selected-file-link').text();
    window.prompt("Copy to clipboard: Ctrl+C, Enter", link);
  });

  // Handle file unsharing
  $('a#unshare-file-button').on('click', function(e) {
    unshareBucketFile();
  });

  // Handle renamed files
  $('a#rename-file-button').on('click', function(e) {
    renameBucketFile();
  });

  // Handle deleted files
  $('a#delete-file-button').on('click', function(e) {
    deleteBucketFile();
  });

  // Handle file moves
  $('a#move-file-button').on('click', function(e) {
    moveBucketFile();
  });

  /****
   * UI
   */

  setupSession();
  setupButtons();
  getBuckets();
}

})(typeof module !== 'undefined' && module['exports'] ? module['exports'] : (window['uuids'] = {}), typeof GLOBAL !== 'undefined' ? GLOBAL : window );
