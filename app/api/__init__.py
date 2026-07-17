from app.api.routes import assessments, missions, results, sessions

ROUTERS = [assessments.router, sessions.router, results.router, missions.router]
