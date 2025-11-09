import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultSettings() {
  try {
    // Check if settings already exist
    const existingSettings = await prisma.settings.findFirst();
    
    if (existingSettings) {
      console.log('⏭️  Settings already exist. Skipping...');
      process.exit(0);
    }

    console.log('🚀 Creating default settings...');

    const settings = await prisma.settings.create({
      data: {
        companyName: 'Ace Consult',
        tagline: 'Building Dreams, Creating Futures',
        description: 'Professional architecture, construction and consultancy services',
        contactEmail: 'info@aceconsultltd.com',
        phone: '+1 234 567 8900',
        address: '123 Business Street, City, Country',
        socialLinks: {
          facebook: '',
          twitter: '',
          instagram: '',
          linkedin: '',
          youtube: ''
        },
        heroTitle: 'Transforming Spaces, Building Dreams',
        heroSubtitle: 'Professional architecture, construction and consultancy services',
        seoDefaultTitle: 'Ace Consult - Architecture, Construction & Consultancy',
        seoDefaultDesc: 'Leading architecture, construction and consultancy firm delivering innovative and sustainable design solutions.',
      },
    });

    console.log('✅ Default settings created successfully!');
    console.log(`Company: ${settings.companyName}`);

  } catch (error) {
    console.error('❌ Error creating settings:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultSettings();
