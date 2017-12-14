"use strict";

function logged_in(googleUser) {
    var data = JSON.stringify({
        authToken: googleUser.getAuthResponse().id_token
    });
    
    var postReq = new XMLHttpRequest();
    postReq.open("POST", "https://imshare-189020.appspot.com/userLogin");
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
            sessionStorage.setItem("userid", resp["id"]);
            console.log("signed in as: " + resp["email"]);
            var uploadStatus = document.getElementById("upload-status");
            if (uploadStatus) {
                uploadStatus.parentNode.removeChild(uploadStatus);   
            }
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
        var exists = false;
        if (document.getElementById("upload-status")) {
            exists = true;
        }
        var message = exists ? document.getElementById("upload-status") : document.createElement("div");
        message.id = "upload-status";
        message.innerText = "Upload failed because you are not signed in! Click the button at the top right to sign in!";
        if(!exists){
            uploadArea.appendChild(message);
        }
        event.target.file = "";
        return;
    }
    var fileList = event.target.files;
    if(!fileList.length){
        console.log("no file selected");
        return;
    }

    var file = fileList[0];
    
    if (document.getElementById("upload-status")) {
        uploadArea.removeChild(document.getElementById("upload-status"))
    }

    var fileNameSpan = document.getElementById("file-message");
    fileNameSpan.innerText = file.name;

    var img = document.getElementById("preview-image");
    if(!img) {
        img = document.createElement("img");
        img.file = file;
        img.id = "preview-image";
        img.className = "preview-image";
        uploadArea.appendChild(img);    
    }
    
    var reader = new FileReader();
    reader.onload = (function(aImg) { 
        return function(e) { 
            aImg.src = e.target.result; 
        }; 
    })(img);
    reader.readAsDataURL(file);
    
    var req = new XMLHttpRequest();
    req.open("POST", "https://imshare-189020.appspot.com/imageUpload");
    var formData = new FormData();
    formData.append("id", sessionStorage.getItem("userid"));
    formData.append("imageFile", file);
    req.send(formData);

    var message = document.createElement("div");
    message.id = "upload-status";
    message.innerText = "You're image was uploaded successfully!";
    uploadArea.appendChild(message);
}

function getMyGallery(event){
    if(sessionStorage.getItem("userid")){
        window.location.href = "https://imshare-189020.appspot.com/gallery?userid="+sessionStorage.getItem("userid");
    } else {
        alert("You are not logged in, sign in to view your gallery!");
    }
}

window.onload = function() {
    document.getElementById("file-input").addEventListener("change", fileSelected);
    document.getElementById("gallery-button").addEventListener("click", getMyGallery);
}