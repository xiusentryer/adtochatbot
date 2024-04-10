import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  if (request.method !== "POST") {
    return {
      status: 405,
      body: "Method Not Allowed",
    };
  }

  const requestBody = await request.json();
  const chatbotapiKey = requestBody.chatbotapiKey;
  const ad_id = 1; // This seems to be statically set to 1, consider making this dynamic if necessary

  if (!chatbotapiKey) {
    return {
      status: 400,
      body: "Bad Request: Missing chatbotapiKey",
    };
  }
  context.log.info(chatbotapiKey);
  const supabaseKey = environment.SUPABASE_API_KEY;
  const baseUrl = "https://app.adtochatbot.com";

  try {
    // Find the chatbot_id using the apiKey
    const chatbotUrl = `https://app.adtochatbot.com/rest/v1/chatbot?select=id&apiKey=eq.${chatbotapiKey}`;
    const chatbotResponse = await fetch(chatbotUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!chatbotResponse.ok) throw new Error(`Failed to fetch chatbot: ${chatbotResponse.statusText}`);

    const chatbots = await chatbotResponse.json();
    if (chatbots.length === 0) throw new Error("No chatbot found with the given apiKey");

    const chatbotID = chatbots[0].id;

    // Check if a record already exists with the given ad_id and chatbot_id
    const existingRecordUrl = `${baseUrl}/rest/v1/chatbot_ads?select=id&ad_id=eq.${ad_id}&chatbot_id=eq.${chatbotID}`;
    const existingRecordResponse = await fetch(existingRecordUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!existingRecordResponse.ok) throw new Error(`Failed to fetch existing records: ${existingRecordResponse.statusText}`);

    const existingRecords = await existingRecordResponse.json();
    if (existingRecords.length > 0) {
      // Record already exists, so we don't create a new one
      return {
        status: 409, // HTTP 409 Conflict
        body: { message: "Record already exists" },
      };
    }

    const updateImpressionsResponse = await fetch(`${baseUrl}/rest/v1/chatbot_ads`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ ad_id: ad_id, chatbot_id: chatbotID }),
    });

    if (!updateImpressionsResponse.ok) {
      throw new Error(`Failed to update impressions, status: ${updateImpressionsResponse.status}`);
    }

    context.log.info("Impression updated successfully");
    return {
      status: 200,
      body: { message: "Added successfully" },
    };
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return {
      status: 500,
      body: `Server Error: ${error.message}`,
    };
  }
}
