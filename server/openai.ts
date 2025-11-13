import OpenAI from "openai";

// This is using OpenAI's API, which points to OpenAI's API servers and requires your own API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function suggestExpenseCategory(description: string): Promise<string> {
  const categories = [
    "Groceries",
    "Transport",
    "Dining",
    "Shopping",
    "Entertainment",
    "Bills",
    "Health",
    "Education",
    "Travel",
    "Other"
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expense categorization expert. Based on the user's expense description, suggest the most appropriate category from this list: ${categories.join(", ")}. Respond with only the category name in JSON format: { "category": "CategoryName" }`,
        },
        {
          role: "user",
          content: `Categorize this expense: "${description}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate the category is in our list
    if (result.category && categories.includes(result.category)) {
      return result.category;
    }
    
    // Default to "Other" if invalid
    return "Other";
  } catch (error) {
    console.error("AI categorization error:", error);
    // Fallback to simple keyword matching
    return fallbackCategorization(description);
  }
}

function fallbackCategorization(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes("food") || lowerDesc.includes("grocery") || lowerDesc.includes("supermarket")) {
    return "Groceries";
  }
  if (lowerDesc.includes("uber") || lowerDesc.includes("taxi") || lowerDesc.includes("bus") || lowerDesc.includes("train") || lowerDesc.includes("fuel") || lowerDesc.includes("petrol")) {
    return "Transport";
  }
  if (lowerDesc.includes("restaurant") || lowerDesc.includes("cafe") || lowerDesc.includes("dining") || lowerDesc.includes("lunch") || lowerDesc.includes("dinner")) {
    return "Dining";
  }
  if (lowerDesc.includes("clothes") || lowerDesc.includes("shoes") || lowerDesc.includes("shopping") || lowerDesc.includes("amazon") || lowerDesc.includes("flipkart")) {
    return "Shopping";
  }
  if (lowerDesc.includes("movie") || lowerDesc.includes("netflix") || lowerDesc.includes("spotify") || lowerDesc.includes("game")) {
    return "Entertainment";
  }
  if (lowerDesc.includes("electricity") || lowerDesc.includes("water") || lowerDesc.includes("internet") || lowerDesc.includes("phone") || lowerDesc.includes("bill")) {
    return "Bills";
  }
  if (lowerDesc.includes("doctor") || lowerDesc.includes("hospital") || lowerDesc.includes("medicine") || lowerDesc.includes("pharmacy")) {
    return "Health";
  }
  if (lowerDesc.includes("school") || lowerDesc.includes("course") || lowerDesc.includes("book") || lowerDesc.includes("tuition")) {
    return "Education";
  }
  if (lowerDesc.includes("flight") || lowerDesc.includes("hotel") || lowerDesc.includes("vacation") || lowerDesc.includes("travel")) {
    return "Travel";
  }
  
  return "Other";
}
