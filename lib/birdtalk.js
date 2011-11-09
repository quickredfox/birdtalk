(function() {
  /*
  	birdtalk
  */
  var FETCH_TIMEOUT, displayFailure, displayTweets, error_template, export_template, extractStatusIds, fetchStatuses, getMarkup, note_template, popHTML, tweet_template;
  if (!String.prototype.supplant) {
    String.prototype.supplant = function(o) {
      return this.replace(/{([^{}]*)}/g, function(a, b) {
        var r;
        r = o[b];
        if (typeof r === 'string' || typeof r === 'number') {
          return r;
        } else {
          return a;
        }
      });
    };
  }
  FETCH_TIMEOUT = 3000;
  fetchStatuses = function(sids) {
    var fetches, progress, progressValue;
    progress = $('#fetch-progress').show().attr({
      max: sids.length,
      min: 0,
      value: 0
    });
    progressValue = 0;
    fetches = sids.map(function(sid) {
      var defer, json;
      defer = $.Deferred();
      setTimeout(function() {
        var exists, json;
        exists = sessionStorage.getItem("SID:" + sid);
        if (!exists) {
          json = {
            error: 'timeout or unauthorized',
            sid: sid
          };
          sessionStorage.setItem("SID:" + sid, JSON.stringify(json));
          return defer.resolve(json);
        }
      }, FETCH_TIMEOUT);
      if (json = sessionStorage.getItem("SID:" + sid)) {
        defer.resolve(JSON.parse(json));
      } else {
        $.getJSON("http://api.twitter.com/1/statuses/show/" + sid + ".json?callback=?", function(json, status) {
          if (status !== 'success') {
            json = {
              error: status,
              sid: sid
            };
          }
          sessionStorage.setItem("SID:" + sid, JSON.stringify(json));
          return defer.resolve(json);
        });
      }
      defer.always(function() {
        progressValue++;
        progress.attr({
          value: progressValue
        });
        if (progressValue === sids.length) {
          return progress.fadeOut();
        }
      });
      return defer.promise();
    });
    return $.when.apply($.Deferred, fetches).pipe(function() {
      return Array.prototype.slice.call(arguments);
    });
  };
  extractStatusIds = function(currentValue) {
    var hash_no_shebang_re, id_str_re, sids, stale, valid;
    stale = currentValue.split(/[\s\r\n]+/gm);
    sids = [];
    valid = [];
    id_str_re = /(\d+)$/g;
    hash_no_shebang_re = /(\#[^\!]+)/g;
    stale.forEach(function(item) {
      var matches;
      item = item.replace(hash_no_shebang_re, '');
      matches = item.match(id_str_re);
      if (!matches) {
        return;
      }
      if (sids.indexOf(matches[0]) === -1) {
        valid.push(item);
        return sids.push(matches[0]);
      }
    });
    return {
      sids: sids,
      items: valid
    };
  };
  displayFailure = function(failure) {
    return alert(failure);
  };
  tweet_template = "<div class=\"tweet row\">    <div class=\"span2\">        <img width=\"50\" height=\"50\" src=\"{icon}\" />        <!--<menu>            <a href=\"https://twitter.com/intent/tweet?in_reply_to={sid}\">Reply</a>            <a href=\"https://twitter.com/intent/retweet?tweet_id={sid}\">Retweet</a>            <a href=\"https://twitter.com/intent/favorite?tweet_id={sid}\">Favorite</a>        </menu>-->    </div>    <div class=\"span12\">           <div class=\"row\">            <strong>{user}</strong>            <time class=\"pull-right\">{date}</time>        </div>        <div class=\"row\">            <p>{text}</p>        </div>                 </div>    <div class=\"span2 buttons\">        <button type=\"button\" class=\"btn danger remove\">remove</button>    </div></div>";
  error_template = "<div class=\"tweet row erroneous\">    <div class=\"span2\">        <img width=\"50\" height=\"50\" src=\"http://assets.needium.com.s3.amazonaws.com/blanks/avatar-160x160.png\">    </div>    <div class=\"span12\">        <p>{text}</p>    </div>    <div class=\"span2 buttons\">        <button type=\"button\" class=\"btn danger remove\">remove</button>    </div></div>";
  note_template = "<footer class=\"row\">    <div class=\"span16\">        <p><b>Note: </b>{note}</p>    </div></footer>";
  export_template = "<!DOCTYPE html> <html lang=\"en\">    <head>        <meta charset=\"utf-8\">        <title>            {title}        </title>        <link rel=\"stylesheet\" href=\"http://assets.needium.com.s3.amazonaws.com/bootstrap/bootstrap.min.css\" type=\"text/css\">        <style type=\"text/css\" media=\"all\">            .tweet{padding-top:0.5em;padding-bottom:0.5em;}            .tweet:nth-of-type(2n){background:#f0f0f0}            time{color:#999;padding-right:1em}            .tweet p{font-size:1.25em;padding:0.5em 0em}        </style>        <style type=\"text/css\" media=\"print\">            .tweet{border-bottom:1px dotted #999;}        </style>    </head>    <body>        <div class=\"container\">        {title_markup}        {tweets_markup}        {note_markup}        </div>    </body></html>";
  displayTweets = function(tweets) {
    return tweets.map(function(tweet, i) {
      if (tweet.error) {
        return $(error_template.supplant({
          sid: tweet.sid,
          text: "[" + tweet.error + "] There was an error fetching tweet with id: " + tweet.sid
        })).data({
          tweet: tweet
        }).appendTo('#preview-tweets');
      } else {
        console.log(tweet);
        return $(tweet_template.supplant({
          sid: tweet.id_str,
          icon: tweet.user.profile_image_url,
          text: tweet.text,
          user: "@" + tweet.user.screen_name,
          date: new Date(tweet.created_at).strftime("%d %b. %Y - %I:%M %p")
        })).data({
          tweet: tweet
        }).appendTo('#preview-tweets');
      }
    });
  };
  popHTML = function(html) {
    var $html, win;
    $html = $(html);
    return win = window.open("data:text/html," + (encodeURIComponent(html)), $html.find('title').text(), 'height=500,width=1024');
  };
  getMarkup = function() {
    var data, tweets;
    tweets = $('#preview-tweets').clone();
    tweets.find('.erroneous').remove();
    tweets.find('.buttons').remove();
    tweets.find('.span12').removeClass('span12').addClass('span14');
    data = {
      title: $('#preview-title').text(),
      title_markup: $('#preview-title').html(),
      note_markup: $('#preview-note').html(),
      tweets_markup: tweets.html()
    };
    return export_template.supplant(data);
  };
  $(function() {
    var lastValue;
    lastValue = '';
    $('#items').bind('keyup', function() {
      var currentValue, items, sids, _ref;
      currentValue = $(this).val().trim();
      if (!currentValue || currentValue === lastValue) {
        return;
      }
      _ref = extractStatusIds(currentValue), sids = _ref.sids, items = _ref.items;
      return $(this).data('sids', sids).val(items.join("\n"));
    });
    $('#items').trigger('keyup');
    $('#go').bind('click', function(e) {
      var currentValue, fetchall, note, title;
      e.preventDefault();
      currentValue = $('#items').val();
      if (lastValue !== currentValue) {
        $('#preview-tweets').empty().sortable().disableSelection();
        fetchall = fetchStatuses($('#items').data('sids'));
        fetchall.done(displayTweets);
        fetchall.fail(displayFailure);
        lastValue = currentValue;
      }
      if (title = $('#title').val()) {
        $('#preview-title h2').text(title);
      }
      if (note = $('#note').val()) {
        return $('#preview-note').html(note_template.supplant({
          note: note
        }));
      }
    });
    $('.remove').live('click', function() {
      return $(this).parents('.tweet').remove();
    });
    $('#export-html').bind('click', function(e) {
      var go;
      e.preventDefault();
      go = $('#go');
      return go.one('click', function() {
        return popHTML(getMarkup());
      }).trigger('click');
    });
    return $('#export-pdf').bind('click', function(e) {
      var go;
      e.preventDefault();
      go = $('#go');
      return go.one('click', function() {
        return popPDF(getMarkup());
      }).trigger('click');
    });
  });
}).call(this);
