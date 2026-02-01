import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// M-Pesa Daraja API Configuration
const MPESA_BASE_URL = "https://sandbox.safaricom.co.ke"; // Sandbox URL
const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const PASSKEY = Deno.env.get("MPESA_PASSKEY");
const SHORTCODE = Deno.env.get("MPESA_SHORTCODE") || "174379"; // Default sandbox shortcode

async function getAccessToken(): Promise<string> {
  const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
  
  const response = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to get access token:", error);
    throw new Error("Failed to get M-Pesa access token");
  }

  const data = await response.json();
  return data.access_token;
}

function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generatePassword(timestamp: string): string {
  const data = `${SHORTCODE}${PASSKEY}${timestamp}`;
  return btoa(data);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, orderId, orderNumber } = await req.json();

    // Debug: Log configuration
    console.log("M-Pesa Configuration:", {
      hasConsumerKey: !!CONSUMER_KEY,
      hasConsumerSecret: !!CONSUMER_SECRET,
      hasPasskey: !!PASSKEY,
      shortcode: SHORTCODE,
    });

    // Validate required fields
    if (!phoneNumber || !amount || !orderId) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate environment variables
    if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY) {
      console.error("Missing M-Pesa configuration");
      return new Response(
        JSON.stringify({ success: false, message: "M-Pesa is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Generate timestamp and password
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    // Prepare callback URL (you'll need to set this up)
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    // STK Push payload
    const stkPayload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: orderNumber || orderId.substring(0, 12),
      TransactionDesc: `Payment for order ${orderNumber || orderId}`,
    };

    console.log("Initiating STK Push for order:", orderId);

    // Send STK Push request
    const stkResponse = await fetch(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      }
    );

    const stkData = await stkResponse.json();
    console.log("STK Push response:", stkData);

    if (stkData.ResponseCode === "0") {
      // Success - update order with checkout request ID
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from("orders")
          .update({
            mpesa_checkout_request_id: stkData.CheckoutRequestID,
            payment_status: "processing",
          })
          .eq("id", orderId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "STK Push sent successfully",
          checkoutRequestId: stkData.CheckoutRequestID,
          merchantRequestId: stkData.MerchantRequestID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: stkData.errorMessage || stkData.ResponseDescription || "STK Push failed",
          errorCode: stkData.errorCode || stkData.ResponseCode,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("M-Pesa STK Push error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
