const axios = require("axios")

const HF_MODEL =
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Fallback question bank ────────────────────────────────────────────────
const FALLBACK_QUESTIONS = {
    'Software Engineer': {
        Junior: [
            "Explain the difference between a stack and a queue. When would you use each?",
            "What is Big O notation and why does it matter?",
            "Describe the four pillars of object-oriented programming with examples.",
            "Tell me about a project you built from scratch. What challenges did you face?",
            "How do you approach debugging a bug you've never seen before?",
        ],
        Mid: [
            "Design a URL shortening service like bit.ly. Walk me through your architecture.",
            "Explain the CAP theorem and how it applies to distributed systems.",
            "What are the trade-offs between SQL and NoSQL databases? When do you choose each?",
            "Describe a time you had to make a difficult technical decision with incomplete information.",
            "How do you ensure code quality and prevent regressions in a team environment?",
        ],
        Senior: [
            "How would you design a real-time collaborative document editing system (like Google Docs)?",
            "Explain the SAGA pattern and how it handles distributed transactions.",
            "How do you approach capacity planning for a system expecting 10x traffic growth?",
            "Describe a time you led a major architectural change. What would you do differently?",
            "How do you balance technical debt against shipping new features?",
        ],
    },
    'Data Scientist': {
        Junior: [
            "What is the difference between supervised and unsupervised learning?",
            "Explain overfitting and how you prevent it.",
            "How do you handle missing data in a dataset?",
            "Walk me through a data analysis project you've completed.",
            "What metrics would you use to evaluate a classification model?",
        ],
        Mid: [
            "Explain the bias-variance tradeoff and give a practical example.",
            "How would you build a recommendation system for an e-commerce platform?",
            "Describe the differences between bagging and boosting ensemble methods.",
            "Tell me about a model you deployed to production. What monitoring did you put in place?",
            "How do you communicate complex statistical findings to non-technical stakeholders?",
        ],
        Senior: [
            "How would you design an A/B testing framework from scratch for a company with 50M users?",
            "Explain causal inference and why correlation alone isn't sufficient for decision-making.",
            "How do you approach building a data science roadmap that aligns with business goals?",
            "Describe the biggest data science failure you've overseen and what you learned.",
            "How would you architect a real-time ML inference pipeline handling 100K requests/second?",
        ],
    },
    'Product Manager': {
        Junior: [
            "How do you prioritize features when you have more requests than capacity?",
            "Walk me through how you would conduct user research for a new feature.",
            "What metrics would you track for a new user onboarding flow?",
            "Tell me about a product you admire and why.",
            "Describe a time you had to make a decision with limited data.",
        ],
        Mid: [
            "How would you define and measure product-market fit?",
            "Describe your process for creating a product roadmap from scratch.",
            "How do you manage stakeholder expectations when you have to say no to a feature request?",
            "Tell me about a product launch that didn't go as planned. What did you learn?",
            "How do you balance user needs against business requirements?",
        ],
        Senior: [
            "How would you build and evolve a platform product strategy over 3 years?",
            "Describe how you've built and scaled a product team. What did you look for when hiring?",
            "How do you decide when to kill a product or feature?",
            "Tell me about a time you had to pivot a product direction based on market feedback.",
            "How do you approach building products for multiple customer segments with different needs?",
        ],
    },
};

const DEFAULT_QUESTIONS = {
    Junior: [
        "Describe a project you're most proud of in your career so far.",
        "How do you prioritize your tasks when working under tight deadlines?",
        "What is your approach to learning a new technology or skill?",
        "Tell me about a time you made a mistake at work and how you handled it.",
        "Where do you see yourself in the next 2-3 years?",
    ],
    Mid: [
        "Describe a complex problem you solved. What was your approach?",
        "How do you mentor junior team members while still delivering your own work?",
        "Tell me about a time you disagreed with your manager. How did you handle it?",
        "How do you stay current with industry trends and best practices?",
        "Describe a cross-functional project you led. What was the outcome?",
    ],
    Senior: [
        "How have you shaped engineering culture at a previous organization?",
        "Describe the most impactful technical decision you've made in your career.",
        "How do you approach building consensus when senior stakeholders disagree?",
        "Tell me about a time you had to rebuild trust after a major failure.",
        "How do you balance innovation with stability in systems you own?",
    ],
};

function getFallbackQuestions(role, difficulty) {
    const roleQuestions = FALLBACK_QUESTIONS[role] || {};
    const questions = roleQuestions[difficulty] || DEFAULT_QUESTIONS[difficulty] || DEFAULT_QUESTIONS['Mid'];
    return [...questions].sort(() => Math.random() - 0.5);
}

// ─── Smart fallback analysis ───────────────────────────────────────────────
// These functions actually read the content of both question AND answer to
// produce accurate, specific feedback — not generic word-count bucketing.

/**
 * Extract keywords from the question that the answer should address.
 */
function extractQuestionKeywords(question) {
    const q = question.toLowerCase();

    // Technical domain keywords grouped by topic
    const topics = {
        system_design: ['design', 'architect', 'scalab', 'distribut', 'microservice', 'api', 'database', 'cache', 'queue', 'load balanc'],
        algorithms: ['big o', 'complexity', 'algorithm', 'sort', 'search', 'tree', 'graph', 'dynamic programming', 'recursion'],
        oop: ['object', 'class', 'inherit', 'polymorphism', 'encapsulat', 'abstraction', 'interface'],
        databases: ['sql', 'nosql', 'database', 'query', 'index', 'transaction', 'schema', 'relational'],
        behavioral: ['time when', 'tell me about', 'describe a time', 'example of', 'situation where', 'experience with'],
        leadership: ['led', 'team', 'mentor', 'manage', 'stakeholder', 'cross-functional', 'influence'],
        tradeoffs: ['trade-off', 'pros and cons', 'when would you', 'difference between', 'compare', 'vs'],
        technical_decision: ['decision', 'approach', 'solve', 'implement', 'choose', 'why'],
        metrics: ['measure', 'metric', 'kpi', 'success', 'improve', 'impact', 'result'],
    };

    const matched = [];
    for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(kw => q.includes(kw))) matched.push(topic);
    }
    return matched;
}

/**
 * Returns true if the answer is a non-answer (blank, too short, or an "I don't know" variant).
 */
function isTrivialAnswer(answer) {
    const a = answer.trim().toLowerCase();
    const wordCount = a.split(/\s+/).filter(Boolean).length;
    if (wordCount < 8) return true;
    const nonAnswerPatterns = [
        /^i (don'?t|do not) know/,
        /^(no idea|not sure|unsure|idk|i have no idea)/,
        /^i (can'?t|cannot) answer/,
        /^(pass|skip|next question)/,
        /^i'?m not sure (how to answer|what to say|about this)/,
        /^(i haven'?t|i have not) (done|used|worked|learned|studied)/,
    ];
    return nonAnswerPatterns.some(p => p.test(a));
}

/**
 * Score how well the answer addresses the question by checking keyword overlap,
 * specificity signals, and structural completeness.
 */
function analyzeAnswerContent(question, answer) {
    // ── Trivial / non-answer detection ─────────────────────────────────────
    if (isTrivialAnswer(answer)) {
        const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
        return {
            relevance: 1, clarity: 1, depth: 1, structure: 1, confidence: 1,
            feedback: wordCount < 3
                ? 'No answer was provided. In a real interview you must always attempt to answer — explain what you do know and how you would work towards the solution.'
                : "This response doesn't address the question. Simply saying \"I don't know\" is not acceptable in an interview. Show partial knowledge: explain related concepts, describe your thought process, or ask a clarifying question to narrow the problem.",
        };
    }

    const q = question.toLowerCase();
    const a = answer.toLowerCase();
    const words = answer.trim().split(/\s+/);
    const wordCount = words.length;
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const questionTopics = extractQuestionKeywords(question);

    // ── Relevance ──────────────────────────────────────────────────────────
    // Pull key nouns from the question and check if answer addresses them
    const qWords = q.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 4);
    const aWords = new Set(a.replace(/[^a-z0-9 ]/g, '').split(/\s+/));
    const overlapRatio = qWords.filter(w => aWords.has(w)).length / Math.max(qWords.length, 1);

    // Check if answer directly addresses what was asked
    const directAddressSignals = [
        q.includes('design') && (a.includes('design') || a.includes('architect') || a.includes('service') || a.includes('component') || a.includes('system')),
        q.includes('difference') && (a.includes('whereas') || a.includes('unlike') || a.includes('on the other hand') || a.includes('while') || a.includes('however')),
        q.includes('when') && (a.includes('when') || a.includes('situation') || a.includes('case') || a.includes('scenario')),
        q.includes('why') && (a.includes('because') || a.includes('reason') || a.includes('since') || a.includes('due to')),
        q.includes('how') && (a.includes('first') || a.includes('then') || a.includes('step') || a.includes('approach') || a.includes('process')),
        q.includes('trade-off') && (a.includes('tradeoff') || a.includes('trade-off') || a.includes('advantage') || a.includes('disadvantage') || a.includes('however') || a.includes('but')),
    ].filter(Boolean).length;

    // ── Off-topic detection ────────────────────────────────────────────────
    // If the answer is long enough but has absolutely zero overlap with the question's core concepts
    if (wordCount >= 8 && overlapRatio === 0 && directAddressSignals === 0) {
        return {
            relevance: 1, clarity: 1, depth: 1, structure: 1, confidence: 1,
            feedback: "This answer appears to be completely unrelated to the question asked. Make sure you are actively listening to the prompt and addressing the specific technical or behavioral scenario presented.",
        };
    }

    let relevanceScore = Math.round(3 + (overlapRatio * 4) + (directAddressSignals * 0.8));
    relevanceScore = Math.min(10, Math.max(2, relevanceScore));

    // ── Depth ──────────────────────────────────────────────────────────────
    // Signals of depth: specific technologies, numbers, examples, reasoning
    const depthSignals = [
        /\d+/.test(answer),                                          // contains numbers/metrics
        /%|ms|kb|mb|gb|tb|rpm|qps|tps/.test(a),                   // technical measurements
        /for example|for instance|such as|e\.g\.|specifically/i.test(answer), // examples given
        /because|since|therefore|as a result|which means|this allows/.test(a), // reasoning
        /we used|i used|implemented|built|deployed|configured/.test(a),         // concrete experience
        a.includes('redis') || a.includes('kafka') || a.includes('postgres') ||
            a.includes('mysql') || a.includes('mongodb') || a.includes('kubernetes') ||
            a.includes('docker') || a.includes('aws') || a.includes('react') ||
            a.includes('node') || a.includes('python') || a.includes('java'),   // specific tech
        wordCount > 80,          // sufficient length
        wordCount > 150,         // extra credit for detailed answers
        sentences.length >= 4,   // multiple points made
    ].filter(Boolean).length;

    let depthScore = Math.round(2 + depthSignals * 0.9);
    depthScore = Math.min(10, Math.max(1, depthScore));

    // ── Clarity ───────────────────────────────────────────────────────────
    // Check: sentences not too long, logical connectors, no run-ons
    const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1);
    const hasLogicalFlow = /first|second|then|next|finally|also|additionally|however|moreover|in summary/.test(a);
    const hasConcreteNouns = /team|project|system|code|feature|user|data|service|component|approach/.test(a);

    let clarityScore = 5;
    if (avgWordsPerSentence < 10) clarityScore -= 1;  // too choppy
    if (avgWordsPerSentence > 35) clarityScore -= 2;  // run-on risk
    if (avgWordsPerSentence >= 12 && avgWordsPerSentence <= 25) clarityScore += 2;
    if (hasLogicalFlow) clarityScore += 2;
    if (hasConcreteNouns) clarityScore += 1;
    if (wordCount < 20) clarityScore -= 2;
    clarityScore = Math.min(10, Math.max(1, clarityScore));

    // ── Structure ─────────────────────────────────────────────────────────
    const hasOpening = /i would|i have|in my|the key|one of|when i|my approach|to answer/.test(a.substring(0, 100));
    const hasClosing = /in conclusion|overall|in summary|to summarize|ultimately|the result/.test(a);
    const hasMultiplePoints = sentences.length >= 3;
    const usesNumbering = /first(ly)?|second(ly)?|third(ly)?|1\.|2\.|3\./.test(a);
    const usesBulletThinking = /on one hand|on the other|however|but also|additionally/.test(a);

    let structureScore = 3
        + (hasOpening ? 2 : 0)
        + (hasClosing ? 1 : 0)
        + (hasMultiplePoints ? 2 : 0)
        + (usesNumbering ? 1 : 0)
        + (usesBulletThinking ? 1 : 0);
    structureScore = Math.min(10, Math.max(1, structureScore));

    // ── Confidence ────────────────────────────────────────────────────────
    const fillerPatterns = /\b(um|uh|like|you know|sort of|kind of|i guess|i think maybe|basically just)\b/gi;
    const hedgePatterns = /\b(maybe|perhaps|not sure|might be|could be|i think|i believe|possibly|probably|kinda)\b/gi;
    const assertivePatterns = /\b(i built|i designed|i led|i implemented|we achieved|i solved|i improved|resulted in)\b/gi;

    const fillerCount = (answer.match(fillerPatterns) || []).length;
    const hedgeCount = (answer.match(hedgePatterns) || []).length;
    const assertiveCount = (answer.match(assertivePatterns) || []).length;

    let confidenceScore = 6 - fillerCount - Math.max(0, hedgeCount - 1) + assertiveCount;
    if (wordCount < 20) confidenceScore -= 2;
    confidenceScore = Math.min(10, Math.max(1, confidenceScore));

    // ── Build specific, actionable feedback ──────────────────────────────
    const feedbackParts = [];

    // Strengths first
    const strengths = [];
    if (depthScore >= 7) strengths.push("strong technical depth with specific details");
    if (clarityScore >= 7) strengths.push("clear and well-structured communication");
    if (relevanceScore >= 7) strengths.push("directly addresses what was asked");
    if (assertiveCount >= 2) strengths.push("confident, active language");
    if (strengths.length > 0) feedbackParts.push(`Strengths: ${strengths.join(', ')}.`);

    // What's missing / how to improve
    const improvements = [];
    if (relevanceScore < 6) {
        if (q.includes('design')) improvements.push("walk through your architecture decisions more explicitly — mention components, data flow, and scalability trade-offs");
        else if (q.includes('difference')) improvements.push("make the comparison more explicit by contrasting the approaches side-by-side");
        else if (q.includes('trade-off')) improvements.push("explicitly state the advantages and disadvantages of each option you considered");
        else improvements.push("make sure you're directly answering what was asked — re-read the question and address each part");
    }
    if (depthScore < 6) {
        if (questionTopics.includes('system_design')) improvements.push("name specific technologies (e.g., Redis for caching, Kafka for queuing) and explain why you chose them");
        else if (questionTopics.includes('behavioral')) improvements.push("add concrete details — what your specific role was, what actions you took, and what the measurable outcome was");
        else improvements.push("add specific examples, numbers, or technologies to demonstrate hands-on experience");
    }
    if (structureScore < 5) improvements.push("organize with a clear opening (state your approach), body (key points), and closing (outcome/summary)");
    if (hedgeCount > 2) improvements.push("replace hedging phrases like 'I think maybe' with direct statements — say 'I did X' not 'I might have done something like X'");
    if (!(/\d+/.test(answer)) && wordCount > 30) improvements.push("quantify your impact — add metrics like '30% reduction in latency' or 'team of 5 engineers'");

    if (improvements.length > 0) {
        feedbackParts.push(`To improve: ${improvements[0]}${improvements[1] ? ` Also, ${improvements[1].toLowerCase()}` : ''}.`);
    }

    if (feedbackParts.length === 0) {
        feedbackParts.push("Solid answer. Focus on tying your experience to specific, measurable outcomes to make it memorable for interviewers.");
    }

    return {
        relevance: relevanceScore,
        clarity: clarityScore,
        depth: depthScore,
        structure: structureScore,
        confidence: confidenceScore,
        feedback: feedbackParts.join(' '),
        _meta: { wordCount, questionTopics, fillerCount, hedgeCount, assertiveCount },
    };
}

/**
 * Accurate STAR analysis using temporal markers, role indicators, action verbs, and outcome language.
 */
function analyzeSTARContent(question, answer) {
    // Trivial answer — no STAR elements possible
    if (isTrivialAnswer(answer)) {
        return {
            situation: 0, task: 0, action: 0, result: 0,
            tips: 'Your answer contained no substantive content. For behavioral questions, use STAR: set the Situation, state your Task, detail the Actions you took, then share the measurable Result. Even a partial attempt is far better than no answer.',
        };
    }

    const a = answer.toLowerCase();

    // Situation: past tense context-setting, time/place markers
    const situationSignals = [
        /\b(at my (previous|last|former|current) (job|company|role|position))\b/.test(a),
        /\b(when i was|while working|during (my time|a project|the project|our sprint))\b/.test(a),
        /\b(we (had|were|faced|encountered|were dealing with))\b/.test(a),
        /\b(the (company|team|project|system) (was|had|needed))\b/.test(a),
        /\b(last year|a year ago|in \d{4}|recently|a few months ago)\b/.test(a),
    ].filter(Boolean).length;

    // Task: responsibility, ownership, goal
    const taskSignals = [
        /\b(i was (responsible|tasked|asked|assigned|in charge))\b/.test(a),
        /\b(my (role|responsibility|goal|objective|task) was)\b/.test(a),
        /\b(needed to|had to|was supposed to|my job was to)\b/.test(a),
        /\b(the (goal|objective|challenge|problem) was)\b/.test(a),
    ].filter(Boolean).length;

    // Action: first-person active verbs
    const actionSignals = [
        /\b(i (built|created|designed|implemented|developed|wrote|refactored|optimized|migrated|led|coordinated|analyzed|investigated|fixed|resolved|introduced|established))\b/.test(a),
        /\b(i (decided to|chose to|started|began|worked on|collaborated|reached out|proposed|suggested|set up))\b/.test(a),
        /\b(first(ly)?[,.]? i|then i|next i|after that i|i then|i also)\b/.test(a),
        /\b(my (approach|solution|strategy|plan) was)\b/.test(a),
    ].filter(Boolean).length;

    // Result: outcomes, impact, measurements
    const resultSignals = [
        /\b(as a result|the result was|this (led to|resulted in|helped|improved|reduced|increased|achieved))\b/.test(a),
        /\b(we (achieved|improved|reduced|increased|delivered|shipped|saved|grew|decreased|resolved))\b/.test(a),
        /\b(\d+\s*(%|percent|x|times|hours|days|ms|seconds|users|customers))\b/.test(a),
        /\b(the (outcome|impact|effect|benefit|improvement) was)\b/.test(a),
        /\b(successfully|ultimately|in the end|by the end)\b/.test(a),
    ].filter(Boolean).length;

    const score = (signals, max) => Math.min(5, Math.round((signals / max) * 5));

    const situation = score(situationSignals, 3);
    const task = score(taskSignals, 2);
    const action = score(actionSignals, 3);
    const result = score(resultSignals, 3);

    // Build targeted tips based on what's weakest
    const weakest = { situation, task, action, result };
    const weakestKey = Object.entries(weakest).sort((a, b) => a[1] - b[1])[0][0];

    const tipsMap = {
        situation: "Your answer lacks context-setting. Start with: 'At my previous company, we faced a situation where...' so the interviewer understands the stakes.",
        task: "Make your personal responsibility clearer. State explicitly: 'My role was to...' or 'I was responsible for...' so the interviewer knows what you owned.",
        action: "Expand on the specific steps you took. Use 'I' as the subject and active verbs: 'I designed the schema, then I implemented the caching layer, then I ran load tests...'.",
        result: "Always close with the outcome. Add: 'As a result, we reduced latency by X%' or 'The team shipped on time and...' — quantified results make answers memorable.",
    };

    return { situation, task, action, result, tips: tipsMap[weakestKey] };
}

/**
 * Confidence analysis that checks actual language patterns in the text.
 */
function analyzeConfidenceContent(answer) {
    // Trivial answer
    if (isTrivialAnswer(answer)) {
        return {
            confidence_score: 1,
            issues: ['No substantive answer was given — this signals an inability to communicate under pressure'],
            suggestions: ['Prepare structured answers for common questions in advance. Even partial knowledge communicated clearly is far better than silence or refusal.'],
        };
    }

    const fillerMap = {
        'um': 'spoken filler — remove it',
        'uh': 'spoken filler — remove it',
        'like': 'overused filler word',
        'you know': 'seeks validation — remove',
        'sort of': 'hedging phrase',
        'kind of': 'hedging phrase',
        'i guess': 'expresses uncertainty',
        'i think maybe': 'double hedge — very weak',
        'basically': 'filler — says nothing specific',
        'literally': 'overused intensifier',
        'actually': 'overused qualifier',
    };

    const hedgeMap = {
        'maybe': 'shows uncertainty',
        'perhaps': 'overly tentative',
        'not sure': 'admits unprepared',
        'i think': 'weakens statement',
        'i believe': 'weakens statement',
        'possibly': 'vague',
        'probably': 'not confident',
        'might': 'non-committal',
        'could be': 'non-committal',
        'something like': 'vague and imprecise',
    };

    const a = answer.toLowerCase();
    const foundFillers = Object.keys(fillerMap).filter(f => {
        const re = new RegExp(`\\b${f.replace(/\s+/, '\\s+')}\\b`, 'g');
        return re.test(a);
    });
    const foundHedges = Object.keys(hedgeMap).filter(h => {
        const re = new RegExp(`\\b${h.replace(/\s+/, '\\s+')}\\b`, 'g');
        return re.test(a);
    });

    const assertiveCount = (answer.match(/\b(i built|i designed|i led|i implemented|we achieved|i solved|i improved|i delivered|i created|i drove|resulted in|increased|decreased|reduced|improved by)\b/gi) || []).length;
    const hasMetrics = /\d+\s*(%|x|times|percent|ms|seconds|users|engineers|days|weeks)/.test(a);

    const issues = [];
    const suggestions = [];

    if (foundFillers.length > 0) {
        issues.push(`Filler words found: "${foundFillers.join('", "')}" — these dilute your message`);
        suggestions.push("Practice pausing instead of filling silence. Record yourself and count these words — awareness is the first step.");
    }
    if (foundHedges.length > 2) {
        issues.push(`Heavy use of hedging language: "${foundHedges.slice(0, 3).join('", "')}" — signals low confidence`);
        suggestions.push("Reframe hedges as facts. Instead of 'I think we improved performance', say 'We improved performance by 40% by implementing caching.'");
    }
    if (assertiveCount === 0 && answer.split(/\s+/).length > 25) {
        issues.push("Lack of active first-person ownership — unclear what YOU specifically did vs the team");
        suggestions.push("Use 'I' as the subject: 'I designed the API', 'I led the migration'. Take credit for your work.");
    }
    if (!hasMetrics && answer.split(/\s+/).length > 40) {
        issues.push("No quantified outcomes — answers without numbers are harder to trust and remember");
        suggestions.push("Always attach a number to your impact: timeline, percentage improvement, team size, cost saved, etc.");
    }
    if (foundFillers.length === 0 && foundHedges.length <= 1 && assertiveCount > 0) {
        issues.push("No major confidence issues — language is direct and professional");
        if (hasMetrics) {
            suggestions.push("Excellent use of metrics. Continue quantifying your impact in every answer.");
        } else {
            suggestions.push("Add specific numbers to make your achievements more concrete and credible.");
        }
    }

    const rawScore = 8 - foundFillers.length * 1.5 - Math.max(0, foundHedges.length - 1) + assertiveCount * 0.7 + (hasMetrics ? 1 : 0);
    const confidence_score = Math.round(Math.min(10, Math.max(2, rawScore)));

    return { confidence_score, issues, suggestions };
}

// ─── HuggingFace AI call with retry + fallback ─────────────────────────────

let aiRateLimited = false

async function callAI(prompt, retries = 3) {
  const apiKey = process.env.HF_API_KEY

  if (!apiKey || aiRateLimited) return null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        HF_MODEL,
        {
          inputs: prompt,
          parameters: {
            temperature: 0.4,
            max_new_tokens: 1000
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 60000
        }
      )

      let text = response.data?.[0]?.generated_text || ""

      text = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim()

      const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)

      if (!jsonMatch) {
        console.error("[AI Raw Response]", text.substring(0, 300))
        return null
      }

      return JSON.parse(jsonMatch[0])
    } catch (err) {
      const status = err.response?.status

      if (status === 503 || status === 429) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 2000
          console.warn(`[AI] Rate limited. Retrying in ${delay}ms`)
          await sleep(delay)
          continue
        }

        console.warn("[AI] API unavailable, switching to fallback mode")
        aiRateLimited = true
        return null
      }

      console.error("[AI Error]", err.message)
      return null
    }
  }

  return null
}

// ─── Public service functions ─────────────────────────────────────────────

async function generateQuestions(role, difficulty) {
    const prompt = `You are a strict, senior technical interviewer at a top tech company. Generate exactly 5 interview questions specifically and exclusively for a "${role}" position at the "${difficulty}" level.

CRITICAL INSTRUCTION: All generated questions MUST be highly relevant to the specific domain, tools, and daily tasks of a "${role}". Do NOT ask generic programming or generic behavioral questions unless they are framed specifically around scenarios a ${role} would realistically face.

Requirements:
- 3 deep technical questions highly specific to ${role} technologies, system design, or domain-specific problem solving.
- 2 behavioral questions using "Tell me about a time..." format, framed entirely around situations a ${role} would encounter.
- Questions should be challenging but fair for ${difficulty} level.
- Make questions open-ended and scenario-based.

Return ONLY this exact JSON, no markdown, no explanation:
{"questions": ["question1","question2","question3","question4","question5"]}`;

    const result = await callAI(prompt);
    if (result && Array.isArray(result.questions) && result.questions.length > 0) return result;

    console.log('[AI Fallback] Using curated questions for', role, difficulty);
    return { questions: getFallbackQuestions(role, difficulty), _fallback: true };
}

async function evaluateAnswer(question, answer) {
    // Hybrid Architecture: Evaluation is handled entirely by the robust Local Evaluation Engine.
    // This reduces AI dependency, lowers latency, and ensures consistent grading logic.
    return analyzeAnswerContent(question, answer);
}

async function analyzeSTAR(question, answer) {
    // Hybrid Architecture: STAR component breakdown is parsed purely via the
    // Local Evaluation Engine utilizing regex temporal and role markers.
    return analyzeSTARContent(question, answer);
}

async function analyzeConfidence(answer) {
    // Hybrid Architecture: Confidence is scored logically via the Local Engine
    // by evaluating filler words, hedging phrases, assertive counts, and metrics.
    return analyzeConfidenceContent(answer);
}

async function generateFollowUp(question, answer) {
    // Contextual deterministic follow-ups based on question content
    const q = question.toLowerCase();
    const followUps = q.includes('design') || q.includes('architect')
        ? ["How would you handle a 10x spike in traffic, and what would be the first component to fail under that load?",
            "What monitoring and alerting would you put in place, and how would you detect issues before users notice?",
            "Walk me through exactly how data flows from the user's request to the database and back."]
        : q.includes('time when') || q.includes('tell me about') || q.includes('describe a')
            ? ["What would you do differently if you faced that same situation today?",
                "What was the biggest risk in that approach, and how did you mitigate it?",
                "How did you measure whether the outcome was truly successful?"]
            : ["Can you walk me through a specific implementation detail that was particularly tricky?",
                "What trade-offs did you make, and what did you have to sacrifice to get there?",
                "What would break first if the requirements doubled in scale?"];

    return { follow_up: followUps[Math.floor(Math.random() * followUps.length)] };
}

async function generateNextQuestion(role, difficulty, prevQuestion, prevAnswer, score) {
    const prompt = `You are conducting a live, role-specific adaptive interview for a "${role}" position.

CRITICAL INSTRUCTION: The next question MUST be highly relevant to the specific domain and daily tasks of a "${role}". Do NOT ask generic questions.

PREVIOUS QUESTION: ${prevQuestion}
CANDIDATE'S ANSWER: ${prevAnswer}
SCORE: ${score}/10

Rules for next question:
- Score > 7: Go harder — deeper technical follow-up or a new harder topic specifically related to being a ${role}.
- Score 4-7: Same level — different technical or behavioral topic area intrinsic to the ${role} role.
- Score < 4: Ease up — simpler core concept question for a ${role}.

Do NOT repeat the same topic as the previous question.
Make it a fresh, standalone question (not "following up on...").

Return ONLY this JSON, no markdown:
{"question":"..."}`;

    const result = await callAI(prompt);
    if (result && result.question) return result;

    const effectiveDiff = score > 7 ? 'Senior' : score < 4 ? 'Junior' : difficulty;
    const pool = getFallbackQuestions(role, effectiveDiff);
    const question = pool[Math.floor(Math.random() * pool.length)];
    return { question, _fallback: true };
}

// ─── Course, MCQ, and Coding Challenge Generation ─────────────────────────

async function generateCourse(topic, difficulty) {
    const prompt = `You are an expert technical curriculum designer. The user wants to generate a course on the topic "${topic}" at a "${difficulty}" level.
    
CRITICAL VALIDATION: First, evaluate if "${topic}" is a valid educational, technical, or professional topic. If the topic is complete gibberish (e.g., "adjasdl"), a greeting ("hello"), or inappropriate/completely irrelevant for a learning platform, you MUST reject it.
If rejecting, return exactly this JSON:
{"error": "Invalid topic. Please provide a relevant technical or professional subject."}

If the topic IS valid, create a course broken down into 3-5 modules (materials). For each module, provide a title and detailed markdown content (at least 300 words per module explaining the concepts clearly with examples).

Return ONLY this exact JSON, no markdown, no explanation:
{
  "title": "Course Title",
  "materials": [
    {
      "title": "Module 1 Title",
      "content_markdown": "Detailed markdown content..."
    }
  ]
}`;

    const result = await callAI(prompt);
    if (result && result.materials && result.materials.length > 0) return result;

    return {
        _fallback: true,
        title: `${topic} Course`,
        materials: [
            {
                title: "Introduction",
                content_markdown: "This is a fallback generated course material due to AI unavailability. Please try again later."
            }
        ]
    };
}

async function generateMCQs(courseTitle, materialsSummary) {
    const prompt = `You are an expert technical assessor. Based on the following course, generate exactly 5 multiple-choice questions (MCQs) that test the user's understanding.

Course Title: ${courseTitle}
Course Materials Summary (or topics covered): ${materialsSummary}

Requirements:
- Each question must have exactly 4 options.
- Only one option should be correct.
- Provide a brief explanation for why the correct answer is correct.

Return ONLY this exact JSON, no markdown, no explanation:
{
  "mcqs": [
    {
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Option A is correct because..."
    }
  ]
}`;

    const result = await callAI(prompt);
    if (result && result.mcqs && result.mcqs.length === 5) return result;

    return {
        _fallback: true,
        mcqs: []
    };
}

async function generateCodingChallenge(topic, language) {
    const prompt = `You are an expert competitive programming platform creator (like HackerRank). Generate a coding challenge for the topic "${topic}" to be solved in "${language}".

Requirements:
- A clear 'title'.
- A 'problem_statement' describing the task, input format, output format, and constraints in markdown.
- 'starter_code' in the requested language with a function signature ready to be completed.
- 3-5 'test_cases' including hidden edge cases. Each test case should have 'input' and 'expected_output' as strings.

Return ONLY this exact JSON, no markdown, no explanation:
{
  "title": "Problem Title",
  "problem_statement": "Description...",
  "language": "${language}",
  "starter_code": "def solve(x):\\n    pass",
  "test_cases": [
    {
      "input": "1 2",
      "expected_output": "3"
    }
  ]
}`;

    const result = await callAI(prompt, 2);
    if (result && result.title && result.starter_code) return result;

    return {
        _fallback: true,
        title: "System Design Challenge (Fallback)",
        problem_statement: "### AI Service Unavailable\n\nOur AI evaluation servers are currently at capacity or experiencing an API key issue.\n\nWhile we reconnect, try this fallback exercise:\n\n**Task**: Write a function that prints 'Hello World' to the console, or simply return true to continue.\n\n*Note: Code evaluation via the 'Run Code' button will also be mocked during this fallback state.*",
        language: language,
        starter_code: "// The AI API is currently unreachable.\n// Write a simple hello world or return true.\n\nfunction solve() {\n    return true;\n}",
        test_cases: []
    };
}

async function evaluateCodeSnippet(problem_statement, language, user_code) {
    const prompt = `You are an expert AI code evaluator and compiler. Evaluate the following user code submitted for a coding challenge.

PROBLEM STATEMENT:
${problem_statement}

LANGUAGE: ${language}

USER CODE:
${user_code}

Task:
1. Act as a compiler/interpreter. Determine if the code has syntax errors.
2. Mentally run the code against standard test cases and edge cases implied by the problem. 
3. Does the code correctly solve the problem?
4. What is the time and space complexity?
5. Provide actionable feedback.

Return ONLY this exact JSON, no markdown, no explanation:
{
  "passed": true/false,
  "feedback": "Detailed feedback explaining what failed or what was good...",
  "time_complexity": "O(N)",
  "space_complexity": "O(1)"
}`;

    const result = await callAI(prompt, 1);
    if (result && typeof result.passed === 'boolean') return result;

    // When AI is unreachable, apply a simple static mock evaluation
    const lcCode = user_code.toLowerCase();
    const isMockPass = lcCode.includes('return true') || lcCode.includes('hello world');
    
    if (isMockPass) {
        return {
             _fallback: true,
             passed: true,
             feedback: "You successfully completed the fallback challenge. Great job returning true or writing hello world! Your progress has been saved.",
             time_complexity: "O(1)",
             space_complexity: "O(1)"
        };
    }
    
    return {
        _fallback: true,
        passed: false,
        feedback: "Could not evaluate custom logic due to AI service unavailability. To pass this fallback challenge, simply write `return true;` or `console.log('Hello World');`.",
        time_complexity: "Unknown",
        space_complexity: "Unknown"
    };
}

module.exports = {
    generateQuestions,
    evaluateAnswer,
    analyzeSTAR,
    analyzeConfidence,
    generateFollowUp,
    generateNextQuestion,
    generateCourse,
    generateMCQs,
    generateCodingChallenge,
    evaluateCodeSnippet
};
