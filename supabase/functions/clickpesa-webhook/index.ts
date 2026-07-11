import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // 1. Verify Request comes from ClickPesa (e.g. check secret header or signature)
    // const signature = req.headers.get('x-clickpesa-signature')
    // if (!verifySignature(req.body, signature)) throw new Error('Invalid signature')

    const payload = await req.json();
    console.log('Received Webhook from ClickPesa:', payload);

    // Assuming payload looks something like:
    // { orderReference: 'sub_userid_timestamp', status: 'SUCCESS', amount: 2000, ... }
    // Support both root-level properties and nested "data" wrapper depending on ClickPesa API version
    const transactionData = payload.data || payload;
    const status = transactionData.status || (payload.event === 'PAYMENT RECEIVED' ? 'SUCCESS' : 'UNKNOWN');
    const orderRef = transactionData.orderReference || transactionData.order_reference;
    
    if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'SETTLED') {
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // 1. Find the transaction
      const { data: txn, error: txnError } = await supabaseAdmin
        .from('clickpesa_transactions')
        .select('*')
        .eq('order_reference', orderRef)
        .single();

      if (txnError || !txn) {
        console.error('Transaction not found for orderRef:', orderRef);
        return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const userId = txn.user_id;
      
      // 2. Mark transaction as completed
      await supabaseAdmin
        .from('clickpesa_transactions')
        .update({ status: 'completed' })
        .eq('order_reference', orderRef);

      // 3. Activate the subscription for 30 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); 

      // Safely insert or update without relying on ON CONFLICT
      const { data: existingSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      let subError = null;
      if (existingSub) {
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({ end_date: endDate.toISOString(), plan_tier: '1_month' })
          .eq('id', existingSub.id);
        subError = error;
      } else {
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_tier: '1_month',
            end_date: endDate.toISOString(),
            status: 'active'
          });
        subError = error;
      }

      if (subError) throw subError;
      console.log(`Successfully activated subscription for user: ${userId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
