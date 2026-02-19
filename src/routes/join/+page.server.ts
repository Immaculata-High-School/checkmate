import { fail, redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import { prisma } from '$lib/server/db';
import bcrypt from 'bcryptjs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const code = url.searchParams.get('code') || '';
  return { code };
};

export const actions: Actions = {
  default: async ({ request, cookies, locals }) => {
    const formData = await request.formData();
    const classCode = formData.get('classCode')?.toString().toUpperCase().trim();
    const isNewUser = formData.get('isNewUser') === 'true';

    if (!classCode) {
      return fail(400, { error: 'Class code is required', step: 'code' });
    }

    // Check if class exists
    const classData = await prisma.class.findUnique({
      where: { joinCode: classCode },
      include: {
        teacher: { select: { name: true } },
        organization: true
      }
    });

    if (!classData) {
      return fail(400, { error: 'Invalid class code. Please check and try again.', step: 'code' });
    }

    // If user is already logged in, join them to the class
    if (locals.user) {
      const existingMembership = await prisma.classMember.findUnique({
        where: {
          classId_userId: {
            classId: classData.id,
            userId: locals.user.id
          }
        }
      });

      if (existingMembership) {
        return fail(400, { error: 'You are already a member of this class.', step: 'code' });
      }

      await prisma.classMember.create({
        data: {
          userId: locals.user.id,
          classId: classData.id,
          role: 'STUDENT'
        }
      });

      // Add to org if class has one
      if (classData.organizationId) {
        const existingOrgMember = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: classData.organizationId,
              userId: locals.user.id
            }
          }
        });

        if (!existingOrgMember) {
          await prisma.organizationMember.create({
            data: {
              userId: locals.user.id,
              organizationId: classData.organizationId,
              role: 'STUDENT'
            }
          });
        }
      }

      throw redirect(302, '/student');
    }

    // For new users or login
    if (isNewUser) {
      const firstName = formData.get('firstName')?.toString().trim();
      const lastName = formData.get('lastName')?.toString().trim();
      const email = formData.get('email')?.toString().toLowerCase().trim();
      const password = formData.get('password')?.toString();
      const birthdateStr = formData.get('birthdate')?.toString();

      if (!firstName || !lastName || !email || !password) {
        return fail(400, { error: 'All fields are required', step: 'register', classCode, className: classData.name });
      }

      if (password.length < 8) {
        return fail(400, { error: 'Password must be at least 8 characters', step: 'register', classCode, className: classData.name });
      }

      if (!birthdateStr) {
        return fail(400, { error: 'Date of birth is required', step: 'register', classCode, className: classData.name });
      }

      const birthdate = new Date(birthdateStr);
      if (isNaN(birthdate.getTime())) {
        return fail(400, { error: 'Invalid date of birth', step: 'register', classCode, className: classData.name });
      }

      const name = `${firstName} ${lastName}`;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return fail(400, { error: 'An account with this email already exists. Please sign in.', step: 'register', classCode, className: classData.name });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          platformRole: 'USER',
          birthdate
        }
      });

      // Add to org
      if (classData.organizationId) {
        await prisma.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: classData.organizationId,
            role: 'STUDENT'
          }
        });
      }

      // Join class
      await prisma.classMember.create({
        data: {
          userId: user.id,
          classId: classData.id,
          role: 'STUDENT'
        }
      });

      // Create session
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });

      throw redirect(302, '/student');
    } else {
      // Login existing user
      const email = formData.get('email')?.toString().toLowerCase().trim();
      const password = formData.get('password')?.toString();

      if (!email || !password) {
        return fail(400, { error: 'Email and password are required', step: 'login', classCode, className: classData.name });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return fail(400, { error: 'Invalid email or password', step: 'login', classCode, className: classData.name });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return fail(400, { error: 'Invalid email or password', step: 'login', classCode, className: classData.name });
      }

      // Check if already in class
      const existingMembership = await prisma.classMember.findUnique({
        where: {
          classId_userId: {
            classId: classData.id,
            userId: user.id
          }
        }
      });

      if (!existingMembership) {
        // Add to org
        if (classData.organizationId) {
          const existingOrgMember = await prisma.organizationMember.findUnique({
            where: {
              organizationId_userId: {
                organizationId: classData.organizationId,
                userId: user.id
              }
            }
          });

          if (!existingOrgMember) {
            await prisma.organizationMember.create({
              data: {
                userId: user.id,
                organizationId: classData.organizationId,
                role: 'STUDENT'
              }
            });
          }
        }

        await prisma.classMember.create({
          data: {
            userId: user.id,
            classId: classData.id,
            role: 'STUDENT'
          }
        });
      }

      // Create session
      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);
      cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });

      throw redirect(302, '/student');
    }
  }
};
