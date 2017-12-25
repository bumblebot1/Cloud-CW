"use strict";

var server = "https://imshare-189020.appspot.com/";

function logged_in(googleUser) {
    var token = googleUser.getAuthResponse().id_token;
    sessionStorage.setItem("token", token);
    var data = JSON.stringify({
        authToken: token
    });
    
    var postReq = new XMLHttpRequest();
    postReq.open("POST", server + "userLogin");
    postReq.setRequestHeader("Content-Type", "application/json");
    postReq.send(data);
    postReq.onreadystatechange = function(){
        if(postReq.readyState != XMLHttpRequest.DONE) {
            return;
        }
        var resp = JSON.parse(postReq.response);
        var signinButton = document.getElementById("signin-button");
        if(signinButton){
            var spanLogin = document.createElement("span");
            spanLogin.innerText = "logged in as: ";
    
            var spanEmail = document.createElement("span");
            spanEmail.innerText = resp["email"];
            spanEmail.className = "mailaddress";
    
            var newDiv = document.createElement("div").appendChild(spanLogin);
            newDiv.appendChild(spanEmail);
            newDiv.className = "signin-button smallText"
            signinButton.parentNode.replaceChild(newDiv, signinButton);

            var message = document.getElementById("upload-status");
            message.innerText = "Click below to choose an image";
            
            sessionStorage.setItem("userid", resp["id"]);
            sessionStorage.setItem("email", resp["email"]);

            console.log("signed in as: " + resp["email"]);
        }
    }
}


function renderLoginButton(){
    sessionStorage.clear();
    gapi.signin2.render('signin-button', {
        'scope': 'profile email',
        'width': 50,
        'height': 50,
        'longtitle': true,
        'theme': 'white',
        'onsuccess': logged_in
    });
}

function fileSelected(event) {
    var uploadArea = document.getElementById("upload-area");
    if(!sessionStorage.getItem("userid")) {
        var message = document.getElementById("upload-status");
        message.innerText = "You must sign in before choosing an image!";
        event.target.file = "";
        return;
    }
    var fileList = event.target.files;
    if(!fileList.length){
        console.log("no file selected");
        return;
    }

    var file = fileList[0];
    var fileNameSpan = document.getElementById("file-message");
    fileNameSpan.innerText = file.name;

    var img = document.getElementById("preview-image");
    var imgData = document.getElementById("image-data");
    window.imageFile = file;
    img.className = "preview-image";
    
    window.hiddenImage = new Image();
    var reader = new FileReader();
    reader.onload = function(e) { 
        hiddenImage.src = e.target.result;
        hiddenImage.style.width = "100%";
        hiddenImage.style.height = "100%";
        hiddenImage.onload = function() {
            window.grayscaleTexture = grayscaleCanvas.texture(hiddenImage);
            window.sepiaTexture = sepiaCanvas.texture(hiddenImage);

            grayscaleCanvas.draw(grayscaleTexture).hueSaturation(0,-1).update();
            sepiaCanvas.draw(sepiaTexture).sepia(1).update();
        }
        img.src = e.target.result;
    };
    img.onload = function() {
        var dkrm = new Darkroom('#preview-image', {
            // Size options
            minWidth: 850,
            minHeight: 800,
            maxWidth: 850,
            maxHeight: 800,
            ratio: 4/3,
            backgroundColor: '#000',
            // Plugins options
            plugins: {
                save: {
                    callback: function() {
                        var croppedImage = document.createElement("img");
                        var newImage = dkrm.canvas.toDataURL();
                        croppedImage.src = newImage;
                        croppedImage.onload = function() {
                            console.log("here");
                            window.grayscaleTexture = grayscaleCanvas.texture(croppedImage);
                            window.sepiaTexture = sepiaCanvas.texture(croppedImage);
                    
                            grayscaleCanvas.draw(grayscaleTexture).hueSaturation(0,-1).update();
                            sepiaCanvas.draw(sepiaTexture).sepia(1).update();
                            var buttons = document.getElementsByClassName("myButton");
                            for(var i = 0; i < buttons.length; i++) {
                                buttons[i].classList.remove("disabled-button");
                                buttons[i].disabled = false;
                            }
                        }
                        croppedImage.id = "preview-image";
                        croppedImage.className = "preview-image";
                        var darkRoomWrapper = this.darkroom.containerElement;
                        document.getElementById("upload-area").replaceChild(croppedImage, darkRoomWrapper);
                    }
                },
                crop: {
                    quickCropKey: 67
                }
            },
            // Post initialize script
            initialize: function() {
              var cropPlugin = this.plugins['crop'];
              cropPlugin.requireFocus();
              var buttons = document.getElementsByClassName("myButton");
              for(var i = 0; i < buttons.length; i++) {
                  buttons[i].className += " disabled-button";
                  buttons[i].disabled = true;
              }
            }
          });
    }; 
    reader.readAsDataURL(file);
    document.getElementById("image-menu").classList.remove("hidden");
    document.getElementById("grayscale").addEventListener("click", grayscaleImage);
    document.getElementById("sepia").addEventListener("click", sepiaImage);
    document.getElementById("original").addEventListener("click", originalImage);
    document.getElementById("upload").addEventListener("click", uploadImage);

    var message = document.getElementById("upload-status");
    message.innerText = "You can now preview your image, apply effects or upload it.";
}

function getMyGallery(event){
    if(sessionStorage.getItem("userid")){
        window.location.href = server + "gallery?userid="+sessionStorage.getItem("userid");
    } else {
        alert("You are not logged in, sign in to view your gallery!");
    }
}

function grayscaleImage(event) {
    var img = document.getElementById("preview-image");
    if(img){
        var file = window.imageFile;
        img.src = grayscaleCanvas.toDataURL(file.type);
    }
}

function sepiaImage(event) {
    var img = document.getElementById("preview-image");
    if(img){
        var file = window.imageFile;
        img.src = sepiaCanvas.toDataURL(file.type);
    }
}

function originalImage(event) {
    var img = document.getElementById("preview-image");
    var file = window.imageFile;
    console.log(file);
    var reader = new FileReader();
    reader.onload = function(e) { 
        img.src = e.target.result; 
    }; 
    reader.readAsDataURL(file);
}

function urltoFile(url, filename, mimeType){
    return (fetch(url)
        .then(function(res){return res.arrayBuffer();})
        .then(function(buf){return new File([buf], filename, {type:mimeType});})
    );
}

function uploadImage(event) {
    var img = document.getElementById("preview-image");
    var file = window.imageFile;
    console.log(file);
    console.log(file.name)
    console.log(file.type);
    urltoFile(img.src, file.name, file.type)
    .then(function(file){
        console.log(file);
        var req = new XMLHttpRequest();
        req.open("POST", server + "uploadImage");
        var formData = new FormData();
        formData.append("id", sessionStorage.getItem("userid"));
        formData.append("email", sessionStorage.getItem("email"));
        formData.append("imageFile", file);
        req.send(formData);
        req.onreadystatechange = function(){
            if(req.readyState == XMLHttpRequest.DONE) {
                if(req.status == 200) {
                    document.getElementById("image-menu").className += " hidden";
                    document.getElementById("file-message").innerText = "Choose an image...";
                    document.getElementById("preview-image").className += " hidden";
                }
                if(req.status == 409) {
                    alert("file name already in use");
                }
            }
        }
    })
}

window.onload = function() {
    window.grayscaleCanvas = fx.canvas();
    window.sepiaCanvas = fx.canvas();
    document.getElementById("file-input").addEventListener("change", fileSelected);
    document.getElementById("gallery-button").addEventListener("click", getMyGallery);
}