import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  if (request.method !== "GET") {
    return {
      status: 405,
      body: "Method Not Allowed",
    };
  }

  const chatbotApiKey = request.query["c"];
  const uniqueAdId = request.query["a"];

  if (!chatbotApiKey || !uniqueAdId) {
    return {
      status: 400,
      body: "Missing required parameters",
    };
  }

  const supabaseKey = environment.SERVICE_ROLE_KEY;
  const zuploKey = environment.ZUPLOKEY;

  const chatbotLookupUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot?select=id&apiKey=eq.${chatbotApiKey}`;
  let chatbotResponse = await fetch(chatbotLookupUrl, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!chatbotResponse.ok) {
    context.log.error("Failed to find chatbot with the given apiKey");
    return { status: 404, body: "Chatbot not found." };
  }

  let chatbot = await chatbotResponse.json();
  if (chatbot.length === 0) {
    return { status: 404, body: "Chatbot not found." };
  }
  const chatbotId = chatbot[0].id;

  const adLookupUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/advertisement?select=link,id&ad_id=eq.${uniqueAdId}`;
  let adResponse = await fetch(adLookupUrl, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  let ads = await adResponse.json();
  if (!adResponse.ok || ads.length === 0) {
    context.log.error("Advertisement not found or ad_id mismatch");
    return { status: 404, body: "Advertisement not found or ad_id mismatch." };
  }

  const destinationUrl = ads[0].link;
  const advertisementId = ads[0].id;

  const chatbotAdsLookupUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?select=id&ad_id=eq.${advertisementId}&chatbot_id=eq.${chatbotId}`;
  let chatbotAdsResponse = await fetch(chatbotAdsLookupUrl, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  let chatbotAds = await chatbotAdsResponse.json();
  if (!chatbotAdsResponse.ok || chatbotAds.length === 0) {
    context.log.error("No chatbot_ads record found for the given ad and chatbot.");
    return { status: 404, body: "No chatbot_ads record found for the given ad and chatbot." };
  }

  const userIP = request.headers['x-forwarded-for'] || 'unknown';
  const timestamp = Date.now();
  const userId = `${userIP}_${timestamp}`;

  const recordClickUrl = "https://adtochatbot-api-main-3fc4fde.d2.zuplo.dev/record_click";
  try {
    const response = await fetch(recordClickUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${zuploKey}`, // Add if needed, replace with actual key variable
      },
      body: JSON.stringify({
        ad_id: uniqueAdId,
        user_id: userId,
      }),
    });

    // Check response from the record_click call
    if (!response.ok) {
      const errorDetail = await response.text(); // or response.json() if it returns JSON
      context.log.error(`Failed to record click: ${errorDetail}`);
      // Consider how you want to handle this failure. For now, logging and proceeding.
    }

    return {
      status: 302,
      headers: {
        "Location": destinationUrl,
      },
      body: "",
    };
  } catch (error) {
    context.log.error(`Error recording click: ${error.message}`);
    return {
      status: 500,
      body: `Server Error: ${error.message}`,
    };
  }
}