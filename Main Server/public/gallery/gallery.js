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
});