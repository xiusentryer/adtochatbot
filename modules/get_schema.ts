import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

export default async function (request: ZuploRequest, context: ZuploContext) {
  // Extract the chatbotapiKey from the URL path
  const chatbotapiKey = request.params["chatbotapiKey"];

  if (!chatbotapiKey) {
    context.log.error("No chatbotapiKey provided in the URL path.");
    return { 
      status: 400, 
      body: { error: "No chatbotapiKey provided in the URL path." }
    };
  }
  const pathKey = "/get_ad_for_GPTs/" + chatbotapiKey;
  // Placeholder for API key validation (implement according to your security requirements)
  // if (!isValidApiKey(chatbotapiKey)) {
  //   context.log.error("Invalid chatbotapiKey.");
  //   return { status: 401, body: { error: "Invalid chatbotapiKey." } };
  // }

  // API description object
  const apiDescription = {
    openapi: "3.0.0",
    info: {
      title: "AdToChatBot API",
      description: "This API is used to fetch advertisements to show.",
      version: "1.1.0",
    },
    servers: [
      {
        url: "https://adtochatbot-api-main-aca9a7f.zuplo.app",
        description: "Main AdToChatBot API server",
      },
    ],
    paths: {
      [pathKey]: {
        post: {
          operationId: "getAdInfo",
          summary: "Returns advertisement details for this chatbot",
          description: "Retrieves advertisement details including text that may contain links and engaging highlights.",
          parameters: [
            {
              in: "query",
              name: "conversation_context",
              schema: {
                type: "string",
              },
              description: "The full user input. If this is the first message in the conversation, add '[start]' before the string, otherwise add '[continue]' before the string.",
            },
          ],
          responses: {
            "200": {
              description: "A JSON object containing the advertisement details for this chatbot",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AdContent",
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        AdContent: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The advertisement text, which may include URLs and highlights.",
            },
          },
        },
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "adtochatbot-api",
      },
    },
  };

  // Return the API description directly; ensure your API/middleware serializes this appropriately
  return apiDescription;
}
