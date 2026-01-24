import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const newConfig = {
    monday: 'none',
    tuesday: 'research',
    wednesday: 'none',
    thursday: 'training',
    friday: 'building',
    saturday: 'none',
    sunday: 'none'
  };

  const dates = ['2026-01-26', '2026-01-03'];

  for (const date of dates) {
    const result = await prisma.event.update({
      where: { eventDate: date },
      data: {
        dayConfig: JSON.stringify(newConfig)
      }
    });
    console.log(`✓ 已更新 ${date}`);
  }

  console.log('\n配置內容:');
  console.log('  週二 → 研究科技');
  console.log('  週四 → 士兵訓練');
  console.log('  週五 → 建築訓練');

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ 錯誤:', e);
    process.exit(1);
  });
