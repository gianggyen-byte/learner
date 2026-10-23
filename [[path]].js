import {handleApi} from '../../lib/account-api.mjs';
import {handleTutor} from '../../lib/personal-tutor.mjs';

export async function onRequest({request,env}) {
  if (new URL(request.url).pathname === '/api/tutor') return handleTutor(request,env);
  return handleApi(request,env.DB);
}
