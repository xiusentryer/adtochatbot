import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  if (request.method !== "GET") {
    return {
      status: 405,
      body: "Method Not Allowed",
    };
  }

  const chatbotId = request.query["c"];
  const adId = request.query["a"];

  if (!chatbotId || !adId) {
    return {
      status: 400,
      body: "Missing required parameters",
    };
  }

  const supabaseKey = environment.SERVICE_ROLE_KEY;
  const zuploKey = environment.ZUPLOKEY;

  const chatbotAdsLookupUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?select=link&chatbot_id=eq.${chatbotId}&ad_id=eq.${adId}`;
  let chatbotAdsResponse = await fetch(chatbotAdsLookupUrl, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!chatbotAdsResponse.ok) {
    context.log.error("Failed to find record in chatbot_ads with the given chatbot_id and ad_id");
    return { status: 404, body: "Record not found in chatbot_ads." };
  }

  let chatbotAds = await chatbotAdsResponse.json();
  if (chatbotAds.length === 0) {
    return { status: 404, body: "Record not found in chatbot_ads." };
  }
  const destinationUrl = chatbotAds[0].link;

  const userIP = request.headers['x-forwarded-for'] || 'unknown';
  const timestamp = Date.now();
  const userId = `${userIP}_${timestamp}`;

  const recordClickUrl = "https://adtochatbot-api-main-3fc4fde.d2.zuplo.dev/record_click";
  try {
    const response = await fetch(recordClickUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${zuploKey}`,
      },
      body: JSON.stringify({
        ad_id: adId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      context.log.error(`Failed to record click: ${errorDetail}`);
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
