import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    where: {
      eventDate: {
        in: ['2026-01-26', '2026-01-03']
      }
    },
    select: {
      eventDate: true,
      dayConfig: true
    }
  });

  console.log('=== 場次配置資料 ===\n');
  events.forEach(event => {
    console.log(`日期: ${event.eventDate}`);
    console.log(`dayConfig: ${event.dayConfig}`);
    
    try {
      const config = typeof event.dayConfig === 'string' 
        ? JSON.parse(event.dayConfig)
        : event.dayConfig;
      console.log('解析後:', JSON.stringify(config, null, 2));
    } catch (e) {
      console.log('解析失敗:', e.message);
    }
    console.log('---');
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('錯誤:', e);
  process.exit(1);
});
