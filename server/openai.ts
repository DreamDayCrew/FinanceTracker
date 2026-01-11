import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORIES = [
  "Groceries",
  "Transport",
  "Dining",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Education",
  "Travel",
  "Salary",
  "Investment",
  "Transfer",
  "Other"
];

export async function suggestCategory(description: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expense categorization expert. Based on the text, suggest the most appropriate category from this list: ${CATEGORIES.join(", ")}. Respond with only the category name in JSON format: { "category": "CategoryName" }`,
        },
        {
          role: "user",
          content: `Categorize this: "${description}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (result.category && CATEGORIES.includes(result.category)) {
      return result.category;
    }
    
    return "Other";
  } catch (error) {
    console.error("AI categorization error:", error);
    return fallbackCategorization(description);
  }
}

export function fallbackCategorization(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes("food") || lowerDesc.includes("grocery") || lowerDesc.includes("supermarket") || lowerDesc.includes("vegetables")) {
    return "Groceries";
  }
  if (lowerDesc.includes("uber") || lowerDesc.includes("ola") || lowerDesc.includes("taxi") || lowerDesc.includes("bus") || lowerDesc.includes("train") || lowerDesc.includes("fuel") || lowerDesc.includes("petrol")) {
    return "Transport";
  }
  if (lowerDesc.includes("restaurant") || lowerDesc.includes("cafe") || lowerDesc.includes("zomato") || lowerDesc.includes("swiggy") || lowerDesc.includes("lunch") || lowerDesc.includes("dinner")) {
    return "Dining";
  }
  if (lowerDesc.includes("clothes") || lowerDesc.includes("shoes") || lowerDesc.includes("shopping") || lowerDesc.includes("amazon") || lowerDesc.includes("flipkart") || lowerDesc.includes("myntra")) {
    return "Shopping";
  }
  if (lowerDesc.includes("movie") || lowerDesc.includes("netflix") || lowerDesc.includes("spotify") || lowerDesc.includes("game") || lowerDesc.includes("hotstar")) {
    return "Entertainment";
  }
  if (lowerDesc.includes("electricity") || lowerDesc.includes("water") || lowerDesc.includes("internet") || lowerDesc.includes("phone") || lowerDesc.includes("bill") || lowerDesc.includes("recharge")) {
    return "Bills";
  }
  if (lowerDesc.includes("doctor") || lowerDesc.includes("hospital") || lowerDesc.includes("medicine") || lowerDesc.includes("pharmacy") || lowerDesc.includes("apollo")) {
    return "Health";
  }
  if (lowerDesc.includes("school") || lowerDesc.includes("course") || lowerDesc.includes("book") || lowerDesc.includes("tuition") || lowerDesc.includes("udemy")) {
    return "Education";
  }
  if (lowerDesc.includes("flight") || lowerDesc.includes("hotel") || lowerDesc.includes("vacation") || lowerDesc.includes("travel") || lowerDesc.includes("makemytrip")) {
    return "Travel";
  }
  if (lowerDesc.includes("salary") || lowerDesc.includes("credited") || lowerDesc.includes("received")) {
    return "Salary";
  }
  if (lowerDesc.includes("mutual fund") || lowerDesc.includes("stock") || lowerDesc.includes("investment") || lowerDesc.includes("zerodha") || lowerDesc.includes("groww")) {
    return "Investment";
  }
  // Check for person-to-person transfers or UPI payments
  if (lowerDesc.includes("transfer") || lowerDesc.includes("upi") || lowerDesc.includes("neft") || 
      lowerDesc.includes("imps") || lowerDesc.includes("sent money") || lowerDesc.includes("sent rs")) {
    return "Transfer";
  }
  // If description is just a person's name (likely P2P transfer), categorize as Transfer
  if (description.match(/^[A-Z\s]+$/)) {
    return "Transfer";
  }
  
  return "Other";
}

export interface ParsedSmsData {
  amount: number;
  type: "debit" | "credit";
  merchant?: string;
  description?: string;
  referenceNumber?: string;
  date?: string;
  accountLastDigits?: string;
}

export async function parseSmsMessage(message: string, sender?: string): Promise<ParsedSmsData | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at parsing Indian bank SMS messages. Extract transaction details from the SMS.
          
Return a JSON object with these fields:
- amount: number (the transaction amount in INR)
- type: "debit" or "credit"
- merchant: string (merchant/payee name if available)
- description: string (brief description of transaction)
- referenceNumber: string (UPI/transaction reference if available)
- date: string (transaction date in ISO format if mentioned)
- accountLastDigits: string (last 4 digits of account/card if mentioned)

If you cannot parse the SMS as a financial transaction, return { "notTransaction": true }`,
        },
        {
          role: "user",
          content: `Parse this SMS from ${sender || "unknown"}: "${message}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (result.notTransaction || !result.amount) {
      return null;
    }
    
    return {
      amount: parseFloat(result.amount),
      type: result.type === "credit" ? "credit" : "debit",
      merchant: result.merchant,
      description: result.description,
      referenceNumber: result.referenceNumber,
      date: result.date,
      accountLastDigits: result.accountLastDigits,
    };
  } catch (error) {
    console.error("SMS parsing error:", error);
    return fallbackSmsParser(message);
  }
}

function fallbackSmsParser(message: string): ParsedSmsData | null {
  const lowerMsg = message.toLowerCase();
  
  // Check if it's a transaction message
  if (!lowerMsg.includes("rs") && !lowerMsg.includes("inr") && !lowerMsg.includes("₹")) {
    return null;
  }
  
  // Determine transaction type
  const isDebit = lowerMsg.includes("debited") || lowerMsg.includes("spent") || lowerMsg.includes("paid") || 
                  lowerMsg.includes("withdrawn") || lowerMsg.includes("sent rs") || lowerMsg.includes("sent inr") ||
                  lowerMsg.includes("transferred") || lowerMsg.includes("purchase");
  const isCredit = lowerMsg.includes("credited") || lowerMsg.includes("received") || lowerMsg.includes("refund") ||
                   lowerMsg.includes("deposited");
  
  if (!isDebit && !isCredit) {
    return null;
  }
  
  // Extract amount using regex patterns
  const amountPatterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:rs\.?|inr|₹)([\d,]+(?:\.\d{2})?)/i,
    /([\d,]+(?:\.\d{2})?)\s*(?:rs\.?|inr|₹)/i,
  ];
  
  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const match = message.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ""));
      break;
    }
  }
  
  if (!amount) {
    return null;
  }
  
  // Extract reference number
  const refPatterns = [
    /(?:ref(?:erence)?(?:\s*(?:no\.?|number|id)?)?[:\s]*)([\w\d]+)/i,
    /(?:upi\s*(?:ref)?[:\s]*)([\w\d]+)/i,
    /(?:txn\s*(?:id)?[:\s]*)([\w\d]+)/i,
  ];
  
  let referenceNumber: string | undefined;
  for (const pattern of refPatterns) {
    const match = message.match(pattern);
    if (match) {
      referenceNumber = match[1];
      break;
    }
  }
  
  // Extract merchant/payee name
  let merchant: string | undefined;
  const merchantPatterns = [
    /(?:to|at)\s+([A-Z][A-Z\s]+?)(?:\n|on|ref)/i,  // "To D PRINCE" or "at MERCHANT NAME"
    /(?:paid to|sent to)\s+([^\n]+)/i,
  ];
  
  for (const pattern of merchantPatterns) {
    const match = message.match(pattern);
    if (match) {
      merchant = match[1].trim();
      break;
    }
  }
  
  // Extract account last digits
  const accountMatch = message.match(/(?:a\/c|account|card|xx)[\s*]*([\d]{4})/i);
  const accountLastDigits = accountMatch ? accountMatch[1] : undefined;
  
  return {
    amount,
    type: isCredit ? "credit" : "debit",
    merchant,
    referenceNumber,
    accountLastDigits,
    description: merchant ? `Payment to ${merchant}` : (isCredit ? "Amount credited" : "Amount debited"),
  };
}
