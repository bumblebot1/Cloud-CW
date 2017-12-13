function logged_in(googleUser) {
    var data = JSON.stringify({
        authToken: googleUser.getAuthResponse().id_token,
        id: googleUser.getId()
    });
    
    var postReq = new XMLHttpRequest();
    postReq.open("POST", "http://localhost:8080/userLogin");
    postReq.setRequestHeader("Content-Type", "application/json");
    postReq.send(data);
}