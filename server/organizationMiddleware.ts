import { Request, Response, NextFunction } from 'express';
import { organizationService } from './organizationService';

/**
 * Organization-aware middleware for multi-tenant data isolation
 */

export interface OrganizationRequest extends Request {
  organizationId?: number;
  user?: {
    id: string;
    organizationId?: number;
  };
}

/**
 * Middleware to ensure user has an organization and set it in request context
 */
export async function ensureOrganization(req: OrganizationRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let organizationId = req.user.organizationId;

    // If user doesn't have an organization, create one
    if (!organizationId) {
      const organization = await organizationService.getOrCreateUserOrganization(req.user.id, 'individual');
      organizationId = organization.id;
      
      // Update user object with organization ID
      req.user.organizationId = organizationId;
    }

    // Set organization ID in request for use in route handlers
    req.organizationId = organizationId;
    
    next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Middleware to validate organization access for specific operations
 */
export async function validateOrganizationAccess(req: OrganizationRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!req.organizationId) {
      return res.status(400).json({ message: 'Organization context required' });
    }

    // Verify user belongs to the organization
    const belongsToOrg = await organizationService.userBelongsToOrganization(req.user.id, req.organizationId);
    
    if (!belongsToOrg) {
      return res.status(403).json({ message: 'Access denied to organization' });
    }

    next();
  } catch (error) {
    console.error('Organization access validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Middleware to extract organization ID from route parameters
 */
export function extractOrganizationFromParams(req: OrganizationRequest, res: Response, next: NextFunction) {
  const orgIdParam = req.params.organizationId;
  
  if (orgIdParam) {
    const orgId = parseInt(orgIdParam, 10);
    if (isNaN(orgId)) {
      return res.status(400).json({ message: 'Invalid organization ID' });
    }
    req.organizationId = orgId;
  }
  
  next();
}