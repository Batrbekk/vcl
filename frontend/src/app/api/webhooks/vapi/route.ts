import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message) {
      return NextResponse.json({ error: 'No message in body' }, { status: 400 });
    }

    const type = message.type;
    const vapiCallId = message.call?.id;

    if (!vapiCallId) {
      // Some webhook events may not have a call ID, acknowledge them
      return NextResponse.json({ received: true });
    }

    // Find the call in our DB by VAPI call ID
    const call = await prisma.call.findFirst({
      where: { vapiCallId },
    });

    if (!call) {
      console.warn(`Webhook: call not found for vapiCallId=${vapiCallId}`);
      // Return 200 so VAPI doesn't retry
      return NextResponse.json({ received: true, warning: 'Call not found' });
    }

    // ── status-update ──────────────────────────────────────────
    if (type === 'status-update') {
      const status = message.status;

      if (status === 'in-progress') {
        await prisma.call.update({
          where: { id: call.id },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
        });
      } else if (status === 'ended') {
        const endedAt = new Date();
        const duration = call.startedAt
          ? Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000)
          : 0;

        await prisma.call.update({
          where: { id: call.id },
          data: {
            status: 'COMPLETED',
            endedAt,
            duration,
          },
        });
      } else if (status === 'ringing') {
        await prisma.call.update({
          where: { id: call.id },
          data: { status: 'RINGING' },
        });
      }

      return NextResponse.json({ received: true });
    }

    // ── end-of-call-report ─────────────────────────────────────
    if (type === 'end-of-call-report') {
      const updateData: any = {};

      // Summary
      if (message.summary) {
        updateData.summary = message.summary;
      }

      // Recording URL
      if (message.recordingUrl) {
        updateData.recordingUrl = message.recordingUrl;
      }

      // Sentiment from analysis
      if (message.analysis?.sentiment) {
        const sentimentMap: Record<string, string> = {
          positive: 'POSITIVE',
          neutral: 'NEUTRAL',
          negative: 'NEGATIVE',
        };
        const mappedSentiment = sentimentMap[message.analysis.sentiment.toLowerCase()];
        if (mappedSentiment) {
          updateData.sentiment = mappedSentiment;
        }
      }

      // Qualification data from structuredData
      if (message.analysis?.structuredData) {
        const sd = message.analysis.structuredData;
        if (sd.qualBudget !== undefined) updateData.qualBudget = String(sd.qualBudget);
        if (sd.qualNeed !== undefined) updateData.qualNeed = String(sd.qualNeed);
        if (sd.qualTimeline !== undefined) updateData.qualTimeline = String(sd.qualTimeline);
        if (sd.qualScore !== undefined) updateData.qualScore = Number(sd.qualScore) || null;
      }

      // Duration from report (more accurate than our calculation)
      if (message.durationSeconds !== undefined) {
        updateData.duration = Math.round(message.durationSeconds);
      }

      // Ended timestamp
      if (message.endedAt) {
        updateData.endedAt = new Date(message.endedAt);
      }

      // Ensure call is marked as completed
      updateData.status = 'COMPLETED';

      // Update the call record
      if (Object.keys(updateData).length > 0) {
        await prisma.call.update({
          where: { id: call.id },
          data: updateData,
        });
      }

      // Save transcript entries
      if (message.transcript && Array.isArray(message.transcript) && message.transcript.length > 0) {
        // Delete any existing transcripts for this call (in case of duplicate webhook)
        await prisma.transcript.deleteMany({
          where: { callId: call.id },
        });

        const transcriptData = message.transcript
          .filter((t: any) => t.role && t.text)
          .map((t: any) => ({
            role: t.role === 'assistant' ? 'ASSISTANT' as const : 'USER' as const,
            content: t.text,
            timestamp: typeof t.secondsFromStart === 'number' ? t.secondsFromStart : 0,
            callId: call.id,
          }));

        if (transcriptData.length > 0) {
          await prisma.transcript.createMany({
            data: transcriptData,
          });
        }
      }

      // Update lead qualification data + auto-move stage
      const qualScore = updateData.qualScore || message.analysis?.structuredData?.qualScore;
      const callStatus = updateData.status || call.status;

      if (message.analysis?.structuredData) {
        const sd = message.analysis.structuredData;
        const leadUpdate: any = {};
        if (sd.qualBudget !== undefined) leadUpdate.budget = String(sd.qualBudget);
        if (sd.qualNeed !== undefined) leadUpdate.need = String(sd.qualNeed);
        if (sd.qualTimeline !== undefined) leadUpdate.timeline = String(sd.qualTimeline);
        if (sd.qualScore !== undefined) leadUpdate.qualityScore = Number(sd.qualScore) || null;
        leadUpdate.lastContactAt = new Date();

        if (Object.keys(leadUpdate).length > 0) {
          await prisma.lead.update({
            where: { id: call.leadId },
            data: leadUpdate,
          });
        }
      }

      // ── Auto-move lead based on qualification score ──────────
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: call.leadId },
          include: { stage: true, pipeline: { include: { stages: { orderBy: { order: 'asc' } } } } },
        });

        if (lead && lead.pipeline?.stages) {
          const stages = lead.pipeline.stages;
          const score = Number(qualScore) || 0;
          let targetStageName: string | null = null;

          if (callStatus === 'NO_ANSWER') {
            // No answer — keep current stage, increment retry
            // (retryCount already updated on the Call)
          } else if (score >= 80) {
            // Hot lead → "Встреча назначена" or "В работе"
            targetStageName = 'Встреча назначена';
            // Also update lead status
            await prisma.lead.update({
              where: { id: lead.id },
              data: { status: 'IN_PROGRESS' },
            });
          } else if (score >= 50) {
            // Warm lead → "Квалифицирован"
            targetStageName = 'Квалифицирован';
            await prisma.lead.update({
              where: { id: lead.id },
              data: { status: 'QUALIFIED' },
            });
          } else if (score >= 20) {
            // Cold lead → "В работе" (needs more follow-up)
            targetStageName = 'В работе';
          }
          // score < 20 → stay in current stage

          if (targetStageName) {
            const targetStage = stages.find((s) => s.name === targetStageName);
            if (targetStage && targetStage.id !== lead.stageId) {
              // Only move forward (don't move backwards in pipeline)
              const currentOrder = lead.stage?.order ?? 0;
              if (targetStage.order >= currentOrder) {
                await prisma.lead.update({
                  where: { id: lead.id },
                  data: { stageId: targetStage.id },
                });
                console.log(`Auto-moved lead "${lead.name}" → "${targetStageName}" (score: ${score})`);
              }
            }
          }
        }
      } catch (moveErr) {
        console.error('Auto-move lead error:', moveErr);
        // Don't fail the webhook because of auto-move error
      }

      return NextResponse.json({ received: true });
    }

    // ── Unknown event type — acknowledge ───────────────────────
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('VAPI webhook error:', error);
    // Return 200 even on error to prevent VAPI from retrying
    return NextResponse.json(
      { received: true, error: 'Internal processing error' },
      { status: 200 }
    );
  }
}
