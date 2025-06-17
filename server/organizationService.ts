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
  async getOrCreateUserOrganization(userId: string, userType: 'individual' | 'solo_entrepreneur' | 'enterprise_small' | 'enterprise_medium' = 'individual', userData?: any): Promise<Organization> {
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
      // Use company_name if provided, otherwise generate from user data with "Private Individual" extension
      const orgName = userData?.companyName || 
        await this.generateIndividualOrgName(userData?.firstName, userData?.lastName, userData?.email, userId);
      
      orgData = {
        name: orgName,
        type: 'individual',
        maxUsers: 1,
        isActive: true,
        isSystemGenerated: true
      };
    } else if (userType === 'solo_entrepreneur') {
      orgData = {
        name: userData?.companyName || `${userId} Solo Business`,
        type: 'solo_entrepreneur',
        maxUsers: 5,
        isActive: true,
        isSystemGenerated: !userData?.companyName
      };
    } else if (userType === 'enterprise_small') {
      orgData = {
        name: userData?.companyName || `${userId} Small Enterprise`,
        type: 'enterprise_small',
        maxUsers: 50,
        isActive: true,
        isSystemGenerated: !userData?.companyName
      };
    } else {
      orgData = {
        name: userData?.companyName || `${userId} Medium Enterprise`,
        type: 'enterprise_medium',
        maxUsers: 200,
        isActive: true,
        isSystemGenerated: !userData?.companyName
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
   * Generates organization name for individual users using company_name or user data
   */
  private async generateIndividualOrgName(firstName?: string, lastName?: string, email?: string, userId?: string): Promise<string> {
    // Build organization name from user data with "Private Individual" extension
    let orgName = '';
    
    if (firstName && lastName) {
      orgName = `${firstName} ${lastName} Private Individual`;
    } else if (firstName) {
      orgName = `${firstName} Private Individual`;
    } else if (email) {
      const emailPrefix = email.split('@')[0];
      orgName = `${emailPrefix} Private Individual`;
    } else if (userId) {
      orgName = `${userId} Private Individual`;
    } else {
      orgName = `User Organization Private Individual`;
    }

    // Ensure uniqueness
    let finalOrgName = orgName;
    let counter = 1;
    while (true) {
      const [existingOrg] = await db.select().from(organizations).where(eq(organizations.name, finalOrgName));
      if (!existingOrg) {
        break;
      }
      finalOrgName = `${orgName} ${counter}`;
      counter++;
    }

    return finalOrgName;
  }

  /**
   * Generates a unique organization name for individual users (legacy method)
   */
  private async generateUniqueIndividualOrgName(userId: string): Promise<string> {
    return await this.generateIndividualOrgName(undefined, undefined, undefined, userId);
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