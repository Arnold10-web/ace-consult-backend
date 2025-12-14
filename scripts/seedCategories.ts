import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Residential', slug: 'residential' },
  { name: 'Commercial', slug: 'commercial' },
  { name: 'Cultural', slug: 'cultural' },
  { name: 'Educational', slug: 'educational' },
  { name: 'Healthcare', slug: 'healthcare' },
  { name: 'Hospitality', slug: 'hospitality' },
  { name: 'Industrial', slug: 'industrial' },
  { name: 'Infrastructure', slug: 'infrastructure' },
  { name: 'Mixed-Use', slug: 'mixed-use' },
  { name: 'Public Spaces', slug: 'public-spaces' },
  { name: 'Religious', slug: 'religious' },
  { name: 'Retail', slug: 'retail' },
  { name: 'Sports & Recreation', slug: 'sports-recreation' },
  { name: 'Urban Planning', slug: 'urban-planning' },
];

async function seedCategories() {
  try {
    console.log('🌱 Seeding categories...\n');

    for (const category of categories) {
      const existing = await prisma.category.findUnique({
        where: { slug: category.slug },
      });

      if (!existing) {
        await prisma.category.create({
          data: category,
        });
        console.log(`✅ Created category: ${category.name}`);
      } else {
        console.log(`⏭️  Category already exists: ${category.name}`);
      }
    }

    console.log('\n🎉 Categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
