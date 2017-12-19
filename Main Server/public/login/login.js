"use strict";

var server = "https://imshare-189020.appspot.com/";

function logged_in(googleUser) {
    var data = JSON.stringify({
        authToken: googleUser.getAuthResponse().id_token
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
    img.file = file;
    img.className = "preview-image";
    
    var reader = new FileReader();
    reader.onload = function(e) { 
        img.src = e.target.result;
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
        var wrapperImg = document.createElement("img");
        var reader = new FileReader();
        reader.onload = (function(aImg) { 
            return function(e) { 
                aImg.src = e.target.result;
                aImg.style.width = "100%";
                aImg.style.height = "100%";
                var canvas = window.canvas;
                var texture = canvas.texture(aImg);	
                canvas.draw(texture).hueSaturation(0, -1).update()
                img.src = canvas.toDataURL(img.file.type);
            }; 
        })(wrapperImg);
        reader.readAsDataURL(img.file);
    }
}

function sepiaImage(event) {
    var img = document.getElementById("preview-image");
    if(img){
        var wrapperImg = document.createElement("img");
        var reader = new FileReader();
        reader.onload = (function(aImg) { 
            return function(e) { 
                aImg.src = e.target.result;
                aImg.style.width = "100%";
                aImg.style.height = "100%";
                var canvas = window.canvas;
                var texture = canvas.texture(aImg);	
                canvas.draw(texture).sepia(1).update()
                img.src = canvas.toDataURL(img.file.type);
            }; 
        })(wrapperImg);
        reader.readAsDataURL(img.file);
    }
}

function originalImage(event) {
    var img = document.getElementById("preview-image");
    
    var reader = new FileReader();
    reader.onload = (function(aImg) { 
        return function(e) { 
            aImg.src = e.target.result; 
        }; 
    })(img);
    reader.readAsDataURL(img.file);
}

function urltoFile(url, filename, mimeType){
    return (fetch(url)
        .then(function(res){return res.arrayBuffer();})
        .then(function(buf){return new File([buf], filename, {type:mimeType});})
    );
}

function uploadImage(event) {
    var img = document.getElementById("preview-image");
    console.log(img.file);
    console.log(img.file.name)
    console.log(img.file.type);
    urltoFile(img.src, img.file.name, img.file.type)
    .then(function(file){
        console.log(file);
        var req = new XMLHttpRequest();
        req.open("POST", server + "uploadImage");
        var formData = new FormData();
        formData.append("id", sessionStorage.getItem("userid"));
        formData.append("email", sessionStorage.getItem("email"));
        formData.append("imageFile", file);
        req.send(formData);
    })
}

window.onload = function() {
    window.canvas = fx.canvas();
    document.getElementById("file-input").addEventListener("change", fileSelected);
    document.getElementById("gallery-button").addEventListener("click", getMyGallery);
}