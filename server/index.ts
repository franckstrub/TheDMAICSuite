import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import migrateRaciRolesToFunction from "./migrateRaciRoles";
import { registerProjectRoutes } from "./routes-project";
import { runMigrations } from "./db-migrations";
import { setupAuth } from "./replitAuth";
import { DatabaseStorage } from "./DatabaseStorage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Set a temporary SESSION_SECRET environment variable if not provided
  // In a production environment, this should be set in the environment
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = "lean-six-sigma-dmaic-temporary-secret";
    console.log("Warning: Using temporary SESSION_SECRET. This should be set in environment variables for production.");
  }

  // Run database migrations
  try {
    // Run Replit Auth database migrations first
    await runMigrations();
    console.log("Database migrations completed successfully");
    
    // Then run legacy migrations
    await migrateRaciRolesToFunction();
    console.log("RACI roles migration completed successfully");
    
    // Setup Replit Auth
    await setupAuth(app);
    console.log("Replit Auth setup completed successfully");
    
  } catch (error) {
    console.error("Migrations or auth setup failed:", error);
    // Continue with server startup even if migration fails
  }
  
  // Create a DatabaseStorage instance for all data operations
  global.dbStorage = new DatabaseStorage();
  
  const server = await registerRoutes(app);
  
  // Register project routes
  registerProjectRoutes(app, global.dbStorage);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
