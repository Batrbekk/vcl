-- CreateEnum
CREATE TYPE "LeadChannel" AS ENUM ('PHONE', 'WHATSAPP', 'INSTAGRAM');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "assignedBotId" TEXT,
ADD COLUMN     "channel" "LeadChannel" NOT NULL DEFAULT 'PHONE';

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedBotId_fkey" FOREIGN KEY ("assignedBotId") REFERENCES "BotConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
