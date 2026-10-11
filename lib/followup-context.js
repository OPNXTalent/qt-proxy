// Client conversation is untrusted context, never system instructions or authority.
export function buildFollowUpContext(messages, {maxChars=24000,maxMessages=40}={}) {
 if(!Array.isArray(messages))return '';
 const parts=[];let size=0;
 for(const m of messages.slice(-maxMessages).reverse()){
  if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string')continue;
  const content=m.content.trim();if(!content)continue;
  const label=m.role==='user'?'USER':'PRISM';
  const remaining=maxChars-size-label.length-3;if(remaining<=0)break;
  const piece=label+': '+content.slice(0,remaining);parts.unshift(piece);size+=piece.length+1;
 }
 return parts.join('\n');
}
