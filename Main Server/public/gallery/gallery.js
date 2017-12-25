$(function(){
    $('#myGallery').justifiedGallery({
        lastRow : 'justify',
        rowHeight : 250,
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

    $('.links').on("click", function(event) {
        if($(event.target).is("button")){
            event.stopPropagation();
            event.preventDefault();
            var params = {
                authToken: sessionStorage.getItem("token"),
                imageName: $(event.target).data("name")
            };
            console.log(params);
            $.get("https://imshare-189020.appspot.com/deleteImage", params).done(function(resp, status, xhr) {
                if(xhr.status === 200) {
                    window.location.reload(true);
                }
            });
        }
    });
});