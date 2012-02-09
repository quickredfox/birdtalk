###
	birdtalk
###

$ = jQuery.sub()

$.fn.lock     = ()-> $(@).addClass('locked')
$.fn.unlock   = ()-> $(@).removeClass('locked')
$.fn.isLocked = ()-> $(@).hasClass('locked')

$.userNotify  = (level="info", text, big=false)->
    classes = "alert-message #{level} container" 
    if big then classes += " block-message"
    $msg =  $('<p>').html( text ).css('padding','5px')
    alertclass = if level is 'warning' then '' else "alert-#{level}"
    $box =  $('<div>').addClass( "alert-message #{alertclass} container" )
    $box.append $('<a>').attr('href','#').addClass('close').attr('data-dismiss','alert').text('x')
    $box.append $msg
    $('body').prepend( $box.alert() )
    setTimeout ()->
        $box.fadeOut ()-> $box.remove()
    , 10000
$.userInfo    =-> $.userNotify( 'info',    arguments[0], arguments[1] )
$.userWarn    =-> $.userNotify( 'warning', arguments[0], arguments[1] )
$.userError   =-> $.userNotify( 'error',   arguments[0], arguments[1] )
$.userSuccess =-> $.userNotify( 'success', arguments[0], arguments[1] )

getStatusID = ( value )->
    value = value.trim()
    if /^\d+$/.test value then return value
    matches = value.match /(\d+)$/g
    if matches then return matches[ 0 ]
    return false

    
readForm = ()->
    $('.source-input.error').removeClass('error')
    data  = { status_ids: {}, title: false, note: false, logo: false }
    $('.source-input').each ()-> 
        $field = $(@)
        if getStatusID value = $field.find('input').val()
            data.status_ids[value] = value
        else if value isnt ''
            $field.addClass('error').on 'change', ()-> $(@).removeClass('error')
    title = $('#title').val().trim()
    note  = $('#note').val().trim()
    logo  = $('#logo').is(':checked')
    if title and title isnt ''
        data.title = title
    if note and note isnt ''
        data.note  = note
    data.logo = logo
    data.status_ids = Object.keys( data.status_ids )
    return data

$.progressBar = (min,max)->
    $el = $('<progress class="row">').attr( min:min,max:max,value:0).hide()
    $el.touch = ()->
        $el.show()
        newvalue = 1 + parseFloat( $el.val() )
        $el.val newvalue
        if newvalue is max 
            $el.fadeOut ()-> $el.remove()
    return $el

putSession = ( key, object )->
    if sessionStorage is undefined
        putSession[key] = object
    else
        sessionStorage.setItem key, JSON.stringify( object )
    return object
        
getSession = ( key )->
    if sessionStorage is undefined
        return putSession[key]
    else
        data = sessionStorage.getItem( key ) 
        try
            json = JSON.parse( data )
        catch E
            json = { error: E }
    return json


fetchTweet  = ( status_id )->
    defer     = $.Deferred()
    key       = "TWITTER:STATUS:#{status_id}"
    timeout   = setTimeout ()->
        defer.reject( 'timeout' )
    , 5000
    if json = getSession( key )
        defer.resolve( json )
    else
        $.getJSON "http://api.twitter.com/1/statuses/show/#{status_id}.json?callback=?", ( json, status )->
            clearTimeout( timeout )
            if status isnt 'success' then defer.reject( status )
            else defer.resolve( putSession( key, json ) )
    return defer.promise()
    
renderPreview = ( tweet )->
    html= "<div class='sortable span12'>
                <div class='tweet span8'>
                    <div class='row'>
                        <div class='span1'><img src='"+tweet.user.profile_image_url+"' width='50' height='50'></div>
                        <div class='span7'>
                            <div class='info'>
                                <a class='user' href='http://twitter.com/#!/"+tweet.user.screen_name+"'>@"+tweet.user.screen_name+"</a>
                                <time class='pull-right'>"+(new Date(tweet.created_at).strftime('%d %b. %Y - %I:%M %p'))+"</time>
                            </div>
                            <div class='text'><p>"+tweet.text+"</p></div>
                        </div>
                    </div>
                </div>
                <div class='span2 tweet-actions'><a href='#' class='btn btn-danger remove' data-value='"+tweet.id_str+"'>remove</a></div>
           </div>"
         
    $( html ).data( json: tweet )
    
onSubmit = (e)->
    e.preventDefault()
    # read form
    data = readForm()
    # validate form
    if data.status_ids.length < 1
        $.userError "<strong>Form error, </strong> please provide some status IDs or tweet URLS."
    else if $('.source-input.error').length > 0
        $.userError "<strong>Field error, </strong> please fix the highlighted fields."
    else
        progress = $.progressBar( 0, data.status_ids.length )
        $('fieldset.form-actions').prepend( progress )
        $('#editor .form-actions button').addClass('busy')
        fetch = $.whenSome.apply null, data.status_ids.map ( status_id )-> 
            promise = fetchTweet( status_id )
            promise.always ()-> progress.touch()
            return promise
        fetch.fail ()->
            $.userError "<strong>Fetch error, </strong> no data or could not access these tweets."
        fetch.done ()->
            tweets = Array::slice.call arguments
            if tweets.length isnt data.status_ids.length
                $.userWarn "<strong>Fetch error, </strong> some tweets were not found or couldn't be accessed."
            openSorter ()-> 
                previews = []
                tweets.map ( tweet )->
                    $preview = renderPreview( tweet )
                    previews.push $preview
                    $('#sorter .sortables').append( $preview ).sortable()
        fetch.always ()->
            $('#editor .form-actions button').removeClass('busy')
                    

getMarkup = ( data )->     
    html = "<!DOCTYPE html> 
    <html lang=\"en\">
        <head>
            <meta charset=\"utf-8\">
            <title>#{data.title}</title>
            <link rel=\"stylesheet\" href=\"http://assets.needium.com/lib/bootstrap/2.0/css/bootstrap.css\" type=\"text/css\">
            <style type=\"text/css\" media=\"all\">
                .tweet {border:1px solid #ccc;margin: 0 0 0.5em 110px;padding: 10px;width: 650px;}
                .tweet time {color: #999;}
                .tweet p {padding: 10px 20px 0 20px; font-size:1.25em;line-height:1.35em}
                .tweet .user{font-size:1.25em;font-weight:bold}
                .footnote {color: #666;margin-top: 1em;background: #F9F9F9;padding: 10px;}
                body{padding-top:45px;}
            </style>
        </head>
        <body>"
    if data.logo
        
        html += "<div class='navbar navbar-fixed-top' data-scrollspy='scrollspy'>
           <div class='navbar-inner'>
               <div class='container'>
                   <img class=\"brand\" src='http://assets.needium.com/logos/needium-logo-bootstrap.png' height='25'/>
               </div>
           </div>
        </div>"
    html += "<div class=\"container\">
                <div class=\"page-header\">
                    <h1>#{data.title}</h1>
                </div>"
    data.tweets.forEach ( tweet )->
        {json} = tweet
        console.log json
        html += "<div class=\"row tweet\">
                    <div class=\"span1\"><img class=\"avatar\" src=\"#{json.user.profile_image_url}\"></div>

                    <div class=\"span7\">
                        <div class=\"row\">
                            <div class=\"user span4\">@#{json.user.screen_name}</div>
                            <div class=\"date span3\"><time class=\"pull-right\">#{new Date( json.created_at ).strftime("%d %b. %Y - %I:%M %p")}</time></div>                        
                        </div>
                        <div class=\"row\">
                            <p>#{json.text}</p>
                        </div>
                    </div>
            
        </div>"
    if data.note
        html += "<footer class=\"footnote\"><p>#{data.note}</p></footer>"
    html +=  "</div></body></html>"
    return html
    


onRender = (e)->
    e.preventDefault()
    tweets = []
    $('#sorter .sortable').each ()->
        tweets.push $( @ ).data()
    data = readForm()
    delete data.status_ids
    data.tweets = tweets
    data.title ||= "Conversation report"
    closeSorter ()->
        window.open "data:text/html;charset=UTF8,#{encodeURIComponent( getMarkup( data ) )}"

    
    
openSorter  = ( fn )->
    $('#editor').slideUp ->
        fn() if fn
        $('#sorter').slideDown()
    
closeSorter = ( fn )->
    $('#sorter').slideUp ->
        fn() if fn
        $('#sorter .sortables').empty()
        $('#editor').slideDown()
    
    
    
$ ()->
    $('#sorter *[data-dismiss=sorter]').on 'click', -> closeSorter()
    $('#sorter').on 'click','.remove',  ->  $( @ ).parents('.sortable').remove()
    
    $("#sorter .render").on 'click', onRender
        
    
    
    $sources = $('.source-inputs')
    $sources.on 'click', '.remove', ()->
        $input = $(@).parent('.source-input')
        siblings = $input.siblings()
        if siblings.length < 8
            $input.find('input').val('').trigger 'change'
        else
            $input.remove()
     $sources.on 'click','.add', ()->   
        $input  = $(@).parent('.source-input')
        index   = $('.source-input').length
        $input.after '<div class="source-input clearfix">'+
                     '<input placeholder="Tweet URL or status ID" type="text" class="span4" />'+
                     '<button type="button" class="add btn  btn-small span1">+</button>'+
                     '<button type="button" class="remove btn btn-danger small span1">-</button></div>'
    $('#editor').on( 'submit', onSubmit )
    
 