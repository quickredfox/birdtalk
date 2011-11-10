###
	birdtalk
###
if !String::supplant
    String::supplant = (o)->
        @.replace /{([^{}]*)}/g, (a,b)->
            r = o[b]
            if typeof r is 'string' or typeof r is 'number' then r else a

FETCH_TIMEOUT = 3000

fetchStatuses = (sids)->
        progress = $('#fetch-progress').show().attr max: sids.length, min: 0, value: 0
        progressValue = 0
        fetches = sids.map ( sid )->
            defer     = $.Deferred()
            setTimeout ()-> 
                exists = sessionStorage.getItem( "SID:#{sid}" )
                unless exists
                    json = error: 'timeout or unauthorized', sid: sid
                    sessionStorage.setItem "SID:#{sid}", JSON.stringify( json )
                    defer.resolve( json )
            , FETCH_TIMEOUT
            if json = sessionStorage.getItem "SID:#{sid}"
                defer.resolve JSON.parse( json )
            else
                $.getJSON "http://api.twitter.com/1/statuses/show/#{sid}.json?callback=?", ( json, status )->
                    if status isnt 'success' 
                        json = error: status , sid: sid
                    sessionStorage.setItem "SID:#{sid}", JSON.stringify( json )
                    defer.resolve json 
            defer.always ()->
                progressValue++
                progress.attr value: progressValue
                if progressValue is sids.length then progress.fadeOut()
            return defer.promise()
        $.when.apply( $.Deferred, fetches ).pipe ()-> Array::slice.call arguments
            

extractStatusIds = ( currentValue )->
    stale = currentValue.split /[\s\r\n]+/gm
    sids  = []
    valid = []
    id_str_re = /(\d+)$/g
    hash_no_shebang_re = /(\#[^\!]+)/g
    stale.forEach ( item )-> 
        item = item.replace( hash_no_shebang_re, '' )
        matches = item.match( id_str_re )
        unless matches
            return
        if sids.indexOf( matches[0] ) is -1
            valid.push item
            sids.push matches[0]
    return { sids: sids, items: valid }

displayFailure = ( failure )-> alert failure

tweet_template = "<div class=\"tweet row\">
    <div class=\"span2\">
        <img width=\"50\" height=\"50\" src=\"{icon}\" />
        <!--<menu>
            <a href=\"https://twitter.com/intent/tweet?in_reply_to={sid}\">Reply</a>
            <a href=\"https://twitter.com/intent/retweet?tweet_id={sid}\">Retweet</a>
            <a href=\"https://twitter.com/intent/favorite?tweet_id={sid}\">Favorite</a>
        </menu>-->
    </div>
    <div class=\"span12\">   
        <div class=\"row\">
            <strong>{user}</strong>
            <time class=\"pull-right\">{date}</time>
        </div>
        <div class=\"row\">
            <p>{text}</p>
        </div>     
        
    </div>
    <div class=\"span2 buttons\">
        <button type=\"button\" class=\"btn danger remove\">remove</button>
    </div>
</div>"
error_template =  "<div class=\"tweet row erroneous\">
    <div class=\"span2\">
        <img width=\"50\" height=\"50\" src=\"http://assets.needium.com.s3.amazonaws.com/blanks/avatar-160x160.png\">
    </div>
    <div class=\"span12\">
        <p>{text}</p>
    </div>
    <div class=\"span2 buttons\">
        <button type=\"button\" class=\"btn danger remove\">remove</button>
    </div>
</div>"
note_template = "<footer class=\"row\">
    <div class=\"span16\">
        <p><b>Note: </b>{note}</p>
    </div>
</footer>"
export_template = "<!DOCTYPE html> 
<html lang=\"en\">
    <head>
        <meta charset=\"utf-8\">
        <title>
            {title}
        </title>
        <link rel=\"stylesheet\" href=\"http://assets.needium.com.s3.amazonaws.com/lib/bootstrap/1.4.0/bootstrap.min.css\" type=\"text/css\">
        <style type=\"text/css\" media=\"all\">
            .tweet{padding-top:0.5em;padding-bottom:0.5em;}
            .tweet:nth-of-type(2n){background:#f0f0f0}
            time{color:#999;padding-right:1em}
            .tweet p{font-size:1.25em;padding:0.5em 0em}
        </style>
        <style type=\"text/css\" media=\"print\">
            .tweet{border-bottom:1px dotted #999;}
        </style>
    </head>
    <body>
        <div class=\"container\">
        {title_markup}
        {tweets_markup}
        {note_markup}
        </div>
    </body>
</html>"
displayTweets  = ( tweets )->
    tweets.map (tweet,i)->
        if tweet.error
            $( error_template.supplant( 
                sid: tweet.sid
                text: "[#{tweet.error}] There was an error fetching tweet with id: #{tweet.sid}"
            ) ).data( tweet: tweet ).appendTo('#preview-tweets')
            
        else
            console.log tweet
            $( tweet_template.supplant( 
                sid:  tweet.id_str
                icon: tweet.user.profile_image_url
                text: tweet.text
                user: "@#{tweet.user.screen_name}"
                date: new Date( tweet.created_at ).strftime("%d %b. %Y - %I:%M %p")
            ) ).data( tweet: tweet ).appendTo('#preview-tweets')

popHTML = (html)->
    $html = $(html)
    win = window.open "data:text/html,#{encodeURIComponent(html)}", $html.find('title').text(), 'height=500,width=1024'

getMarkup = ()->    
    tweets = $('#preview-tweets').clone()
    tweets.find('.erroneous').remove()
    tweets.find( '.buttons').remove()
    tweets.find('.span12').removeClass('span12').addClass('span14')
    data = 
        title: $('#preview-title').text()
        title_markup: $('#preview-title').html()
        note_markup:  $('#preview-note').html()
        tweets_markup:tweets.html()
    return export_template.supplant( data )
    
$ ->
    lastValue = ''
    $('#items').bind 'keyup', ()->
        currentValue =  $(this).val().trim()
        return if not currentValue or currentValue is lastValue
        {sids,items} = extractStatusIds( currentValue )
        $(this).data('sids', sids ).val items.join("\n")
    $('#items').trigger 'keyup'
    $('#go').bind 'click', (e)->
        e.preventDefault()
        currentValue = $('#items').val()
        if lastValue isnt currentValue
            $('#preview-tweets').empty().sortable().disableSelection()
            fetchall = fetchStatuses( $('#items').data('sids') )
            fetchall.done displayTweets
            fetchall.fail displayFailure
            lastValue = currentValue
        if title = $('#title').val() 
            $('#preview-title h2').text( title )
        if note  = $('#note').val() 
            $('#preview-note').html( note_template.supplant( note: note ) )
    $('.remove').live 'click', ()->
        $(this).parents('.tweet').remove()
    $('#export-html').bind 'click', (e)->
        e.preventDefault()
        go = $('#go')
        go.one( 'click', ()-> popHTML getMarkup() ).trigger 'click'
    $('#export-pdf').bind 'click', (e)->
        e.preventDefault()
        go = $('#go')
        go.one( 'click', ()-> popPDF getMarkup() ).trigger 'click'

