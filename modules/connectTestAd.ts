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
  const ad_id = 1;

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
