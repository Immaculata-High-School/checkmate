import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { dev } from '$app/environment';
import { prisma } from './db';
import { cache } from './cache';
import type { PlatformRole, OrgRole } from '@prisma/client';

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: !dev
    }
  },
  getUserAttributes: (attributes) => {
    return {
      id: attributes.id,
      email: attributes.email,
      name: attributes.name,
      avatarUrl: attributes.avatarUrl,
      platformRole: attributes.platformRole,
      suspended: attributes.suspended,
      emailVerified: attributes.emailVerified,
      dashboardPinEnabled: attributes.dashboardPinEnabled
    };
  }
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole;
  suspended: boolean;
  emailVerified: boolean;
  dashboardPinEnabled: boolean;
}

export interface OrgMembership {
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: OrgRole;
}

export async function getUserOrgMemberships(userId: string): Promise<OrgMembership[]> {
  // Cache org memberships for 5 minutes - they rarely change
  const cacheKey = `org_memberships:${userId}`;
  const cached = cache.get<OrgMembership[]>(cacheKey);
  if (cached) return cached;

  const memberships = await prisma.organizationMember.findMany({
    where: { userId, isActive: true },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          slug: true,
          name: true
        }
      }
    }
  });

  const result = memberships.map((m) => ({
    orgId: m.organization.id,
    orgSlug: m.organization.slug,
    orgName: m.organization.name,
    role: m.role
  }));

  cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes
  return result;
}

// Invalidate user's org membership cache when it changes
export function invalidateUserOrgCache(userId: string): void {
  cache.delete(`org_memberships:${userId}`);
}

export type EffectiveRole = 'admin' | 'support' | 'teacher' | 'student' | 'guest';

export function getEffectiveRole(platformRole: PlatformRole, orgMemberships: OrgMembership[]): EffectiveRole {
  if (platformRole === 'PLATFORM_ADMIN') return 'admin';
  if (platformRole === 'SUPPORT') return 'support';

  const teacherRoles: OrgRole[] = ['ORG_OWNER', 'ORG_ADMIN', 'DEPARTMENT_HEAD', 'TEACHER', 'TEACHING_ASSISTANT'];
  if (orgMemberships.some((m) => teacherRoles.includes(m.role))) {
    return 'teacher';
  }

  return 'student';
}

export type { OrgRole, PlatformRole };
