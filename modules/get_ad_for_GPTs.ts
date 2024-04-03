import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  context.log.info("Processing request to increment ad impressions");

  const apiKey = request.params["chatbotapiKey"];
  if (!apiKey) {
    context.log.error("No chatbotapiKey provided in the path.");
    return "Error: No chatbot apiKey provided.";
  }
  
  //retrieve the conversation_context from the API call.
  const user_text = request.query["prompt"];
  if (!user_text) {
    context.log.error("No conversation context provided.");
    return "Error: No conversation context provided.";
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
    const adsUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?select=id,ad_id,impressions&chatbot_id=eq.${chatbotId}`;
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

    //Instead of selecting a random advertisement, call a chatgpt text editor to search for the most ideal advertisement (using the advertisement.text) from the database in relation to the user_text

    // Select a random advertisement
    const randomAdIndex = Math.floor(Math.random() * ads.length);
    const selectedAd = ads[randomAdIndex];

     // Manually increment the impressions for the selected advertisement
    const newImpressions = selectedAd.impressions + 1;
    const updateImpressionUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/chatbot_ads?id=eq.${selectedAd.id}`;
    await fetch(updateImpressionUrl, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ impressions: newImpressions }),
    });

    // Retrieve the full advertisement details
    const adDetailsUrl = `https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/advertisement?id=eq.${selectedAd.ad_id}`;
    const adDetailsResponse = await fetch(adDetailsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    const adDetails = await adDetailsResponse.json();
    if (adDetails.length === 0) throw new Error("Failed to fetch details for the selected advertisement");

    const ad = adDetails[0];
    let formattedText = ad.text;
    if (ad.text.includes(ad.highlight)) {
      formattedText = ad.text.replace(ad.highlight, `${ad.highlight}(${ad.link})`);
    } else {
      formattedText += ` (${ad.link})`;
    }

    context.log.info("Successfully processed advertisement impression and retrieved details.");
    return {
      text: formattedText,
    };
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return `Error: ${error.message}`;
  }
}

