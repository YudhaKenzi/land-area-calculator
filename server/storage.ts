import { 
  users, type User, type InsertUser,
  landPlots, type LandPlot, type InsertLandPlot,
  type Measurements
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Land plot methods
  getLandPlot(id: number): Promise<LandPlot | undefined>;
  getLandPlotsByUserId(userId: number): Promise<LandPlot[]>;
  createLandPlot(landPlot: InsertLandPlot): Promise<LandPlot>;
  updateLandPlot(id: number, landPlot: Partial<InsertLandPlot>): Promise<LandPlot | undefined>;
  deleteLandPlot(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private landPlots: Map<number, LandPlot>;
  userCurrentId: number;
  landPlotCurrentId: number;

  constructor() {
    this.users = new Map();
    this.landPlots = new Map();
    this.userCurrentId = 1;
    this.landPlotCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Land plot methods
  async getLandPlot(id: number): Promise<LandPlot | undefined> {
    return this.landPlots.get(id);
  }
  
  async getLandPlotsByUserId(userId: number): Promise<LandPlot[]> {
    return Array.from(this.landPlots.values())
      .filter(landPlot => landPlot.userId === userId);
  }
  
  async createLandPlot(insertLandPlot: InsertLandPlot): Promise<LandPlot> {
    const id = this.landPlotCurrentId++;
    // Ensure userId is null if it's undefined
    const userId = insertLandPlot.userId === undefined ? null : insertLandPlot.userId;
    const landPlot: LandPlot = { ...insertLandPlot, id, userId };
    this.landPlots.set(id, landPlot);
    return landPlot;
  }
  
  async updateLandPlot(id: number, landPlotUpdate: Partial<InsertLandPlot>): Promise<LandPlot | undefined> {
    const existingLandPlot = this.landPlots.get(id);
    if (!existingLandPlot) return undefined;
    
    const updatedLandPlot: LandPlot = {
      ...existingLandPlot,
      ...landPlotUpdate
    };
    
    this.landPlots.set(id, updatedLandPlot);
    return updatedLandPlot;
  }
  
  async deleteLandPlot(id: number): Promise<boolean> {
    return this.landPlots.delete(id);
  }
}

export const storage = new MemStorage();
