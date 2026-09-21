export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/contact") return handleContact(request, env);
    return env.ASSETS.fetch(request);
  }
};

async function handleContact(request, env) {
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });

  if (!env.CONTACT_TO || !env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY)
    return json({ ok:false, error:"Contact delivery is not configured yet." },503);

  let body;
  try { body = await request.json(); } catch { return json({ok:false,error:"Invalid request."},400); }

  const name=String(body.name||"").trim().slice(0,100);
  const email=String(body.email||"").trim().slice(0,200);
  const message=String(body.message||"").trim().slice(0,5000);
  const website=String(body.website||"").trim();
  const turnstileToken=String(body["cf-turnstile-response"]||"").trim();

  if (website) return json({ok:true});
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json({ok:false,error:"Please complete all fields correctly."},400);
  if (!turnstileToken) return json({ok:false,error:"Please complete the security check."},400);

  const form=new FormData();
  form.append("secret",env.TURNSTILE_SECRET_KEY);
  form.append("response",turnstileToken);
  const ip=request.headers.get("CF-Connecting-IP");
  if(ip) form.append("remoteip",ip);

  const verify=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:form});
  const verification=await verify.json();
  if(!verification.success) {
    console.warn("Turnstile verification failed",verification["error-codes"]||[]);
    return json({ok:false,error:"Security check failed. Please try again."},403);
  }

  const from=env.CONTACT_FROM||"CopperTrace <contact@coppertrace.co.uk>";
  const text=["New CopperTrace contact message","","Name: "+name,"Reply email: "+email,"",message].join("\n");
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({from,to:[env.CONTACT_TO],reply_to:email,subject:"CopperTrace contact — "+name,text})
  });
  if(!response.ok){console.error("Mail provider error",response.status,await response.text());return json({ok:false,error:"Message could not be delivered."},502);}
  return json({ok:true});
}