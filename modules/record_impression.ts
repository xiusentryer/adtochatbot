import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  context.log.info("Attempting to record an impression");

  if (request.method !== "PUT") {
    return { status: 405, body: "Method Not Allowed" };
  }

  const { apiKey, ad_id } = await request.json();
  if (!apiKey || !ad_id) {
    return { status: 400, body: "Bad Request: Missing apiKey or ad_id" };
  }

  // Supabase API Key
  const supabaseKey = environment.SUPABASE_API_KEY;
  const baseUrl = "https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1";

  try {
    // Find the chatbot_id using the apiKey
    let response = await fetch(`${baseUrl}/chatbot?select=id&apiKey=eq.${apiKey}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });
    let chatbots = await response.json();
    if (chatbots.length === 0) throw new Error("Chatbot not found with the given apiKey");
    const chatbotId = chatbots[0].id;

    // Find the advertisement ID using ad_id
    response = await fetch(`${baseUrl}/advertisement?select=id&ad_id=eq.${ad_id}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });
    let ads = await response.json();
    if (ads.length === 0) throw new Error("Advertisement not found with the given ad_id");
    const advertisementId = ads[0].id;

    // Now, increment the impressions for the corresponding chatbot_ad entry
    // This assumes you have a mechanism (like a stored procedure) to handle the increment
    // Replace the following URL with the actual one pointing to your update logic
    const updateImpressionsUrl = `${baseUrl}/chatbot_ads?chatbot_id=eq.${chatbotId}&ad_id=eq.${advertisementId}`;
    response = await fetch(updateImpressionsUrl, {
      method: 'PATCH', // Use PATCH for partial updates
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        impressions: 'impressions + 1', // This exact syntax might not work; see note below
      }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Failed to increment impressions: ${errorMessage}`);
    }

    context.log.info("Impressions incremented successfully");
    return { status: 200, body: "Impression recorded successfully" };
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return { status: 500, body: `Server Error: ${error.message}` };
  }
}
