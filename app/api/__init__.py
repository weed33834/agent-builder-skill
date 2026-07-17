from app.api.routes import assessments, auth, missions, results, sessions

ROUTERS = [assessments.router, sessions.router, results.router, missions.router, auth.router]
