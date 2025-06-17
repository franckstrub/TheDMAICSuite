import { db } from "./db";
import { organizations, users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Type definitions for organizations
type Organization = typeof organizations.$inferSelect;
type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Organization Service
 * 
 * Handles multi-tenant organization management including:
 * - Automatic organization creation for individual users
 * - Organization type validation and assignment
 * - User-organization relationship management
 */

export class OrganizationService {
  /**
   * Gets or creates an organization for a user based on their type
   */
  async getOrCreateUserOrganization(userId: string, userType: 'individual' | 'solo_entrepreneur' | 'enterprise_small' | 'enterprise_medium' = 'individual'): Promise<Organization> {
    // First check if user already has an organization
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (user && user.organizationId) {
      const [existingOrg] = await db.select().from(organizations).where(eq(organizations.id, user.organizationId));
      if (existingOrg) {
        return existingOrg;
      }
    }

    // Create organization based on user type
    let orgData: InsertOrganization;
    
    if (userType === 'individual') {
      // Generate a unique organization name for individual users
      const orgName = await this.generateUniqueIndividualOrgName(userId);
      orgData = {
        name: orgName,
        type: 'individual',
        description: 'Auto-generated organization for individual user',
        maxUsers: 1,
        isActive: true
      };
    } else if (userType === 'solo_entrepreneur') {
      orgData = {
        name: `${userId}-solo-business`,
        type: 'solo_entrepreneur',
        description: 'Solo entrepreneur organization',
        maxUsers: 5,
        isActive: true
      };
    } else if (userType === 'enterprise_small') {
      orgData = {
        name: `${userId}-small-enterprise`,
        type: 'enterprise_small',
        description: 'Small enterprise organization',
        maxUsers: 50,
        isActive: true
      };
    } else {
      orgData = {
        name: `${userId}-medium-enterprise`,
        type: 'enterprise_medium',
        description: 'Medium enterprise organization',
        maxUsers: 200,
        isActive: true
      };
    }

    // Create the organization
    const [newOrg] = await db.insert(organizations).values(orgData).returning();
    
    // Update user with organization ID
    if (user) {
      await db.update(users)
        .set({ organizationId: newOrg.id })
        .where(eq(users.id, userId));
    }

    return newOrg;
  }

  /**
   * Generates a unique organization name for individual users
   */
  private async generateUniqueIndividualOrgName(userId: string): Promise<string> {
    const baseNames = [
      `${userId}-workspace`,
      `${userId}-projects`,
      `${userId}-personal-org`,
      `user-${userId}-org`,
      `individual-${userId}`
    ];

    for (const baseName of baseNames) {
      const existing = await db.select().from(organizations).where(eq(organizations.name, baseName));
      if (existing.length === 0) {
        return baseName;
      }
    }

    // Fallback with timestamp
    return `${userId}-org-${Date.now()}`;
  }

  /**
   * Gets organization by ID with user validation
   */
  async getOrganization(orgId: number, userId?: string): Promise<Organization | null> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    
    if (!org) return null;

    // If userId is provided, verify user belongs to this organization
    if (userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || user.organizationId !== orgId) {
        return null;
      }
    }

    return org;
  }

  /**
   * Checks if a user belongs to an organization
   */
  async userBelongsToOrganization(userId: string, orgId: number): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.organizationId === orgId;
  }

  /**
   * Gets organization ID for a user
   */
  async getUserOrganizationId(userId: string): Promise<number | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.organizationId || null;
  }

  /**
   * Updates organization settings
   */
  async updateOrganization(orgId: number, updates: Partial<InsertOrganization>, userId?: string): Promise<Organization | null> {
    // Verify user belongs to organization if userId provided
    if (userId && !(await this.userBelongsToOrganization(userId, orgId))) {
      return null;
    }

    const [updatedOrg] = await db.update(organizations)
      .set(updates)
      .where(eq(organizations.id, orgId))
      .returning();

    return updatedOrg || null;
  }

  /**
   * Deactivates an organization (soft delete)
   */
  async deactivateOrganization(orgId: number, userId?: string): Promise<boolean> {
    if (userId && !(await this.userBelongsToOrganization(userId, orgId))) {
      return false;
    }

    const result = await db.update(organizations)
      .set({ isActive: false })
      .where(eq(organizations.id, orgId));

    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const organizationService = new OrganizationService();