import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  context.log.info(`Fetching data from Supabase`);

  const apiKey = request.params["chatbotapiKey"];
  if (!apiKey) {
    context.log.error("No chatbotapiKey provided in the path.");
    return "Error: No chatbotapiKey provided.";
  }

  // Supabase API Key
  const supabaseKey = environment.SUPABASE_API_KEY;

  try {
    // Find the chatbot_id using the apiKey
    const chatbotUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot?select=id&apiKey=eq.${apiKey}`;
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

    const chatbotId = chatbots[0].id;

    // Fetch all ad_ids associated with this chatbot
    const adsUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?select=ad_id&chatbot_id=eq.${chatbotId}`;
    const adsResponse = await fetch(adsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!adsResponse.ok) throw new Error(`Failed to fetch ads for chatbot: ${adsResponse.statusText}`);

    const ads = await adsResponse.json();
    if (ads.length === 0) throw new Error("No ads found for the chatbot");

    // Aggregate details of all advertisements associated with the chatbot
    const adDetailsPromises = ads.map(ad =>
      fetch(`https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/advertisement?id=eq.${ad.ad_id}&select=ad_id,text,link,highlight`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }).then(response => response.json())
    );

    const adDetailsResults = await Promise.all(adDetailsPromises);
    const adDetails = adDetailsResults.flat(); // Flatten the array of arrays

    if (adDetails.length === 0) throw new Error("No details found for the advertisements");

    context.log.info(`Successfully fetched advertisement details`);
    return adDetails; // Return all ad details
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return `Error: ${error.message}`;
  }
}
