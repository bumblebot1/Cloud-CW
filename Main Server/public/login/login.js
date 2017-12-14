function logged_in(googleUser) {
    var data = JSON.stringify({
        authToken: googleUser.getAuthResponse().id_token
    });
    
    var postReq = new XMLHttpRequest();
    postReq.open("POST", "http://localhost:8080/userLogin");
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
            localStorage.setItem("userid", resp["id"]);
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

function fileSelected(fileList) {
    var file = fileList[0];
    console.log(file);
    var fileNameSpan = document.getElementById("file-message");
    fileNameSpan.innerText = file.name;

    var img = document.createElement("img");
    img.file = file;
    img.className = "preview-image";

    document.getElementById("upload-area").appendChild(img);
    var reader = new FileReader();
    reader.onload = (function(aImg) { 
            return function(e) { 
                aImg.src = e.target.result; 
            }; 
    })(img);
    reader.readAsDataURL(file);
    
    var req = new XMLHttpRequest();
    req.open("POST", "http://localhost:8080/imageUpload");
    formData = new FormData();
    formData.append("id", localStorage.getItem("userid"));
    formData.append("imageFile", file);
    req.send(formData);
}
