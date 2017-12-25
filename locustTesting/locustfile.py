from locust import HttpLocust, TaskSet, task

class UserBehavior(TaskSet):
    @task
    def index(self):
        self.client.get("/")

    @task
    def gallery(self):
        self.client.get("/gallery?userid=101574043679618828029")

    @task
    def search(self):
        self.client.get("/search?value=m")

class WebsiteUser(HttpLocust):
    host = "https://imshare-189020.appspot.com"
    task_set = UserBehavior
    min_wait = 5000
    max_wait = 9000