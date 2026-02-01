import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// M-Pesa Daraja API Configuration
const MPESA_BASE_URL = "https://sandbox.safaricom.co.ke";
const CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const PASSKEY = Deno.env.get("MPESA_PASSKEY");
const SHORTCODE = Deno.env.get("MPESA_SHORTCODE") || "174379";

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
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, message: "Order ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order with checkout request ID
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("mpesa_checkout_request_id, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, message: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already completed or failed, return current status
    if (order.payment_status === "completed" || order.payment_status === "failed") {
      return new Response(
        JSON.stringify({ success: true, paymentStatus: order.payment_status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order.mpesa_checkout_request_id) {
      return new Response(
        JSON.stringify({ success: false, message: "No payment initiated" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query M-Pesa for transaction status
    const accessToken = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    const queryPayload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: order.mpesa_checkout_request_id,
    };

    const queryResponse = await fetch(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryPayload),
      }
    );

    const queryData = await queryResponse.json();
    console.log("STK Query response:", queryData);

    // Process the response
    if (queryData.ResultCode === "0") {
      // Payment completed
      await supabase
        .from("orders")
        .update({
          payment_status: "completed",
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ success: true, paymentStatus: "completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (queryData.ResultCode === "1032") {
      // Request cancelled by user
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          notes: "Payment cancelled by user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ success: true, paymentStatus: "failed", message: "Payment cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (queryData.ResultCode === "1037") {
      // Request timed out
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          notes: "Payment request timed out",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ success: true, paymentStatus: "failed", message: "Payment timed out" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Still processing or other status
      return new Response(
        JSON.stringify({ 
          success: true, 
          paymentStatus: "processing",
          message: queryData.ResultDesc || "Payment still processing"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    console.error("Payment status query error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
