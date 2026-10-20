import argon2 from 'argon2';
import { assertDevSeedAllowed, createPrisma } from './helpers/db.mjs';
import { loadServiceEnv, requireEnv } from './helpers/env.mjs';

loadServiceEnv('sams-api');
assertDevSeedAllowed();
process.env.ACCEPTANCE_DATABASE_URL = requireEnv('MIGRATION_DATABASE_URL');

const password = requireEnv('DEV_SEED_PASSWORD');
if (password.length < 8) {
  throw new Error('DEV_SEED_PASSWORD must be at least 8 characters.');
}

const prisma = await createPrisma();

const roles = [
  ['student', 'Student'],
  ['teacher', 'Teacher'],
  ['registrar', 'Registrar'],
  ['finance', 'Finance'],
  ['hr', 'HR'],
  ['admin', 'Admin'],
  ['leadership', 'Leadership']
];

const users = [
  ['admin.alpha@example.test', 'Admin Alpha', [['School Alpha', ['admin']]]],
  ['registrar.alpha@example.test', 'Registrar Alpha', [['School Alpha', ['registrar']]]],
  ['teacher.alpha@example.test', 'Teacher Alpha', [['School Alpha', ['teacher']]]],
  ['student.alpha@example.test', 'Student Alpha', [['School Alpha', ['student']]]],
  ['finance.alpha@example.test', 'Finance Alpha', [['School Alpha', ['finance']]]],
  ['registrar.beta@example.test', 'Registrar Beta', [['School Beta', ['registrar']]]],
  [
    'multi.school@example.test',
    'Multi School User',
    [
      ['School Alpha', ['registrar']],
      ['School Beta', ['finance']]
    ]
  ]
];

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function schoolByName(name) {
  const existing = await prisma.school.findFirst({ where: { name } });
  if (existing) {
    return prisma.school.update({ where: { id: existing.id }, data: { status: 'active' } });
  }
  return prisma.school.create({ data: { name, status: 'active' } });
}

try {
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1
  });

  const roleByKey = new Map();
  for (const [key, name] of roles) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name },
      create: { key, name }
    });
    roleByKey.set(key, role);
  }

  const schoolByLabel = new Map();
  for (const name of ['School Alpha', 'School Beta']) {
    schoolByLabel.set(name, await schoolByName(name));
  }

  for (const [email, displayName, memberships] of users) {
    const user = await prisma.user.upsert({
      where: { emailNormalized: normalizeEmail(email) },
      update: { email, displayName, status: 'active', profileVersion: { increment: 1 } },
      create: {
        email,
        emailNormalized: normalizeEmail(email),
        displayName,
        status: 'active'
      }
    });

    await prisma.userCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash, disabledAt: null },
      create: { userId: user.id, passwordHash }
    });

    for (const [schoolName, roleKeys] of memberships) {
      const school = schoolByLabel.get(schoolName);
      const membership = await prisma.membership.upsert({
        where: { userId_schoolId: { userId: user.id, schoolId: school.id } },
        update: { status: 'active' },
        create: { userId: user.id, schoolId: school.id, status: 'active' }
      });

      await prisma.membershipRole.createMany({
        data: roleKeys.map((roleKey) => ({
          membershipId: membership.id,
          roleId: roleByKey.get(roleKey).id
        })),
        skipDuplicates: true
      });
    }
  }

  console.log('PASS dev seed');
  console.log('Seeded schools: School Alpha, School Beta');
  console.log(`Seeded users: ${users.map(([email]) => email).join(', ')}`);
} finally {
  await prisma.$disconnect();
}
