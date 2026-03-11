const ai = require('./server/services/aiService');
async function test() {
  const q = 'Design a URL shortening service like bit.ly. Walk me through your architecture.';
  const weakA = 'I would do it by thinking about the problem and maybe using some tools to fix it, kind of like what I have done before.';
  const strongA = 'At my previous company, I was responsible for migrating our monolithic authentication service to microservices. I led a team of 4 engineers, designed the JWT-based token system using Redis for session storage, implemented a gradual rollout with feature flags. As a result, we reduced authentication latency by 65% and scaled from 10K to 200K daily active users.';
  
  const weak = await ai.evaluateAnswer(q, weakA);
  const strong = await ai.evaluateAnswer(q, strongA);
  console.log('=== WEAK ANSWER ===');
  console.log(JSON.stringify(weak, null, 2));
  console.log('=== STRONG ANSWER ===');
  console.log(JSON.stringify(strong, null, 2));
}
test().catch(console.error);
