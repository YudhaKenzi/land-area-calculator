import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// LandPlot schema for storing measurement data
export const landPlots = pgTable("land_plots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  measurements: jsonb("measurements").notNull(),
  area: integer("area").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertLandPlotSchema = createInsertSchema(landPlots).omit({
  id: true,
});

export const pointSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const lineSchema = z.object({
  id: z.number(),
  startPoint: pointSchema,
  endPoint: pointSchema,
  length: z.number()
});

export const measurementsSchema = z.object({
  lines: z.array(lineSchema),
  area: z.number()
});

export type InsertLandPlot = z.infer<typeof insertLandPlotSchema>;
export type LandPlot = typeof landPlots.$inferSelect;
export type Point = z.infer<typeof pointSchema>;
export type Line = z.infer<typeof lineSchema>;
export type Measurements = z.infer<typeof measurementsSchema>;
