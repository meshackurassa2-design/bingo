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

      // 3. Determine the plan tier from the transaction amount to give the correct subscription duration
      const paidAmount = txn.amount || transactionData.amount || 2000;
      let planTier = '1_month';
      let durationDays = 30;
      
      if (paidAmount >= 18000) { planTier = '1_year'; durationDays = 365; }
      else if (paidAmount >= 10000) { planTier = '6_months'; durationDays = 180; }
      else if (paidAmount >= 5500) { planTier = '3_months'; durationDays = 90; }
      else { planTier = '1_month'; durationDays = 30; }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays); 

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
          .update({ end_date: endDate.toISOString(), plan_tier: planTier })
          .eq('id', existingSub.id);
        subError = error;
      } else {
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_tier: planTier,
            end_date: endDate.toISOString(),
            status: 'active'
          });
        subError = error;
      }

      if (subError) throw subError;
      console.log(`Successfully activated subscription for user: ${userId}`);

      // ==========================================
      // REFERRAL SYSTEM: Commission Payout
      // ==========================================
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('referred_by')
        .eq('id', userId)
        .single();
        
      if (userProfile && userProfile.referred_by) {
        // Determine commission based on plan tier or transaction amount
        // plan_tier is currently hardcoded to '1_month' in this webhook, 
        // so we will extract amount from payload or default to 500.
        // Wait, if the webhook hardcodes '1_month', we should fix that too!
        // But for now, we will look at transactionData.amount
        const paidAmount = transactionData.amount || 2000;
        let commission = 0;
        
        if (paidAmount >= 18000) commission = 5000;
        else if (paidAmount >= 10000) commission = 3000;
        else if (paidAmount >= 5500) commission = 1000;
        else if (paidAmount >= 2000) commission = 500;
        else commission = 500; // default fallback

        if (commission > 0) {
          // Increment the referrer's wallet
          const { error: rpcError } = await supabaseAdmin
            .rpc('increment_wallet_balance', { 
              user_id: userProfile.referred_by, 
              amount_to_add: commission 
            });
            
          // If the RPC fails (e.g. not created yet), fallback to a race-condition-prone read/write
          if (rpcError) {
             console.log("RPC increment failed, falling back to manual update", rpcError);
             const { data: referrer } = await supabaseAdmin
               .from('profiles')
               .select('wallet_balance')
               .eq('id', userProfile.referred_by)
               .single();
             if (referrer) {
               await supabaseAdmin
                 .from('profiles')
                 .update({ wallet_balance: (referrer.wallet_balance || 0) + commission })
                 .eq('id', userProfile.referred_by);
             }
          }
          console.log(`Paid commission of ${commission} to referrer ${userProfile.referred_by}`);
        }
      }
      
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
