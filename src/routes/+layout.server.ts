import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user,
    effectiveRole: locals.effectiveRole,
    orgMemberships: locals.orgMemberships,
    isImpersonating: locals.isImpersonating,
    isOrgAdminImpersonating: locals.isOrgAdminImpersonating,
    orgAdminReturnSlug: locals.orgAdminReturnSlug
  };
};
