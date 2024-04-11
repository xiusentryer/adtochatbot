import { ZuploContext, ZuploRequest, environment } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  if (request.method !== "POST") {
    return {
      status: 405,
      body: "Method Not Allowed",
    };
  }
  /*
  // API Authentication Check
  const expectedAuthToken = environment.ZUPLOKEY;
  const providedAuthToken = request.headers["authorization"];

  if (!providedAuthToken || providedAuthToken !== `Bearer ${expectedAuthToken}`) {
    return {
      status: 401, // Unauthorized
      body: "Unauthorized: Incorrect or missing API token.",
    };
  }
  */

  const { ad_id, addbudget } = await request.json();
  const user_id = request.params.user_id;

  if (!ad_id || typeof addbudget !== 'number' || !user_id) {
    return {
      status: 400,
      body: "Bad Request: Missing ad_id, addbudget, or user_id",
    };
  }

  const supabaseKey = environment.SUPABASE_API_KEY;

  try {
    // Fetch the advertisement data to get the current budget
    const adFetchUrl = `https://app.adtochatbot.com/rest/v1/advertisement?ad_id=eq.${ad_id}`;
    const adFetchResponse = await fetch(adFetchUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!adFetchResponse.ok) {
      throw new Error(`Failed to fetch advertisement data: ${adFetchResponse.statusText}`);
    }

    const [adData] = await adFetchResponse.json();
    if (!adData) {
      return {
        status: 404,
        body: "Error: Advertisement does not exist.",
      };
    }

    // Calculate new budget
    


    const newTotalPaid = adData.total_paid + addbudget;


    const addedBudget = adData.budget + addbudget;
    let newBudget = addedBudget;

    if (addedBudget > newTotalPaid) {
      newBudget = adData.budget;
    } else {
      newBudget = adData.budget + addbudget;
    }

    const RecentPayment = addbudget;

    // Update the advertisement's budget
    const adUpdateUrl = `https://app.adtochatbot.com/rest/v1/advertisement?ad_id=eq.${ad_id}`;
    const adUpdateResponse = await fetch(adUpdateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ 
        budget: newBudget,
        total_paid: newTotalPaid,
        recent_payment: RecentPayment
        }),
    });

    if (!adUpdateResponse.ok) {
      const errorMessage = await adUpdateResponse.text();
      throw new Error(`Failed to update advertisement budget: ${errorMessage}`);
    }

    // Return the added budget
    return {
      status: 200,
      body: JSON.stringify({ addedBudget: addbudget }),
    };
  } catch (error) {
    context.log.error(`Error: ${error.message}`);
    return {
      status: 500,
      body: `Server Error: ${error.message}`,
    };
  }
}
