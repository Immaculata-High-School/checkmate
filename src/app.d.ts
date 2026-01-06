import type { Session, User } from 'lucia';
import type { OrgMembership, EffectiveRole } from '$lib/server/auth';

declare global {
  namespace App {
    interface Locals {
      user: User | null;
      session: Session | null;
      orgMemberships: OrgMembership[];
      effectiveRole: EffectiveRole;
      isImpersonating: boolean;
    }

    interface PageData {
      user: User | null;
      effectiveRole: EffectiveRole;
      orgMemberships: OrgMembership[];
      isImpersonating: boolean;
    }
  }
}

export {};
