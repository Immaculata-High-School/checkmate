import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { dev } from '$app/environment';
import { prisma } from './db';
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
      emailVerified: attributes.emailVerified
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
}

export interface OrgMembership {
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: OrgRole;
}

export async function getUserOrgMemberships(userId: string): Promise<OrgMembership[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId, isActive: true },
    include: { organization: true }
  });

  return memberships.map((m) => ({
    orgId: m.organization.id,
    orgSlug: m.organization.slug,
    orgName: m.organization.name,
    role: m.role
  }));
}

export type EffectiveRole = 'admin' | 'support' | 'teacher' | 'student' | 'guest';

export function getEffectiveRole(platformRole: PlatformRole, orgMemberships: OrgMembership[]): EffectiveRole {
  if (platformRole === 'PLATFORM_ADMIN') return 'admin';
  if (platformRole === 'SUPPORT') return 'support';

  const teacherRoles: OrgRole[] = ['ORG_OWNER', 'ORG_ADMIN', 'DEPARTMENT_HEAD', 'TEACHER'];
  if (orgMemberships.some((m) => teacherRoles.includes(m.role))) {
    return 'teacher';
  }

  return 'student';
}

export type { OrgRole, PlatformRole };
