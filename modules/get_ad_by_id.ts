import { ZuploContext, ZuploRequest, environment} from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  /**
   * Use the log property on context to enjoy
   * logging magic when testing your API.
   */
  context.log.info(`Fetching data from Supabase`);

  const adId = request.params["adId"];
  context.log.info(adId);
  if (!adId) {
    context.log.error("No adid provided in the query parameters.");
    return "Error: No adid provided.";
  }

  // The Supabase URL
  const supabaseUrl = "https://qzywnrspxbcmlbhhnbxe.supabase.co/rest/v1/advertisement?ad_id=eq." + adId + "&select=text,link,highlight";

  // Supabase API Key (replace 'YOUR_SUPABASE_KEY' with your actual key)
  const supabaseKey = environment.SUPABASE_API_KEY;

  try {
    const response = await fetch(supabaseUrl, {
      method: 'GET', // GET request to fetch data
      headers: {
        'apikey': supabaseKey, // API key header
        'Authorization': `Bearer ${supabaseKey}`, // Authorization header
        'Content-Type': 'application/json',
      },
    });

  if (!response.ok) {
      // If the response is not ok, log the error
      context.log.error(`Failed to fetch data from Supabase: ${response.statusText}`);
      return `Error: ${response.statusText}`;
    }

  const data = await response.json();

  const filteredData = data.map(ad => ({
    text: ad.text,
    link: ad.link,
    highlight: ad.highlight
  }))
  context.log.info(`Successfully fetched data from Supabase`);
    return filteredData[0];
  } catch (error) {
    // Log any errors that occur during the fetch operation
    context.log.error(`Error fetching data from Supabase: ${error}`);
    return `Error: ${error}`;
}

}