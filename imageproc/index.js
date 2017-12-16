const path = require('path');
const os = require('os');
const fs = require('fs');
const Busboy = require('busboy');
const Jimp = require('jimp');

exports.imageproc = (req, res) => {
    if (req.method === 'POST') {
        const busboy = new Busboy({ headers: req.headers });
        // This object will accumulate all the uploaded files, keyed by their name.
        const uploads = {}
        const tmpdir = os.tmpdir();

        // This callback will be invoked for each file uploaded.
        busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            // Note that os.tmpdir() is an in-memory file system, so should
            // only be used for files small enough to fit in memory.
            const filepath = path.join(tmpdir, filename)
            uploads[fieldname] = filepath;
            file.pipe(fs.createWriteStream(filepath));
        });

        // This callback will be invoked after all uploaded files are saved.
        busboy.on('finish', () => {

            // The raw bytes of the upload will be in req.rawBody. Send it to
            // busboy, and get a callback when it's finished.
            
            for (const name in uploads) {
                const file = uploads[name];
                console.log(file);
                Jimp.read(file, function(err, image){
                   image.greyscale();
                   image.getBase64(image.getMIME(), function(err, buffer){
                    console.log(err)
                    console.log(buffer);
                   });
                })
            }
            res.end();
        });

        busboy.end(req.rawBody);
    } else {
        // Client error - only support POST.
        res.status(405).end();
    }
}
