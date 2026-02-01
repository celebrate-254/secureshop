import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callbackData = await req.json();
    console.log("M-Pesa Callback received:", JSON.stringify(callbackData));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract callback body
    const body = callbackData.Body?.stkCallback;
    
    if (!body) {
      console.error("Invalid callback format");
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const checkoutRequestId = body.CheckoutRequestID;
    const resultCode = body.ResultCode;
    const resultDesc = body.ResultDesc;

    console.log(`Processing callback for CheckoutRequestID: ${checkoutRequestId}, ResultCode: ${resultCode}`);

    // Find the order by checkout request ID
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("mpesa_checkout_request_id", checkoutRequestId)
      .single();

    if (orderError || !order) {
      console.error("Order not found for CheckoutRequestID:", checkoutRequestId);
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = body.CallbackMetadata?.Item || [];
      
      // Extract M-Pesa receipt number
      const receiptItem = callbackMetadata.find((item: any) => item.Name === "MpesaReceiptNumber");
      const receiptNumber = receiptItem?.Value;

      // Update order as paid
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "completed",
          status: "paid",
          mpesa_receipt_number: receiptNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      } else {
        console.log(`Order ${order.id} marked as paid. Receipt: ${receiptNumber}`);
      }
    } else {
      // Payment failed
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          notes: `Payment failed: ${resultDesc}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("Failed to update order:", updateError);
      } else {
        console.log(`Order ${order.id} payment failed: ${resultDesc}`);
      }
    }

    // Always respond with success to M-Pesa
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Callback processing error:", error);
    // Still respond with success to avoid retries
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
