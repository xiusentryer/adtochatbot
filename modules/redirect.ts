import { ZuploRequest, ZuploContext, environment } from "@zuplo/runtime";

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
  const chatbotAdsLookupUrl = `https://app.adtochatbot.com/rest/v1/advertisement?select=link&id=eq.${adId}`;
  let chatbotAdsResponse = await fetch(chatbotAdsLookupUrl, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!chatbotAdsResponse.ok) {
    context.log.error("Failed to find record in advertisement with the given parameters");
    return { status: 404, body: "Record not found in ads database." };
  }

  let chatbotAds = await chatbotAdsResponse.json();
  if (chatbotAds.length === 0) {
    return { status: 404, body: "Record not found in ads database." };
  }
  const destinationUrl = chatbotAds[0].link;

  return {
    status: 302,
    headers: {
      "Location": destinationUrl,
    },
    body: "",
  };
}
