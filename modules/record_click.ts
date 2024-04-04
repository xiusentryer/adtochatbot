import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  if (request.method !== "POST") {
    return {
      status: 405,
      body: "Method Not Allowed",
    };
  }

  const requestBody = await request.json();
  const ad_id = requestBody.ad_id;
  const chatbot_id = requestBody.chatbot_id;
  const user_id = requestBody.user_id;

  if (!ad_id || !user_id || !chatbot_id) {
    return {
      status: 400,
      body: "Bad Request: Missing ad_id or user_id or chatbot_id",
    };
  }

  // Supabase API Key
  const supabaseKey = environment.SUPABASE_API_KEY;

  // Check if the chatbot_ads relationship exists
  const adExistenceUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?ad_id=eq.${ad_id}&chatbot_id=eq.${chatbot_id}&select=ad_id`;
  try {
    let adResponse = await fetch(adExistenceUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!adResponse.ok) {
      throw new Error(`Failed to verify campaign's existence: ${adResponse.statusText}`);
    }

    const adData = await adResponse.json();
    if (adData.length === 0) {
      return {
        status: 404,
        body: "Error: Advertisement does not exist.",
      };
    }

    // Advertisement exists, proceed to record the click
    const clicksUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/clicks`;
    const clickResponse = await fetch(clicksUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        ad_id: ad_id,
        chatbot_id: chatbot_id,
        user_id: user_id,
        ad_id_user_id: ad_id+user_id,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!clickResponse.ok) {
      const errorMessage = await clickResponse.text();
      throw new Error(`Failed to record click: ${errorMessage}`);
    }

    const clickRecord = await clickResponse.json();

    // Fetch the current clicks and revenue for the corresponding chatbot_ad entry
    let response = await fetch(`https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?select=clicks,revenue&chatbot_id=eq.${chatbot_id}&ad_id=eq.${ad_id}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    let chatbotAds = await response.json();
    if (chatbotAds.length === 0) throw new Error("chatbot_ad entry not found");
    const currentClicks = chatbotAds[0].clicks;
    const currentRevenue = chatbotAds[0].revenue;

    // Increment the impressions and update the entry
    const newClicks = currentClicks + 1;
    const newRevenue = currentRevenue + 0.5;

    const updateImpressionsUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?chatbot_id=eq.${chatbot_id}&ad_id=eq.${ad_id}`;
    response = await fetch(updateImpressionsUrl, {
      method: 'PATCH', // Use PATCH for partial updates
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        clicks: newClicks,
        revenue: newRevenue,
      }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Failed to increment impressions: ${errorMessage}`);
    }

    context.log.info("Impressions incremented successfully");

    return {
      status: 200,
      body: {
        message: "Click recorded successfully",
        click: clickRecord,
      },
    };
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return {
      status: 500,
      body: `Server Error: ${error.message}`,
    };
  }
}
