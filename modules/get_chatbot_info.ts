import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  context.log.info(`Fetching chatbot and ads data from Supabase`);

  const apiKey = request.params["chatbotapiKey"];
  if (!apiKey) {
    context.log.error("No chatbotapiKey provided in the path.");
    return { error: "No chatbotapiKey provided." };
  }

  // Supabase API Key
  const supabaseKey = environment.SUPABASE_API_KEY;

  try {
    // Fetch chatbot information using the apiKey
    const chatbotUrl = `https://app.adtochatbot.com/rest/v1/chatbot?select=id,userid,name,link,created_at,apiKey&apiKey=eq.${apiKey}`;
    const chatbotResponse = await fetch(chatbotUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!chatbotResponse.ok) throw new Error(`Failed to fetch chatbot: ${chatbotResponse.statusText}`);

    const chatbot = await chatbotResponse.json();
    if (chatbot.length === 0) throw new Error("No chatbot found with the given apiKey");
    const chatbotData = chatbot[0];

    // Fetch chatbot_ads data and aggregate impressions, clicks, and revenue
    const adsStatsUrl = `https://app.adtochatbot.com/rest/v1/chatbot_ads?select=impressions,clicks,revenue&chatbot_id=eq.${chatbotData.id}`;
    const adsStatsResponse = await fetch(adsStatsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!adsStatsResponse.ok) throw new Error(`Failed to fetch ads stats for chatbot: ${adsStatsResponse.statusText}`);

    const adsStats = await adsStatsResponse.json();
    const totalImpressions = adsStats.reduce((acc, curr) => acc + curr.impressions, 0);
    const totalClicks = adsStats.reduce((acc, curr) => acc + curr.clicks, 0);
    const totalRevenue = adsStats.reduce((acc, curr) => acc + curr.revenue, 0);
    const ctr = totalImpressions !== 0 ? parseFloat((totalClicks / totalImpressions * 100).toFixed(1)) : 0.0;

    // Construct and return the final object
    return {
      chatbot: {
        id: chatbotData.id,
        userid: chatbotData.userid,
        name: chatbotData.name,
        link: chatbotData.link,
        created_at: chatbotData.created_at,
        apiKey: chatbotData.apiKey,
      },
      adsStats: {
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        ctr: ctr,
        total_revenue: totalRevenue,
      },
    };
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return { error: error.message };
  }
}
