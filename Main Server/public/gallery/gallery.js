$(function(){
    $('#myGallery').justifiedGallery({
        lastRow : 'nojustify', 
        rowHeight : 180, 
        rel : 'gallery',
        margins : 5
    }).on('jg.complete', function () {
        $(this).find('a').colorbox({
            maxWidth : '80%',
            maxHeight : '80%',
            opacity : 0.8,
            transition : 'elastic',
            current : ''
        });
    });

    var url = new URL(window.location.href);
    var userid = url.searchParams.get("userid");
    $.get("https://imshare-189020.appspot.com/viewCount", {userid: userid}).done(function(resp) {
        $("#viewsNumber").text(resp.count);
        $("#viewCounter").removeClass("hidden");
    });
});