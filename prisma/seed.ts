import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create default system config
  await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      aiModel: 'anthropic/claude-opus-4-1-20250805',
      features: {
        aiTestGeneration: true,
        aiGrading: true,
        aiStudyGuides: true,
        aiWorksheets: true
      }
    }
  });

  // Create root admin user
  const hashedPassword = await bcrypt.hash('changeme123', 10);

  const rootAdmin = await prisma.user.upsert({
    where: { email: 'ethan@hackclub.com' },
    update: {
      platformRole: 'PLATFORM_ADMIN'
    },
    create: {
      email: 'ethan@hackclub.com',
      name: 'Ethan',
      password: hashedPassword,
      platformRole: 'PLATFORM_ADMIN',
      emailVerified: true
    }
  });

  console.log('Root admin created:', rootAdmin.email);
  console.log('Default password: changeme123');
  console.log('System config initialized');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
