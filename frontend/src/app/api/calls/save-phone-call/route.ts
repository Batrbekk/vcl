import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST — save a phone call from the telephony pipeline (no auth required — internal)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { direction, duration, transcript, analysis, leadId, recordingUrl } = body;

    // Find the first organization (for now, single-tenant)
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Find or create a lead for this call
    let callLeadId = leadId;
    if (!callLeadId) {
      // Find first pipeline and stage
      const pipeline = await prisma.pipeline.findFirst({
        where: { organizationId: org.id },
        include: { stages: { orderBy: { order: 'asc' } } },
      });

      if (pipeline && pipeline.stages.length > 0) {
        // Create a new lead from call data
        const clientName = analysis?.clientName || 'Неизвестный клиент';
        const lead = await prisma.lead.create({
          data: {
            name: clientName,
            phone: 'Телефонный звонок',
            source: 'PHONE',
            status: 'NEW',
            organizationId: org.id,
            pipelineId: pipeline.id,
            stageId: pipeline.stages[0].id,
            budget: analysis?.budget ? String(analysis.budget) : null,
            need: analysis?.interest || null,
            timeline: analysis?.timeline || null,
            qualityScore: analysis?.qualificationScore || null,
            notes: analysis?.summary || null,
            lastContactAt: new Date(),
          },
        });
        callLeadId = lead.id;

        // Auto-move lead based on qualification score
        if (analysis?.qualificationScore) {
          const score = Number(analysis.qualificationScore);
          let targetStageName: string | null = null;

          if (score >= 80) targetStageName = 'Встреча назначена';
          else if (score >= 50) targetStageName = 'Квалифицирован';
          else if (score >= 20) targetStageName = 'В работе';

          if (targetStageName) {
            const targetStage = pipeline.stages.find((s) => s.name === targetStageName);
            if (targetStage) {
              await prisma.lead.update({
                where: { id: lead.id },
                data: {
                  stageId: targetStage.id,
                  status: score >= 50 ? 'QUALIFIED' : 'NEW',
                },
              });
            }
          }
        }
      }
    }

    if (!callLeadId) {
      return NextResponse.json({ error: 'Could not create lead' }, { status: 400 });
    }

    // Create call record
    const call = await prisma.call.create({
      data: {
        direction: direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND',
        status: 'COMPLETED',
        duration: duration || 0,
        recordingUrl: recordingUrl || null,
        summary: analysis?.summary || null,
        sentiment: analysis?.sentiment === 'POSITIVE' ? 'POSITIVE' :
                   analysis?.sentiment === 'NEGATIVE' ? 'NEGATIVE' : 'NEUTRAL',
        qualBudget: analysis?.budget ? String(analysis.budget) : null,
        qualNeed: analysis?.interest || null,
        qualTimeline: analysis?.timeline || null,
        qualScore: analysis?.qualificationScore ? Number(analysis.qualificationScore) : null,
        startedAt: new Date(Date.now() - (duration || 0) * 1000),
        endedAt: new Date(),
        organizationId: org.id,
        leadId: callLeadId,
      },
    });

    // Save transcript entries
    if (transcript && Array.isArray(transcript) && transcript.length > 0) {
      await prisma.transcript.createMany({
        data: transcript.map((t: any, i: number) => ({
          role: t.role === 'assistant' ? 'ASSISTANT' as const : 'USER' as const,
          content: t.content,
          timestamp: i * 10, // approximate
          callId: call.id,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      callId: call.id,
      leadId: callLeadId,
    });
  } catch (error) {
    console.error('Save phone call error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save call' },
      { status: 500 }
    );
  }
}
