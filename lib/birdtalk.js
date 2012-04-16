(function() {
  /*
    birdtalk
  */
  var $, closeSorter, fetchTweet, getMarkup, getSession, getStatusID, onRender, onSubmit, openSorter, putSession, readForm, renderPreview;
  $ = jQuery.sub();
  $.fn.lock = function() {
    return $(this).addClass('locked');
  };
  $.fn.unlock = function() {
    return $(this).removeClass('locked');
  };
  $.fn.isLocked = function() {
    return $(this).hasClass('locked');
  };
  $.userNotify = function(level, text, big) {
    var $box, $msg, alertclass, classes;
    if (level == null) {
      level = "info";
    }
    if (big == null) {
      big = false;
    }
    classes = "alert-message " + level + " container";
    if (big) {
      classes += " block-message";
    }
    $msg = $('<p>').html(text).css('padding', '5px');
    alertclass = level === 'warning' ? '' : "alert-" + level;
    $box = $('<div>').addClass("alert-message " + alertclass + " container");
    $box.append($('<a>').attr('href', '#').addClass('close').attr('data-dismiss', 'alert').text('x'));
    $box.append($msg);
    $('body').prepend($box.alert());
    return setTimeout(function() {
      return $box.fadeOut(function() {
        return $box.remove();
      });
    }, 10000);
  };
  $.userInfo = function() {
    return $.userNotify('info', arguments[0], arguments[1]);
  };
  $.userWarn = function() {
    return $.userNotify('warning', arguments[0], arguments[1]);
  };
  $.userError = function() {
    return $.userNotify('error', arguments[0], arguments[1]);
  };
  $.userSuccess = function() {
    return $.userNotify('success', arguments[0], arguments[1]);
  };
  getStatusID = function(value) {
    var matches;
    value = value.trim();
    if (/^\d+$/.test(value)) {
      return value;
    }
    matches = value.match(/(\d+)$/g);
    if (matches) {
      return matches[0];
    }
    return false;
  };
  readForm = function() {
    var data, logo, note, title;
    $('.source-input.error').removeClass('error');
    data = {
      status_ids: {},
      title: false,
      note: false,
      logo: false
    };
    $('.source-input').each(function() {
      var $field, SID, value;
      $field = $(this);
      value = $field.find('input').val();
      if (SID = getStatusID(value)) {
        return data.status_ids[SID] = SID;
      } else if (value !== '') {
        return $field.addClass('error').on('change', function() {
          return $(this).removeClass('error');
        });
      }
    });
    title = $('#title').val().trim();
    note = $('#note').val().trim();
    logo = $('#logo').is(':checked');
    if (title && title !== '') {
      data.title = title;
    }
    if (note && note !== '') {
      data.note = note;
    }
    data.logo = logo;
    data.status_ids = Object.keys(data.status_ids);
    return data;
  };
  $.progressBar = function(min, max) {
    var $el;
    $el = $('<progress class="row">').attr({
      min: min,
      max: max,
      value: 0
    }).hide();
    $el.touch = function() {
      var newvalue;
      $el.show();
      newvalue = 1 + parseFloat($el.val());
      $el.val(newvalue);
      if (newvalue === max) {
        return $el.fadeOut(function() {
          return $el.remove();
        });
      }
    };
    return $el;
  };
  putSession = function(key, object) {
    if (sessionStorage === void 0) {
      putSession[key] = object;
    } else {
      sessionStorage.setItem(key, JSON.stringify(object));
    }
    return object;
  };
  getSession = function(key) {
    var data, json;
    if (sessionStorage === void 0) {
      return putSession[key];
    } else {
      data = sessionStorage.getItem(key);
      try {
        json = JSON.parse(data);
      } catch (E) {
        json = {
          error: E
        };
      }
    }
    return json;
  };
  fetchTweet = function(status_id) {
    var defer, json, key, timeout;
    defer = $.Deferred();
    key = "TWITTER:STATUS:" + status_id;
    timeout = setTimeout(function() {
      return defer.reject('timeout');
    }, 5000);
    if (json = getSession(key)) {
      defer.resolve(json);
    } else {
      $.getJSON("http://api.twitter.com/1/statuses/show/" + status_id + ".json?callback=?", function(json, status) {
        clearTimeout(timeout);
        if (status !== 'success') {
          return defer.reject(status);
        } else {
          return defer.resolve(putSession(key, json));
        }
      });
    }
    return defer.promise();
  };
  renderPreview = function(tweet) {
    var html;
    html = "<div class='sortable span12'>                <div class='tweet span8'>                    <div class='row'>                        <div class='span1'><img src='" + tweet.user.profile_image_url + "' width='50' height='50'></div>                        <div class='span7'>                            <div class='info'>                                <a class='user' href='http://twitter.com/#!/" + tweet.user.screen_name + "'>@" + tweet.user.screen_name + "</a>                                <time class='pull-right'>" + (new Date(tweet.created_at).strftime('%d %b. %Y - %I:%M %p')) + "</time>                            </div>                            <div class='text'><p>" + tweet.text + "</p></div>                        </div>                    </div>                </div>                <div class='span2 tweet-actions'><a href='#' class='btn btn-danger remove' data-value='" + tweet.id_str + "'>remove</a></div>           </div>";
    return $(html).data({
      json: tweet
    });
  };
  onSubmit = function(e) {
    var data, fetch, progress;
    e.preventDefault();
    data = readForm();
    if (data.status_ids.length < 1) {
      return $.userError("<strong>Form error, </strong> please provide some status IDs or tweet URLS.");
    } else if ($('.source-input.error').length > 0) {
      return $.userError("<strong>Field error, </strong> please fix the highlighted fields.");
    } else {
      progress = $.progressBar(0, data.status_ids.length);
      $('fieldset.form-actions').prepend(progress);
      $('#editor .form-actions button').addClass('busy');
      fetch = $.whenSome.apply(null, data.status_ids.map(function(status_id) {
        var promise;
        promise = fetchTweet(status_id);
        promise.always(function() {
          return progress.touch();
        });
        return promise;
      }));
      fetch.fail(function() {
        return $.userError("<strong>Fetch error, </strong> no data or could not access these tweets.");
      });
      fetch.done(function() {
        var tweets;
        tweets = Array.prototype.slice.call(arguments);
        if (tweets.length !== data.status_ids.length) {
          $.userWarn("<strong>Fetch error, </strong> some tweets were not found or couldn't be accessed.");
        }
        return openSorter(function() {
          var previews;
          previews = [];
          return tweets.map(function(tweet) {
            var $preview;
            $preview = renderPreview(tweet);
            previews.push($preview);
            return $('#sorter .sortables').append($preview).sortable();
          });
        });
      });
      return fetch.always(function() {
        return $('#editor .form-actions button').removeClass('busy');
      });
    }
  };
  getMarkup = function(data) {
    var html;
    html = "<!DOCTYPE html>     <html lang=\"en\">        <head>            <meta charset=\"utf-8\">            <title>" + data.title + "</title>            <link rel=\"stylesheet\" href=\"http://assets.needium.com/lib/bootstrap/2.0/css/bootstrap.css\" type=\"text/css\">            <style type=\"text/css\" media=\"all\">                .tweet {border:1px solid #ccc;margin: 0 0 0.5em 110px;padding: 10px;width: 650px;}                .tweet time {color: #999;}                .tweet p {padding: 10px 20px 0 20px; font-size:1.25em;line-height:1.35em}                .tweet .user{font-size:1.25em;font-weight:bold}                .footnote {color: #666;margin-top: 1em;background: #F9F9F9;padding: 10px;}                body{padding-top:45px;}            </style>        </head>        <body>";
    if (data.logo) {
      html += "<div class='navbar navbar-fixed-top' data-scrollspy='scrollspy'>           <div class='navbar-inner'>               <div class='container'>                   <img class=\"brand\" src='http://assets.needium.com/logos/needium-logo-bootstrap.png' height='25'/>               </div>           </div>        </div>";
    }
    html += "<div class=\"container\">                <div class=\"page-header\">                    <h1>" + data.title + "</h1>                </div>";
    data.tweets.forEach(function(tweet) {
      var json;
      json = tweet.json;
      console.log(json);
      return html += "<div class=\"row tweet\">                    <div class=\"span1\"><img class=\"avatar\" src=\"" + json.user.profile_image_url + "\"></div>                    <div class=\"span7\">                        <div class=\"row\">                            <div class=\"user span4\">@" + json.user.screen_name + "</div>                            <div class=\"date span3\"><time class=\"pull-right\">" + (new Date(json.created_at).strftime("%d %b. %Y - %I:%M %p")) + "</time></div>                                                </div>                        <div class=\"row\">                            <p>" + json.text + "</p>                        </div>                    </div>                    </div>";
    });
    if (data.note) {
      html += "<footer class=\"footnote\"><p>" + data.note + "</p></footer>";
    }
    html += "</div></body></html>";
    return html;
  };
  onRender = function(e) {
    var data, tweets;
    e.preventDefault();
    tweets = [];
    $('#sorter .sortable').each(function() {
      return tweets.push($(this).data());
    });
    data = readForm();
    delete data.status_ids;
    data.tweets = tweets;
    data.title || (data.title = "Conversation report");
    return closeSorter(function() {
      return window.open("data:text/html;charset=UTF8," + (encodeURIComponent(getMarkup(data))), 'conversation', 'menubar=1,toolbar=1,location=1');
    });
  };
  openSorter = function(fn) {
    return $('#editor').slideUp(function() {
      if (fn) {
        fn();
      }
      return $('#sorter').slideDown();
    });
  };
  closeSorter = function(fn) {
    return $('#sorter').slideUp(function() {
      if (fn) {
        fn();
      }
      $('#sorter .sortables').empty();
      return $('#editor').slideDown();
    });
  };
  $(function() {
    var $sources;
    $('#sorter *[data-dismiss=sorter]').on('click', function() {
      return closeSorter();
    });
    $('#sorter').on('click', '.remove', function() {
      return $(this).parents('.sortable').remove();
    });
    $("#sorter .render").on('click', onRender);
    $sources = $('.source-inputs');
    $sources.on('click', '.remove', function() {
      var $input, siblings;
      $input = $(this).parent('.source-input');
      siblings = $input.siblings();
      if (siblings.length < 8) {
        return $input.find('input').val('').trigger('change');
      } else {
        return $input.remove();
      }
    });
    $sources.on('click', '.add', function() {
      var $input, index;
      $input = $(this).parent('.source-input');
      index = $('.source-input').length;
      return $input.after('<div class="source-input clearfix">' + '<input placeholder="Tweet URL or status ID" type="text" class="span4" />' + '<button type="button" class="add btn  btn-small span1">+</button>' + '<button type="button" class="remove btn btn-danger small span1">-</button></div>');
    });
    return $('#editor').on('submit', onSubmit);
  });
}).call(this);