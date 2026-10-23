import {signedIn,limit} from './account-api.mjs';
import {createTutorHandler} from './gemini-core.mjs';
const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});

export async function handleTutor(request,env,{fetcher=fetch}={}) {
  const model=String(env.GEMINI_MODEL||'').trim().replace(/^models\//,'');
  if (request.method==='GET') return reply(200,{service:'XSTK Gemini Tutor',version:'3.0-personal',configured:!!env.DB&&/^[a-zA-Z0-9._-]{3,100}$/.test(model),missing:[!env.DB&&'DB',!model&&'GEMINI_MODEL'].filter(Boolean),message:'Máy chủ dùng khóa Gemini cá nhân theo từng yêu cầu. Chưa gọi Google và chưa kiểm tra khóa.'});
  if (request.method!=='POST') return reply(405,{code:'METHOD_NOT_ALLOWED',error:'Chỉ hỗ trợ POST.'});
  if (new URL(request.url).protocol!=='https:') return reply(403,{code:'HTTPS_REQUIRED',error:'Hãy mở website bằng HTTPS trước khi nhập khóa.'});
  if(request.headers.get('origin')!==new URL(request.url).origin) return reply(403,{code:'ORIGIN_DENIED',error:'Chỉ nhận yêu cầu từ chính website.'});
  if(!env.DB) return reply(503,{code:'CONFIG_MISSING',error:'Chưa kết nối database DB trên Cloudflare.'});
  if(!/^[a-zA-Z0-9._-]{3,100}$/.test(model)) return reply(503,{code:'CONFIG_MISSING',error:'Chủ website cần đặt GEMINI_MODEL đúng mã mô hình hỗ trợ trong Google AI Studio.'});
  try {
    const user=await signedIn(env.DB,request);
    const key=request.headers.get('x-gemini-key')?.trim()||'';
    if(key.length<20||key.length>256||!/^[\x21-\x7e]+$/.test(key))return reply(400,{code:'KEY_REQUIRED',error:'Nhập khóa API Gemini cá nhân hợp lệ. Khóa chỉ dùng trong phiên này.'});
    // Authenticate and rate-limit before contacting Google. Never persist or log the key.
    await limit(env.DB,request,'tutor:'+user.id,10,60000);
    const headers=new Headers(request.headers);
    headers.delete('x-gemini-key');
    headers.set('x-tutor-access','internal-request');
    const forwarded=new Request(request,{headers});
    const handler=createTutorHandler({env:{GEMINI_API_KEY:key,GEMINI_MODEL:model,TUTOR_ACCESS_CODE:'internal-request',GEMINI_API_STYLE:'generateContent'},fetcher});
    return await handler(forwarded);
  } catch(error) {
    const status=Number.isInteger(error.status)?error.status:500;
    return reply(status,{code:status===401?'SESSION_EXPIRED':status===429?'RATE_LIMITED':'SERVER_ERROR',error:status<500?error.message:'Chưa kết nối được gia sư. Hãy thử lại.'});
  }
}
