// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  landPlots;
  userCurrentId;
  landPlotCurrentId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.landPlots = /* @__PURE__ */ new Map();
    this.userCurrentId = 1;
    this.landPlotCurrentId = 1;
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.userCurrentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Land plot methods
  async getLandPlot(id) {
    return this.landPlots.get(id);
  }
  async getLandPlotsByUserId(userId) {
    return Array.from(this.landPlots.values()).filter((landPlot) => landPlot.userId === userId);
  }
  async createLandPlot(insertLandPlot) {
    const id = this.landPlotCurrentId++;
    const userId = insertLandPlot.userId === void 0 ? null : insertLandPlot.userId;
    const landPlot = { ...insertLandPlot, id, userId };
    this.landPlots.set(id, landPlot);
    return landPlot;
  }
  async updateLandPlot(id, landPlotUpdate) {
    const existingLandPlot = this.landPlots.get(id);
    if (!existingLandPlot) return void 0;
    const updatedLandPlot = {
      ...existingLandPlot,
      ...landPlotUpdate
    };
    this.landPlots.set(id, updatedLandPlot);
    return updatedLandPlot;
  }
  async deleteLandPlot(id) {
    return this.landPlots.delete(id);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var landPlots = pgTable("land_plots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  measurements: jsonb("measurements").notNull(),
  area: integer("area").notNull(),
  createdAt: text("created_at").notNull()
});
var insertLandPlotSchema = createInsertSchema(landPlots).omit({
  id: true
});
var pointSchema = z.object({
  x: z.number(),
  y: z.number()
});
var lineSchema = z.object({
  id: z.number(),
  startPoint: pointSchema,
  endPoint: pointSchema,
  length: z.number()
});
var measurementsSchema = z.object({
  lines: z.array(lineSchema),
  area: z.number()
});

// server/routes.ts
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
async function registerRoutes(app2) {
  app2.post("/api/land-plots", async (req, res) => {
    try {
      const landPlotData = insertLandPlotSchema.parse(req.body);
      const measurements = measurementsSchema.parse(landPlotData.measurements);
      const savedLandPlot = await storage.createLandPlot(landPlotData);
      res.status(201).json(savedLandPlot);
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to save land plot" });
      }
    }
  });
  app2.get("/api/land-plots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const landPlot = await storage.getLandPlot(id);
      if (!landPlot) {
        return res.status(404).json({ message: "Land plot not found" });
      }
      res.json(landPlot);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve land plot" });
    }
  });
  app2.patch("/api/land-plots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const updateData = req.body;
      if (updateData.measurements) {
        measurementsSchema.parse(updateData.measurements);
      }
      const updatedLandPlot = await storage.updateLandPlot(id, updateData);
      if (!updatedLandPlot) {
        return res.status(404).json({ message: "Land plot not found" });
      }
      res.json(updatedLandPlot);
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to update land plot" });
      }
    }
  });
  app2.delete("/api/land-plots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const deleted = await storage.deleteLandPlot(id);
      if (!deleted) {
        return res.status(404).json({ message: "Land plot not found" });
      }
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete land plot" });
    }
  });
  app2.get("/api/land-plots", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId) : void 0;
      let landPlots2 = [];
      if (userId && !isNaN(userId)) {
        landPlots2 = await storage.getLandPlotsByUserId(userId);
      } else {
        landPlots2 = [];
      }
      res.json(landPlots2);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve land plots" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
