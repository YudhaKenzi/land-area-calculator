import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLandPlotSchema, measurementsSchema, type LandPlot } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Save land plot
  app.post("/api/land-plots", async (req, res) => {
    try {
      const landPlotData = insertLandPlotSchema.parse(req.body);
      
      // Validate measurements structure
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

  // Get land plot by id
  app.get("/api/land-plots/:id", async (req, res) => {
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

  // Update land plot
  app.patch("/api/land-plots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Partial validation of the update data
      const updateData = req.body;
      
      // If measurements are included, validate them
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

  // Delete land plot
  app.delete("/api/land-plots/:id", async (req, res) => {
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

  // Get all land plots (for simplicity without user auth)
  app.get("/api/land-plots", async (req, res) => {
    try {
      // In production, we would filter by authenticated user
      // For now, return all land plots for a userId (hardcoded for simplicity)
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      let landPlots: LandPlot[] = [];
      if (userId && !isNaN(userId)) {
        landPlots = await storage.getLandPlotsByUserId(userId);
      } else {
        // Return empty array for now
        landPlots = [];
      }
      
      res.json(landPlots);
    } catch (err) {
      res.status(500).json({ message: "Failed to retrieve land plots" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
