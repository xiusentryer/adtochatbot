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

  // First, find the chatbot_id using the apiKey
  let chatbotUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot?select=id&apiKey=eq.${apiKey}`;
  try {
    let response = await fetch(chatbotUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch chatbot: ${response.statusText}`);

    let chatbots = await response.json();
    if (chatbots.length === 0) throw new Error("No chatbot found with the given apiKey");

    const chatbotId = chatbots[0].id;

    // Now, fetch the ad_ids associated with this chatbot
    let adsUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?select=ad_id&chatbot_id=eq.${chatbotId}`;
    response = await fetch(adsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch ads for chatbot: ${response.statusText}`);

    let ads = await response.json();
    if (ads.length === 0) throw new Error("No ads found for the chatbot");

    // Randomly select an ad_id
    const randomAdIndex = Math.floor(Math.random() * ads.length);
    const adId = ads[randomAdIndex].ad_id;

    // Fetch the full details of the selected advertisement
    let adDetailsUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/advertisement?id=eq.${adId}&select=ad_id,text,link,highlight`;
    response = await fetch(adDetailsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch advertisement details: ${response.statusText}`);

    let adDetails = await response.json();
    if (adDetails.length === 0) throw new Error("No details found for the selected advertisement");

    context.log.info(`Successfully fetched advertisement details`);
    return adDetails[0]; // Assuming only one ad details is fetched
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return `Error: ${error.message}`;
  }
}
