import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import {
  organizationData,
  pipelineData,
  usersData,
  leadsData,
  callsData,
  messagesData,
} from '@/data/seed';

export async function POST() {
  try {
    // ── 1. Clean existing data (order matters for FK constraints) ──
    await prisma.transcript.deleteMany();
    await prisma.message.deleteMany();
    await prisma.call.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.pipelineStage.deleteMany();
    await prisma.pipeline.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    // ── 2. Create organization ────────────────────────────────
    const organization = await prisma.organization.create({
      data: {
        name: organizationData.name,
        slug: organizationData.slug,
        industry: organizationData.industry,
        phone: organizationData.phone,
        vapiAssistantId: organizationData.vapiAssistantId,
        botName: organizationData.botConfig.name,
        botVoice: organizationData.botConfig.voice,
        botPrompt: organizationData.botConfig.prompt,
        botGreeting: organizationData.botConfig.greeting,
        botMaxRetries: organizationData.botConfig.maxRetries,
        botRetryInterval: organizationData.botConfig.retryInterval,
        plan: organizationData.subscription.plan.toUpperCase() as 'PREMIUM',
        planStatus: organizationData.subscription.status.toUpperCase() as 'ACTIVE',
        minutesUsed: organizationData.subscription.minutesUsed,
        minutesLimit: organizationData.subscription.minutesLimit,
      },
    });

    // ── 3. Create users ───────────────────────────────────────
    const hashedPassword = await bcrypt.hash('demo123', 12);

    const users = await Promise.all(
      usersData.map((u) =>
        prisma.user.create({
          data: {
            email: u.email,
            name: u.name,
            password: hashedPassword,
            role: u.role.toUpperCase() as 'OWNER' | 'ADMIN' | 'MANAGER',
            organizationId: organization.id,
          },
        })
      )
    );

    // ── 4. Create pipeline + stages ─────────────────────────
    const pipeline = await prisma.pipeline.create({
      data: {
        name: pipelineData.name,
        organizationId: organization.id,
      },
    });

    const stages = await Promise.all(
      pipelineData.stages.map((stage) =>
        prisma.pipelineStage.create({
          data: {
            name: stage.name,
            color: stage.color,
            order: stage.order,
            pipelineId: pipeline.id,
          },
        })
      )
    );

    // Map stage IDs: seed stageId -> DB stageId
    const stageMap: Record<string, string> = {};
    pipelineData.stages.forEach((s, i) => {
      stageMap[s.id] = stages[i].id;
    });

    // ── 5. Create leads ───────────────────────────────────────
    const leads = await Promise.all(
      leadsData.map((lead) => {
        const { assignedToIndex, stageId, ...rest } = lead;
        return prisma.lead.create({
          data: {
            name: rest.name,
            phone: rest.phone,
            email: rest.email || null,
            source: rest.source.toUpperCase() as any,
            status: rest.status.toUpperCase() as any,
            tags: rest.tags,
            notes: rest.notes,
            lastContactAt: rest.lastContactAt,
            createdAt: rest.createdAt,
            organizationId: organization.id,
            pipelineId: pipeline.id,
            stageId: stageMap[stageId],
            assignedToId: assignedToIndex !== null ? users[assignedToIndex].id : null,
          },
        });
      })
    );

    // ── 6. Create calls + transcripts ─────────────────────────
    const calls = await Promise.all(
      callsData.map(async (call) => {
        const { leadIndex, transcript, ...rest } = call;
        const createdCall = await prisma.call.create({
          data: {
            direction: rest.direction.toUpperCase() as any,
            status: rest.status.toUpperCase() as any,
            duration: rest.duration,
            summary: rest.summary,
            sentiment: rest.sentiment.toUpperCase() as any,
            qualBudget: rest.qualification.budget || null,
            qualNeed: rest.qualification.need || null,
            qualTimeline: rest.qualification.timeline || null,
            qualScore: rest.qualification.score || null,
            retryCount: rest.retryCount,
            startedAt: rest.startedAt,
            endedAt: rest.endedAt,
            organizationId: organization.id,
            leadId: leads[leadIndex].id,
          },
        });

        // Create transcript entries
        if (transcript.length > 0) {
          await prisma.transcript.createMany({
            data: transcript.map((t) => ({
              role: t.role.toUpperCase() as 'ASSISTANT' | 'USER',
              content: t.content,
              timestamp: t.timestamp,
              callId: createdCall.id,
            })),
          });
        }

        return createdCall;
      })
    );

    // ── 7. Create messages ────────────────────────────────────
    await Promise.all(
      messagesData.map((msg) => {
        const { leadIndex, ...rest } = msg;
        return prisma.message.create({
          data: {
            channel: rest.channel.toUpperCase() as any,
            direction: rest.direction.toUpperCase() as any,
            content: rest.content,
            externalId: rest.externalId,
            status: rest.status.toUpperCase() as any,
            createdAt: rest.createdAt,
            organizationId: organization.id,
            leadId: leads[leadIndex].id,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Seed data created successfully',
      data: {
        organization: organization.name,
        users: users.length,
        pipeline: pipeline.name,
        stages: stages.length,
        leads: leads.length,
        calls: calls.length,
        messages: messagesData.length,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
