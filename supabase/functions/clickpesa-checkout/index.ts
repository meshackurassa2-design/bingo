import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLICKPESA_API_URL = 'https://api.clickpesa.com/v1'; // Or sandbox URL

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { phoneNumber, amount, planId, mno } = await req.json()

    // 1. Authenticate with Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Get the logged-in user making the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // 3. Authenticate with ClickPesa
    const clientId = Deno.env.get('CLICKPESA_CLIENT_ID') || 'IDfjOmLXiUXBq5odX65gVZWJPGqPzFm0';
    const apiKey = Deno.env.get('CLICKPESA_API_KEY') || 'SKY10OCPPaQEYqrmjhfqiXoLFow8Wf5AgSqj3EJuCD';
    
    // Get JWT Token from ClickPesa
    const authResponse = await fetch(`https://api.clickpesa.com/third-parties/generate-token`, {
      method: 'POST',
      headers: {
        'client-id': clientId,
        'api-key': apiKey
      }
    });

    if (!authResponse.ok) {
      const errText = await authResponse.text();
      console.error('ClickPesa Auth Error:', errText);
      return new Response(JSON.stringify({ success: false, error: 'Auth Failed', details: errText, status: authResponse.status }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const authData = await authResponse.json().catch(() => ({ token: 'DUMMY_TOKEN' }));
    const token = authData.token || authData.access_token || 'DUMMY_TOKEN';
    
    // 4. Construct the ClickPesa USSD-PUSH Payload
    // This triggers the PIN prompt on the user's phone.
    const cleanPhone = phoneNumber.replace('+', '');
    const cleanOrderRef = ('SUB' + Date.now().toString()).slice(0, 20);
    
    // 4b. Record transaction in database to track for Webhook
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabaseAdmin
      .from('clickpesa_transactions')
      .insert({
        order_reference: cleanOrderRef,
        user_id: user.id,
        amount: amount,
        status: 'pending'
      });
      
    const clickPesaPayload = {
      amount: amount.toString(),
      currency: 'TZS',
      orderReference: cleanOrderRef,
      phoneNumber: cleanPhone,
      callback_url: `https://${Deno.env.get('SUPABASE_URL')?.replace('https://', '')}/functions/v1/clickpesa-webhook`
    }

    // 5. Send POST request to ClickPesa Collection API
    const clickpesaResponse = await fetch(`https://api.clickpesa.com/third-parties/payments/initiate-ussd-push-request`, {
      method: 'POST',
      headers: {
        'Authorization': token.startsWith('Bearer') ? token : `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clickPesaPayload)
    });
    
    let clickpesaData;
    const responseText = await clickpesaResponse.text();
    try {
      clickpesaData = JSON.parse(responseText);
    } catch(e) {
      clickpesaData = { message: 'Non-JSON Response', rawText: responseText, status: clickpesaResponse.status };
    }

    if (!clickpesaResponse.ok) {
       return new Response(JSON.stringify({ success: false, error: 'USSD Push Failed', details: clickpesaData, status: clickpesaResponse.status }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    console.log('ClickPesa USSD Push Response:', clickpesaData);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'USSD prompt triggered successfully',
        transactionId: clickPesaPayload.orderReference,
        apiResponse: clickpesaData
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400,
    })
  }
})
