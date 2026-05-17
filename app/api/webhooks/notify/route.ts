import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const record = body.record;

    if (!process.env.SLACK_WEBHOOK_URL) {
      console.error("SLACK_WEBHOOK_URL not configured");
      return NextResponse.json(
        { error: "Slack webhook not configured" },
        { status: 500 }
      );
    }

    const slackMessage = {
      text: `New feedback from ${record.name || "Anonymous"}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🔔 New Feedback",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*From:*\n${record.name || "Anonymous"}`,
            },
            {
              type: "mrkdwn",
              text: `*Rating:*\n${record.rating ? record.rating + " ⭐" : "N/A"}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n> ${record.message}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_Submitted: ${new Date(record.timestamp).toLocaleString()}_`,
            },
          ],
        },
      ],
    };

    const slackRes = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });

    if (!slackRes.ok) {
      throw new Error(`Slack API error: ${slackRes.statusText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[webhooks/notify]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notification" },
      { status: 500 }
    );
  }
}
