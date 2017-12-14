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
            spanLogin = document.createElement("span");
            spanLogin.innerText = "logged in as: ";
    
            spanEmail = document.createElement("span");
            spanEmail.innerText = resp["email"];
            spanEmail.className = "mailaddress";
    
            var newDiv = document.createElement("div").appendChild(spanLogin);
            newDiv.appendChild(spanEmail);
            newDiv.className = "signin-button smallText"
            signinButton.parentNode.replaceChild(newDiv, signinButton);
            sessionStorage.setItem("userid", resp["id"]);
            document.getElementById("file-input").disabled = false;
            document.getElementById("upload-label").classList.remove("disabled-upload");
            document.getElementById("gallery-button").classList.remove("disabled-upload");
            console.log("signed in as: " + resp["email"]);
        }
    }
}


function renderLoginButton(){
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
    var fileList = event.target.files;
    var file = fileList[0];

    var fileNameSpan = document.getElementById("file-message");
    fileNameSpan.innerText = file.name;

    var img = document.getElementById("preview-image");
    if(!img) {
        img = document.createElement("img");
        img.file = file;
        img.id = "preview-image";
        img.className = "preview-image";
        var uploadArea = document.getElementById("upload-area");
        uploadArea.appendChild(img);
        
        var message = document.createElement("div");
        message.innerText = "You're image was uploaded successfully!";
        uploadArea.appendChild(message);
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
    formData = new FormData();
    formData.append("id", sessionStorage.getItem("userid"));
    formData.append("imageFile", file);
    req.send(formData);
}

function getMyGallery(event){
    window.location.href = "https://imshare-189020.appspot.com/gallery?userid="+sessionStorage.getItem("userid");
}

window.onload = function() {
    document.getElementById("file-input").addEventListener("change", fileSelected);
    document.getElementById("gallery-button").addEventListener("click", getMyGallery);
}