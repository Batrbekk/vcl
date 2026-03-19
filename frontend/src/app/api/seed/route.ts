import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connection';
import {
  Organization,
  User,
  Pipeline,
  Lead,
  Call,
  Message,
} from '@/lib/db/models';
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
    await connectDB();

    // ── 1. Drop existing collections ──────────────────────────
    const collections = [
      Organization,
      User,
      Pipeline,
      Lead,
      Call,
      Message,
    ];

    for (const model of collections) {
      try {
        await model.collection.drop();
      } catch {
        // Collection may not exist yet — that is fine
      }
    }

    // ── 2. Create organization ────────────────────────────────
    const organization = await Organization.create(organizationData);

    // ── 3. Create users ───────────────────────────────────────
    const hashedPassword = await bcrypt.hash('demo123', 12);

    const users = await User.insertMany(
      usersData.map((u) => ({
        ...u,
        password: hashedPassword,
        organizationId: organization._id,
      }))
    );

    // ── 4. Create pipeline ────────────────────────────────────
    const pipeline = await Pipeline.create({
      ...pipelineData,
      organizationId: organization._id,
    });

    // ── 5. Create leads ───────────────────────────────────────
    const leads = await Lead.insertMany(
      leadsData.map((lead) => {
        const { assignedToIndex, ...rest } = lead;
        return {
          ...rest,
          organizationId: organization._id,
          pipelineId: pipeline._id,
          assignedTo:
            assignedToIndex !== null ? users[assignedToIndex]._id : undefined,
        };
      })
    );

    // ── 6. Create calls ───────────────────────────────────────
    await Call.insertMany(
      callsData.map((call) => {
        const { leadIndex, ...rest } = call;
        return {
          ...rest,
          organizationId: organization._id,
          leadId: leads[leadIndex]._id,
        };
      })
    );

    // ── 7. Create messages ────────────────────────────────────
    await Message.insertMany(
      messagesData.map((msg) => {
        const { leadIndex, ...rest } = msg;
        return {
          ...rest,
          organizationId: organization._id,
          leadId: leads[leadIndex]._id,
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Seed data created',
      data: {
        organization: organization.name,
        users: users.length,
        pipeline: pipeline.name,
        stages: pipeline.stages.length,
        leads: leads.length,
        calls: callsData.length,
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
