from app.api.routes import assessments, results, sessions

ROUTERS = [assessments.router, sessions.router, results.router]
