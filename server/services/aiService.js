const axios = require("axios")

const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions"
const HF_MODEL = process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct"

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Fallback question bank ────────────────────────────────────────────────
const FALLBACK_QUESTIONS = {
    'Software Engineer': {
        Junior: [
            "Explain the difference between a stack and a queue with a real-world example of each.",
            "What is Big O notation? Analyse the time complexity of a linear search vs binary search.",
            "Describe the four OOP pillars — encapsulation, inheritance, polymorphism, abstraction — with code examples.",
            "Tell me about a software project you built. What was the most difficult bug you encountered and how did you fix it?",
            "A user reports your web app is slow. Walk me through how you would identify and fix the performance bottleneck.",
        ],
        Mid: [
            "Design a URL shortening service like bit.ly — walk through data model, hashing strategy, and collision handling.",
            "Explain the CAP theorem. How does it govern design decisions in a distributed system you've worked on?",
            "Compare SQL and NoSQL databases: when would you choose PostgreSQL over MongoDB, and vice versa?",
            "Describe a time you had to refactor a module with poor test coverage. How did you approach it safely?",
            "How do you prevent regressions in a codebase shared by 10+ engineers? Describe your code review and testing strategy.",
        ],
        Senior: [
            "How would you design a real-time collaborative document editing system like Google Docs, handling concurrent edits and conflict resolution?",
            "Explain the SAGA pattern for distributed transactions. How does it differ from 2-phase commit and when do you prefer each?",
            "Your service handles 1,000 RPS today but needs to handle 10,000 RPS in 6 months. Walk me through your capacity planning.",
            "Describe a major architectural change you led (e.g., monolith to microservices). What decision would you make differently?",
            "How do you decide when to pay off technical debt versus shipping a new feature? Give a concrete example from your career.",
        ],
    },
    'Frontend Developer': {
        Junior: [
            "Explain the difference between CSS Flexbox and CSS Grid. Give me a concrete use case where you'd pick each.",
            "What is the virtual DOM in React? How does React's diffing algorithm minimise actual DOM updates?",
            "How does event delegation work in JavaScript? Why is it more efficient than attaching listeners to each element?",
            "Tell me about a UI component you built from scratch. What accessibility (ARIA) considerations did you include?",
            "What is the difference between `let`, `const`, and `var`? Describe a bug caused by `var` hoisting and how you fixed it.",
        ],
        Mid: [
            "A React list with 10,000 items is causing frame drops. Walk through three concrete techniques to fix the render performance.",
            "Explain the browser's rendering pipeline from HTML parsing through to paint and composite. Where are the most common bottlenecks?",
            "How do you manage complex client-side state in a large React app? Compare Context API, Redux Toolkit, and Zustand.",
            "Describe a cross-browser layout or rendering bug you debugged. What was the root cause and how did you fix it?",
            "How do you audit and improve the accessibility of an existing React application to meet WCAG 2.1 AA?",
        ],
        Senior: [
            "How would you architect a micro-frontend system for a 200-person engineering org where 5 teams own different parts of the UI?",
            "Explain Core Web Vitals (LCP, FID/INP, CLS). Walk through the specific changes you'd make to improve each metric on a content-heavy site.",
            "How do you design and maintain a shared component library used by 10+ product teams without becoming a bottleneck?",
            "You've been asked to modernise a legacy jQuery monolith to React without a full rewrite. How do you approach this incrementally?",
            "How do you enforce frontend performance budgets (bundle size, LCP targets) in a CI/CD pipeline and alert when they regress?",
        ],
    },
    'Backend Developer': {
        Junior: [
            "Compare REST and GraphQL APIs. Describe a scenario where GraphQL's query flexibility is worth the extra complexity.",
            "Explain how a B-tree database index works internally. When does adding an index hurt write performance?",
            "What does middleware do in Express.js (or your framework)? Give an example of custom middleware you've written.",
            "Walk me through an API endpoint you designed — how did you handle authentication, input validation, and error responses?",
            "What is the event loop in Node.js? How does async/await prevent blocking it?",
        ],
        Mid: [
            "Design a rate-limiting system for a REST API that serves 1 million requests per day. How do you handle distributed instances?",
            "Explain the N+1 query problem in ORMs. How do you detect it with query logging and solve it with eager loading or batching?",
            "How do you safely run a schema migration on a 500 GB PostgreSQL table in production without locking the table?",
            "You get a PagerDuty alert: an API endpoint's p99 latency jumped from 80ms to 4 seconds. Walk through your diagnosis process.",
            "What makes an API endpoint truly idempotent? Design an order-creation endpoint that is safe to retry.",
        ],
        Senior: [
            "Design a multi-tenant SaaS backend for a B2B product. How do you isolate data between tenants at the database and caching layers?",
            "How do you implement distributed tracing across 15 microservices so you can reconstruct a full request trace from any service?",
            "Your PostgreSQL table is at 500 million rows and growing 10% per month. Walk through your sharding strategy.",
            "Describe a production incident you owned end-to-end. What was the root cause, blast radius, and what did you change after?",
            "How do you architect a reliable job queue with exactly-once delivery guarantees and dead-letter handling?",
        ],
    },
    'Data Scientist': {
        Junior: [
            "What is the difference between supervised, unsupervised, and reinforcement learning? Give a real application of each.",
            "Your model has 98% training accuracy but 60% validation accuracy. Diagnose the problem and describe three ways to fix it.",
            "A key dataset feature has 30% missing values. Walk through your decision process for handling them.",
            "Walk me through a data analysis project you completed: the dataset, your approach, the insights, and the business impact.",
            "When would you use precision over recall as your primary metric? Give a medical or fraud detection example.",
        ],
        Mid: [
            "Explain the bias-variance tradeoff. Give an example from your own work where you had to tune a model to find the right balance.",
            "Design a recommendation system for an e-commerce site with 10 million users, including how you handle cold-start users.",
            "Compare XGBoost and Random Forest: how do they differ in how they build trees and reduce error?",
            "You deployed a churn prediction model 6 months ago. Its AUC dropped from 0.85 to 0.72. What do you investigate first?",
            "A senior VP asks why your model predicts customer churn. How do you explain the drivers using SHAP or LIME?",
        ],
        Senior: [
            "Design an A/B testing framework from scratch for a product with 50 million daily users, including sample size calculation and CUPED variance reduction.",
            "Explain how you would use propensity score matching or instrumental variables to estimate a causal effect from observational data.",
            "How do you build and prioritise a 12-month data science roadmap that directly maps to company OKRs?",
            "Walk me through the biggest data science project failure you've experienced. What went wrong and how did you change your process?",
            "Design a real-time ML inference pipeline: streaming features, model serving, and rollback strategy at 100,000 RPS.",
        ],
    },
    'Product Manager': {
        Junior: [
            "You have 20 feature requests and can only build 3 this quarter. Walk through the prioritisation framework you'd use.",
            "How would you design and conduct user research to validate that a problem is worth solving before committing engineering resources?",
            "What metrics would you use to measure success for a redesigned onboarding flow, and how would you structure an experiment?",
            "Pick a product you use every day. Identify one specific usability problem and describe exactly what you would ship to fix it.",
            "A key stakeholder wants a feature you believe won't move the needle. How do you handle that conversation?",
        ],
        Mid: [
            "How do you measure product-market fit for a B2B SaaS product? What leading and lagging indicators matter most?",
            "Walk me through how you built a product roadmap when engineering, sales, and customers all wanted different things.",
            "Engineering estimates a feature at 6 weeks; the CEO wants it in 2. How do you navigate this and what do you cut?",
            "Tell me about a product launch that missed its goals. What did you learn and how did you change your process?",
            "How do you use data and qualitative research together to make a pricing change decision?",
        ],
        Senior: [
            "How would you build a 3-year platform strategy for a company with 8 separate product lines serving different customer segments?",
            "You need to hire and grow a PM team from 2 to 12 people over 18 months. How do you structure interviews, levelling, and onboarding?",
            "One of your products has 5,000 active users but is strategically misaligned and losing money. How do you decide what to do with it?",
            "Describe a time you had to pivot major product direction due to a competitive threat or market shift. How did you manage the change?",
            "How do you build products that serve enterprise buyers and end users whose needs are fundamentally in conflict?",
        ],
    },
    'UI/UX Designer': {
        Junior: [
            "Walk me through your design process from initial brief to final handoff to engineering.",
            "What is the difference between UX research and usability testing? When would you use a user interview vs. a usability test?",
            "How do you design for accessibility? Walk through three specific changes you'd make to improve a form's WCAG AA compliance.",
            "Show me or describe a design you're most proud of. What problem did it solve and how did you validate it with users?",
            "A developer says your design is too complex to implement as spec'd in the sprint. How do you respond and what do you do?",
        ],
        Mid: [
            "How do you maintain visual and interaction consistency across a product when 5 different designers are working on it simultaneously?",
            "Walk me through how you built or significantly contributed to a design system. What were the hardest component or token decisions?",
            "A feature shipped 6 months ago. How do you measure whether the UX change actually improved the metric it was targeting?",
            "Tell me about a time you advocated for a user need that directly conflicted with a business or engineering constraint.",
            "How do you design a single interface that must work in English, Arabic (RTL), and Japanese (CJK) without breaking the layout?",
        ],
        Senior: [
            "How would you set up and govern a design system used by 20+ product teams, including contribution processes and breaking-change policy?",
            "You're the first UX designer at a startup. How do you build a user research function from zero, earning trust with a sceptical engineering-led culture?",
            "Describe how you've shaped or changed design culture at an organisation. What resistance did you encounter and how did you overcome it?",
            "How do you maintain design rigour and quality when shipping in 2-week sprints under constant business pressure?",
            "Walk me through a high-stakes design decision where you used quantitative data and qualitative research together.",
        ],
    },
    'DevOps Engineer': {
        Junior: [
            "What is the key difference between Docker containers and virtual machines? When would you choose one over the other?",
            "Describe each stage of a CI/CD pipeline — what happens at build, test, and deploy, and what tools have you used?",
            "What does Kubernetes do when a pod crashes? Explain liveness probes, readiness probes, and restart policies.",
            "Walk me through a deployment you've done — how did you verify it succeeded and what was your rollback plan?",
            "What is Infrastructure as Code? Describe a Terraform or Ansible resource you've written and why IaC matters.",
        ],
        Mid: [
            "Design a zero-downtime blue-green deployment strategy for a web service that processes payments. How do you handle session state during cutover?",
            "How do you centralise logging and distributed tracing across 20 microservices? What tools and data retention strategy would you use?",
            "Walk me through how you would securely store and rotate secrets (API keys, DB passwords) in a Kubernetes cluster.",
            "Describe a production outage you diagnosed. What monitoring or alerting failed to catch it early and what did you add afterward?",
            "How do you integrate SAST, container image scanning, and dependency auditing into a CI pipeline without blocking developers?",
        ],
        Senior: [
            "Design a multi-region active-active infrastructure on AWS for a product with a 99.99% uptime SLA. How do you handle data replication and failover?",
            "Explain your strategy for Kubernetes cluster autoscaling (HPA, VPA, Cluster Autoscaler) and how you continuously optimise cloud costs.",
            "How do you design a disaster recovery plan for a stateful PostgreSQL service with an RTO of 15 minutes and RPO of 5 minutes?",
            "Describe a large infrastructure migration you led (e.g., on-prem to cloud, or monolith to containers). What was the biggest risk you mitigated?",
            "How do you introduce an SRE culture with error budgets and SLOs to an engineering team that has never had formal reliability practices?",
        ],
    },
    'Machine Learning Engineer': {
        Junior: [
            "How does your day-to-day work differ from a data scientist's? What production problems do you own that a data scientist typically doesn't?",
            "What is training-serving skew? Describe a scenario where it caused a model to perform worse online than it did offline.",
            "Describe two feature transformations you've applied — for example normalisation, target encoding, or time-based features — and why you chose them.",
            "Walk me through an ML project you took from notebook to production. What was the hardest engineering challenge?",
            "Why isn't a simple train-test split always sufficient? Explain k-fold cross-validation and when you'd use stratified vs. time-series splits.",
        ],
        Mid: [
            "Design a feature store for a company running 30 models in production that share overlapping features. How do you handle online vs. offline serving?",
            "Your fraud detection model's precision dropped from 0.91 to 0.74 over three months. What do you investigate first?",
            "A PyTorch inference endpoint takes 500ms. Walk through the techniques you'd use to get it under 50ms for a real-time product feature.",
            "You inherited an ML pipeline with no reproducibility — the same code produces different results each run. How do you fix it systematically?",
            "How do you version datasets, model weights, and experiment configs so that any model in production can be exactly reproduced six months later?",
        ],
        Senior: [
            "Design an end-to-end MLOps platform covering data versioning, experiment tracking, model registry, deployment, and rollback for 50+ models.",
            "Compare full fine-tuning, LoRA, and RLHF for adapting a large language model to a domain-specific task. When do you use each?",
            "Design a real-time personalised recommendation system that updates user embeddings from clickstream events with sub-second recommendation latency.",
            "Describe an ML platform initiative you led that unblocked multiple product teams. What architectural decisions had the most leverage?",
            "How do you detect and mitigate demographic bias in a model that recommends job candidates, given legal fairness requirements?",
        ],
    },
};

const ROLE_QUESTION_RULES = {
    'Software Engineer': {
        keywords: ['system design', 'api', 'database', 'distributed', 'scaling', 'microservice', 'testing', 'refactor', 'performance', 'backend', 'frontend'],
    },
    'Frontend Developer': {
        keywords: ['react', 'javascript', 'typescript', 'css', 'ui', 'ux', 'accessibility', 'browser', 'render', 'performance', 'component', 'design system'],
    },
    'Backend Developer': {
        keywords: ['api', 'database', 'sql', 'queue', 'cache', 'microservice', 'distributed', 'schema', 'latency', 'throughput', 'event loop', 'authentication'],
    },
    'Data Scientist': {
        keywords: ['model', 'experiment', 'feature', 'dataset', 'statistics', 'ab test', 'hypothesis', 'recall', 'precision', 'shap', 'lime', 'analysis'],
    },
    'Product Manager': {
        keywords: ['roadmap', 'stakeholder', 'prioritization', 'onboarding', 'pricing', 'retention', 'launch', 'experiment', 'user research', 'metric', 'kpi', 'product-market fit'],
    },
    'UI/UX Designer': {
        keywords: ['design system', 'usability', 'research', 'prototype', 'accessibility', 'layout', 'interaction', 'visual', 'wireframe', 'handoff', 'wcag', 'user flow'],
    },
    'DevOps Engineer': {
        keywords: ['kubernetes', 'docker', 'ci/cd', 'terraform', 'observability', 'deployment', 'secrets', 'aws', 'slo', 'sre', 'cluster', 'incident'],
    },
    'Machine Learning Engineer': {
        keywords: ['inference', 'feature store', 'training', 'serving', 'mlops', 'pipeline', 'model registry', 'latency', 'embedding', 'drift', 'pytorch', 'reproducibility'],
    },
};

const GENERIC_QUESTION_PATTERNS = [
    /tell me about yourself/i,
    /what are your strengths/i,
    /what are your weaknesses/i,
    /why should we hire you/i,
    /why do you want to work here/i,
    /where do you see yourself/i,
    /what motivates you/i,
    /what is your greatest achievement/i,
    /what is your biggest failure/i,
    /describe yourself in/i,
];

const BEHAVIORAL_QUESTION_PATTERN = /^(tell me about a time|describe a time)/i;

function getFallbackQuestions(role, difficulty) {
    const roleQuestions = FALLBACK_QUESTIONS[role] || {};
    // Try the exact difficulty first, then fall back within the same role
    const questions = roleQuestions[difficulty]
        || roleQuestions['Mid']
        || roleQuestions['Junior']
        || Object.values(roleQuestions)[0]
        || [];
    return [...questions].sort(() => Math.random() - 0.5);
}

function normalizeQuestionText(question) {
    return String(question || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildRoleQuestionGuardrails(role) {
    const keywords = ROLE_QUESTION_RULES[role]?.keywords || [];
    if (keywords.length === 0) return '';

    return `Role anchors for ${role}: ${keywords.join(', ')}.
Every question must clearly connect to at least one of those role anchors.
Reject generic interview questions that could be asked unchanged to any role.`;
}

function isBehavioralQuestion(question) {
    return BEHAVIORAL_QUESTION_PATTERN.test(String(question || '').trim());
}

function hasRoleSignals(role, question) {
    const normalizedQuestion = normalizeQuestionText(question);
    const keywords = ROLE_QUESTION_RULES[role]?.keywords || [];
    const roleTerms = normalizeQuestionText(role).split(' ').filter(Boolean);

    return [...keywords, ...roleTerms].some((term) => normalizedQuestion.includes(normalizeQuestionText(term)));
}

function isGenericQuestion(question) {
    return GENERIC_QUESTION_PATTERNS.some((pattern) => pattern.test(String(question || '').trim()));
}

function isValidRoleQuestion(role, question) {
    const text = String(question || '').trim();
    if (!text || text.length < 20) return false;
    if (isGenericQuestion(text)) return false;
    if (!text.endsWith('?')) return false;
    if (!hasRoleSignals(role, text)) return false;

    return true;
}

function normalizeGeneratedQuestions(role, difficulty, questions) {
    if (!Array.isArray(questions)) {
        return { questions: getFallbackQuestions(role, difficulty), _fallback: true };
    }

    const uniqueQuestions = [];
    const seen = new Set();

    for (const question of questions) {
        const text = String(question || '').trim();
        const normalized = normalizeQuestionText(text);
        if (!text || seen.has(normalized)) continue;
        seen.add(normalized);
        uniqueQuestions.push(text);
    }

    const validQuestions = uniqueQuestions.filter((question) => isValidRoleQuestion(role, question));
    const behavioralQuestions = validQuestions.filter((question) => isBehavioralQuestion(question));
    const technicalQuestions = validQuestions.filter((question) => !isBehavioralQuestion(question));

    if (behavioralQuestions.length >= 2 && technicalQuestions.length >= 3) {
        return {
            questions: [
                ...technicalQuestions.slice(0, 3),
                ...behavioralQuestions.slice(0, 2),
            ],
        };
    }

    return { questions: getFallbackQuestions(role, difficulty), _fallback: true };
}

function shouldBypassBrokenProxy() {
    const blockedProxyValues = new Set([
        'http://127.0.0.1:9',
        'https://127.0.0.1:9',
        'http://localhost:9',
        'https://localhost:9',
    ]);

    return [process.env.HTTP_PROXY, process.env.HTTPS_PROXY, process.env.ALL_PROXY]
        .filter(Boolean)
        .some((value) => blockedProxyValues.has(value));
}

function extractJsonPayload(text) {
    if (!text) return null;

    const cleanedText = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();

    const jsonMatch = cleanedText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) {
        console.error("[AI Raw Response]", cleanedText.substring(0, 300));
        return null;
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (err) {
        const normalizedJson = Array.from(jsonMatch[0], (char) => {
            const charCode = char.charCodeAt(0);
            return charCode <= 25 ? ' ' : char;
        }).join('');
        try {
            return JSON.parse(normalizedJson);
        } catch {
            console.error("[AI JSON Parse Error]", err.message);
            return null;
        }
    }
}

function buildFallbackCourse(topic, difficulty) {
    const learnerLevel = String(difficulty || 'Intermediate').toLowerCase();

    return {
        _fallback: true,
        title: `${topic} Course`,
        materials: [
            {
                title: `Foundations of ${topic}`,
                content_markdown: `## What you will learn\n\nThis fallback lesson introduces the core ideas behind **${topic}** at a **${difficulty}** level. Start by defining the problem ${topic} solves, the main concepts you need to know, and the common vocabulary used by practitioners.\n\n## Key concepts\n\n1. Explain the purpose of ${topic} in real projects.\n2. Identify the main building blocks, workflows, or abstractions involved.\n3. Describe where beginners usually get stuck and how to avoid those mistakes.\n\n## Practical examples\n\nCreate one small example showing ${topic} in action. Then write down how the example would change in a larger production setting. For a ${learnerLevel} learner, focus on understanding why each step exists before optimizing it.\n\n## Reflection\n\nSummarize the three ideas someone should remember after completing this lesson, and note one real-world scenario where ${topic} would be a strong choice.`,
            },
            {
                title: `${topic} in Practice`,
                content_markdown: `## Applying ${topic}\n\nIn this module, connect theory to execution. Break ${topic} into a repeatable workflow: setup, implementation, validation, and iteration. Document the inputs required, the expected outputs, and the signals that tell you things are working correctly.\n\n## Trade-offs\n\nEvery technical choice involves trade-offs. For ${topic}, compare simplicity vs flexibility, speed vs maintainability, and short-term delivery vs long-term quality. Explain which trade-offs matter most for a **${difficulty}** learner to understand.\n\n## Debugging checklist\n\nWhen ${topic} is not working, inspect configuration, assumptions, dependencies, and output quality. Keep a short checklist of what to verify first, how to isolate failures, and how to confirm a fix.\n\n## Practice task\n\nBuild a small exercise around ${topic}. Define success criteria, suggest one extension, and explain how you would review the result like an interviewer or reviewer.`,
            },
            {
                title: `Advanced Thinking for ${topic}`,
                content_markdown: `## Going deeper\n\nNow move from implementation to judgment. Strong engineers working with ${topic} do more than follow steps: they reason about scalability, edge cases, reliability, and maintainability.\n\n## Questions to ask\n\n- What assumptions does this approach make?\n- What breaks first under load or complexity?\n- Which metrics would prove the solution is working?\n- How would you explain the design to a teammate or interviewer?\n\n## Production mindset\n\nFor a **${difficulty}** audience, the goal is to connect ${topic} to realistic decision-making. Highlight documentation, testing, observability, and gradual rollout strategies where relevant.\n\n## Next steps\n\nWrap up by listing three follow-up topics related to ${topic}, one mini-project to reinforce learning, and one way to measure whether the learner has truly understood the material.`,
            },
        ],
    };
}

function normalizeCourseResult(result, topic, difficulty) {
    if (!result || !Array.isArray(result.materials) || result.materials.length === 0) {
        return buildFallbackCourse(topic, difficulty);
    }

    const fallbackCourse = buildFallbackCourse(topic, difficulty);
    const aiMaterials = result.materials
        .filter((material) => material && typeof material.title === 'string' && typeof material.content_markdown === 'string')
        .map((material) => ({
            title: material.title.trim() || 'Untitled Module',
            content_markdown: material.content_markdown.trim() || 'Content unavailable.',
        }));

    if (aiMaterials.length >= 3) {
        return {
            title: result.title || `${topic} Course`,
            materials: aiMaterials.slice(0, 5),
        };
    }

    const paddedMaterials = [
        ...aiMaterials,
        ...fallbackCourse.materials.slice(0, Math.max(0, 3 - aiMaterials.length)),
    ];

    return {
        _fallback: true,
        title: result.title || fallbackCourse.title,
        materials: paddedMaterials,
    };
}

function buildFallbackMcqs(courseTitle) {
    return {
        _fallback: true,
        mcqs: [
            {
                question: `What is the main goal of learning ${courseTitle}?`,
                options: [
                    `To understand the core ideas and practical use cases of ${courseTitle}`,
                    `To memorize one tool without understanding how it works`,
                    `To avoid testing and validation entirely`,
                    `To replace every other engineering skill`,
                ],
                correct_answer: `To understand the core ideas and practical use cases of ${courseTitle}`,
                explanation: `A strong foundation starts with understanding the concepts, trade-offs, and real-world applications of ${courseTitle}.`,
            },
            {
                question: `When applying ${courseTitle}, what is usually the best first step?`,
                options: [
                    'Clarify the problem, requirements, and expected outcome',
                    'Optimize performance before writing any solution',
                    'Skip planning and copy the first solution you find',
                    'Ignore edge cases until production fails',
                ],
                correct_answer: 'Clarify the problem, requirements, and expected outcome',
                explanation: 'Clear requirements help you choose the right approach and make later implementation decisions easier.',
            },
            {
                question: `Why should you evaluate trade-offs when working with ${courseTitle}?`,
                options: [
                    'Because every design choice affects maintainability, speed, and complexity',
                    'Because trade-offs only matter for very large companies',
                    'Because trade-offs remove the need for testing',
                    'Because the first idea is always the best one',
                ],
                correct_answer: 'Because every design choice affects maintainability, speed, and complexity',
                explanation: 'Trade-off analysis is part of good engineering judgment and helps produce solutions that fit the real context.',
            },
            {
                question: `Which habit most improves your ability to debug problems in ${courseTitle}?`,
                options: [
                    'Checking assumptions, inputs, outputs, and dependencies systematically',
                    'Changing multiple variables at once without measuring',
                    'Relying only on guesswork',
                    'Ignoring logs and error messages',
                ],
                correct_answer: 'Checking assumptions, inputs, outputs, and dependencies systematically',
                explanation: 'A structured debugging process makes it much easier to isolate failures and validate fixes.',
            },
            {
                question: `What shows a learner has moved beyond basic familiarity with ${courseTitle}?`,
                options: [
                    'They can explain trade-offs and apply the topic to realistic scenarios',
                    'They can repeat definitions without examples',
                    'They avoid hands-on exercises',
                    'They only know one narrow happy path',
                ],
                correct_answer: 'They can explain trade-offs and apply the topic to realistic scenarios',
                explanation: 'Real understanding means being able to reason, apply, and communicate decisions in practical situations.',
            },
        ],
    };
}

const COURSE_RESPONSE_FORMAT = {
    type: 'json_schema',
    json_schema: {
        name: 'course_generation',
        strict: true,
        schema: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'materials'],
            properties: {
                title: { type: 'string' },
                materials: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['title', 'content_markdown'],
                        properties: {
                            title: { type: 'string' },
                            content_markdown: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};


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

function createNeutralFeedback(strengths, improvements, fallbackMessage) {
    const parts = [];

    if (strengths.length > 0) {
        parts.push(`Observed strengths: ${strengths.join(', ')}.`);
    }

    if (improvements.length > 0) {
        parts.push(`Recommended improvement: ${improvements[0]}${improvements[1] ? ` Also, ${improvements[1].toLowerCase()}` : ''}.`);
    }

    if (parts.length === 0) {
        parts.push(fallbackMessage);
    }

    return parts.join(' ');
}

function analyzeAnswerContentV2(question, answer) {
    if (isTrivialAnswer(answer)) {
        const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
        return {
            relevance: 1,
            clarity: 1,
            depth: 1,
            structure: 1,
            confidence: 1,
            feedback: wordCount < 3
                ? 'No substantive answer was provided, so the response could not be evaluated against the question.'
                : 'The response is too limited to evaluate reliably. A stronger answer should include reasoning, relevant knowledge, and the next step you would take.',
        };
    }

    const q = question.toLowerCase();
    const a = answer.toLowerCase();
    const words = answer.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentences = answer.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 5);
    const questionTopics = extractQuestionKeywords(question);

    const qWords = q.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((word) => word.length > 4);
    const aWords = new Set(a.replace(/[^a-z0-9 ]/g, '').split(/\s+/));
    const overlapRatio = qWords.filter((word) => aWords.has(word)).length / Math.max(qWords.length, 1);

    const directAddressSignals = [
        q.includes('design') && (a.includes('design') || a.includes('architect') || a.includes('service') || a.includes('component') || a.includes('system')),
        q.includes('difference') && (a.includes('whereas') || a.includes('unlike') || a.includes('on the other hand') || a.includes('while') || a.includes('however')),
        q.includes('when') && (a.includes('when') || a.includes('situation') || a.includes('case') || a.includes('scenario')),
        q.includes('why') && (a.includes('because') || a.includes('reason') || a.includes('since') || a.includes('due to')),
        q.includes('how') && (a.includes('first') || a.includes('then') || a.includes('step') || a.includes('approach') || a.includes('process')),
        q.includes('trade-off') && (a.includes('tradeoff') || a.includes('trade-off') || a.includes('advantage') || a.includes('disadvantage') || a.includes('however') || a.includes('but')),
        questionTopics.includes('behavioral') && (
            a.includes('at my previous') ||
            a.includes('my task was') ||
            a.includes('i was responsible') ||
            a.includes('as a result')
        ),
    ].filter(Boolean).length;

    const concreteAnswerSignals = [
        /\d+/.test(answer),
        /for example|for instance|such as|e\.g\.|specifically/i.test(answer),
        /i built|i designed|i implemented|i led|i analyzed|i proposed|i worked on/i.test(a),
        /redis|kafka|postgres|mysql|mongodb|docker|kubernetes|aws|react|node|python|java/i.test(answer),
    ].filter(Boolean).length;

    if (wordCount >= 12 && overlapRatio < 0.05 && directAddressSignals === 0 && concreteAnswerSignals === 0) {
        return {
            relevance: 1,
            clarity: 1,
            depth: 1,
            structure: 1,
            confidence: 1,
            feedback: 'The response does not clearly address the main topic of the prompt. A stronger answer should reference the requested scenario, concept, or decision directly.',
        };
    }

    let relevanceScore = Math.round(3 + (overlapRatio * 4) + (directAddressSignals * 0.8));
    relevanceScore = Math.min(10, Math.max(2, relevanceScore));

    const depthSignals = [
        /\d+/.test(answer),
        /%|ms|kb|mb|gb|tb|rpm|qps|tps/.test(a),
        /for example|for instance|such as|e\.g\.|specifically/i.test(answer),
        /because|since|therefore|as a result|which means|this allows/.test(a),
        /we used|i used|implemented|built|deployed|configured/.test(a),
        /my task was|i was responsible|as a result|i added|i extracted|i rolled out|i owned/.test(a),
        a.includes('redis') || a.includes('kafka') || a.includes('postgres') ||
            a.includes('mysql') || a.includes('mongodb') || a.includes('kubernetes') ||
            a.includes('docker') || a.includes('aws') || a.includes('react') ||
            a.includes('node') || a.includes('python') || a.includes('java'),
        wordCount > 80,
        wordCount > 150,
        sentences.length >= 4,
    ].filter(Boolean).length;

    let depthScore = Math.round(2 + depthSignals * 0.9);
    depthScore = Math.min(10, Math.max(1, depthScore));

    const avgWordsPerSentence = wordCount / Math.max(sentences.length, 1);
    const hasLogicalFlow = /first|second|then|next|finally|also|additionally|however|moreover|in summary/.test(a);
    const hasConcreteNouns = /team|project|system|code|feature|user|data|service|component|approach/.test(a);

    let clarityScore = 5;
    if (avgWordsPerSentence < 10) clarityScore -= 1;
    if (avgWordsPerSentence > 35) clarityScore -= 2;
    if (avgWordsPerSentence >= 12 && avgWordsPerSentence <= 25) clarityScore += 2;
    if (hasLogicalFlow) clarityScore += 2;
    if (hasConcreteNouns) clarityScore += 1;
    if (wordCount < 20) clarityScore -= 2;
    clarityScore = Math.min(10, Math.max(1, clarityScore));

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

    const fillerPatterns = /\b(um|uh|like|you know|sort of|kind of|i guess|i think maybe|basically just)\b/gi;
    const hedgePatterns = /\b(maybe|perhaps|not sure|might be|could be|i think|i believe|possibly|probably|kinda)\b/gi;
    const assertivePatterns = /\b(i built|i designed|i led|i implemented|we achieved|i solved|i improved|resulted in|i owned|i added|i extracted|i rolled out)\b/gi;

    const fillerCount = (answer.match(fillerPatterns) || []).length;
    const hedgeCount = (answer.match(hedgePatterns) || []).length;
    const assertiveCount = (answer.match(assertivePatterns) || []).length;

    let confidenceScore = 6 - fillerCount - Math.max(0, hedgeCount - 1) + assertiveCount;
    if (wordCount < 20) confidenceScore -= 2;
    confidenceScore = Math.min(10, Math.max(1, confidenceScore));

    const strengths = [];
    if (depthScore >= 7) strengths.push('specific technical detail');
    if (clarityScore >= 7) strengths.push('clear structure');
    if (relevanceScore >= 7) strengths.push('good alignment with the prompt');
    if (assertiveCount >= 2) strengths.push('clear ownership of actions');
    if (/\d+/.test(answer)) strengths.push('measurable detail');

    const improvements = [];
    if (relevanceScore < 6) {
        if (q.includes('design')) improvements.push('explain the architecture more explicitly by naming components, data flow, and trade-offs');
        else if (q.includes('difference')) improvements.push('make the comparison more explicit by contrasting the options side by side');
        else if (q.includes('trade-off')) improvements.push('state the main advantages, disadvantages, and selection criteria more directly');
        else improvements.push('address each part of the prompt more directly before adding extra detail');
    }
    if (depthScore < 6) {
        if (questionTopics.includes('system_design')) improvements.push('name specific technologies or components and explain why they fit the design');
        else if (questionTopics.includes('behavioral')) improvements.push('add STAR details: the situation, your responsibility, the actions you took, and the result');
        else improvements.push('add specific examples, implementation details, or measurable outcomes');
    }
    if (structureScore < 5) improvements.push('organize the answer with an opening, a few supporting points, and a short conclusion');
    if (hedgeCount > 2) improvements.push('use direct phrasing where you are certain, and separate assumptions from facts');
    if (!(/\d+/.test(answer)) && wordCount > 30) improvements.push('add measurable outcomes or concrete scope where possible');

    return {
        relevance: relevanceScore,
        clarity: clarityScore,
        depth: depthScore,
        structure: structureScore,
        confidence: confidenceScore,
        feedback: createNeutralFeedback(
            strengths,
            improvements,
            'The answer is generally understandable. The next improvement is to make it more specific and more directly tied to the prompt.'
        ),
        _meta: { wordCount, questionTopics, fillerCount, hedgeCount, assertiveCount },
    };
}

function analyzeSTARContentV2(answer) {
    if (isTrivialAnswer(answer)) {
        return {
            situation: 0,
            task: 0,
            action: 0,
            result: 0,
            tips: 'The response does not contain enough detail for STAR analysis. For behavioral questions, describe the situation, your responsibility, the actions you took, and the result.',
        };
    }

    const a = answer.toLowerCase();
    const situationSignals = [
        /\b(at my (previous|last|former|current) (job|company|role|position))\b/.test(a),
        /\b(when i was|while working|during (my time|a project|the project|our sprint))\b/.test(a),
        /\b(we (had|were|faced|encountered|were dealing with))\b/.test(a),
        /\b(the (company|team|project|system) (was|had|needed))\b/.test(a),
        /\b(last year|a year ago|in \d{4}|recently|a few months ago)\b/.test(a),
    ].filter(Boolean).length;
    const taskSignals = [
        /\b(i was (responsible|tasked|asked|assigned|in charge))\b/.test(a),
        /\b(my (role|responsibility|goal|objective|task) was)\b/.test(a),
        /\b(needed to|had to|was supposed to|my job was to)\b/.test(a),
        /\b(the (goal|objective|challenge|problem) was)\b/.test(a),
    ].filter(Boolean).length;
    const actionSignals = [
        /\b(i (built|created|designed|implemented|developed|wrote|refactored|optimized|migrated|led|coordinated|analyzed|investigated|fixed|resolved|introduced|established))\b/.test(a),
        /\b(i (decided to|chose to|started|began|worked on|collaborated|reached out|proposed|suggested|set up))\b/.test(a),
        /\b(first(ly)?[,.]? i|then i|next i|after that i|i then|i also)\b/.test(a),
        /\b(my (approach|solution|strategy|plan) was)\b/.test(a),
    ].filter(Boolean).length;
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

    const weakest = { situation, task, action, result };
    const weakestKey = Object.entries(weakest).sort((left, right) => left[1] - right[1])[0][0];
    const tipsMap = {
        situation: 'Add a short setup section so the interviewer understands the context, constraints, and problem you were working on.',
        task: 'State your responsibility more explicitly so it is clear what part of the work you owned.',
        action: 'Expand the action section with the concrete steps, decisions, and trade-offs you handled.',
        result: 'Close with the outcome, including any measurable impact, delivery result, or lesson learned.',
    };

    return { situation, task, action, result, tips: tipsMap[weakestKey] };
}

function analyzeConfidenceContentV2(answer) {
    if (isTrivialAnswer(answer)) {
        return {
            confidence_score: 1,
            issues: ['The response is too short to evaluate communication patterns reliably'],
            suggestions: ['Use a simple structure: state what you know, explain your reasoning, and note what you would do next if more detail were needed.'],
        };
    }

    const a = answer.toLowerCase();
    const fillerTerms = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of', 'i guess', 'i think maybe', 'basically', 'literally', 'actually'];
    const hedgeTerms = ['maybe', 'perhaps', 'not sure', 'i think', 'i believe', 'possibly', 'probably', 'might', 'could be', 'something like'];

    const foundFillers = fillerTerms.filter((term) => new RegExp(`\\b${term.replace(/\s+/, '\\s+')}\\b`, 'g').test(a));
    const foundHedges = hedgeTerms.filter((term) => new RegExp(`\\b${term.replace(/\s+/, '\\s+')}\\b`, 'g').test(a));
    const assertiveCount = (answer.match(/\b(i built|i designed|i led|i implemented|we achieved|i solved|i improved|i delivered|i created|i drove|resulted in|increased|decreased|reduced|improved by)\b/gi) || []).length;
    const hasMetrics = /\d+\s*(%|x|times|percent|ms|seconds|users|engineers|days|weeks)/.test(a);

    const issues = [];
    const suggestions = [];

    if (foundFillers.length > 0) {
        issues.push(`Filler terms detected: "${foundFillers.join('", "')}"`);
        suggestions.push('Replace filler terms with short pauses so the main points stay clearer.');
    }
    if (foundHedges.length > 0) {
        issues.push(`Frequent tentative phrasing detected: "${foundHedges.slice(0, 3).join('", "')}"`);
        suggestions.push('Use direct statements for facts and reserve tentative wording only for assumptions or uncertainty.');
    }
    if (assertiveCount === 0 && answer.split(/\s+/).length > 25) {
        issues.push('Individual ownership is not stated clearly');
        suggestions.push("Clarify your contribution with direct ownership statements such as 'I designed', 'I implemented', or 'I led'.");
    }
    if (!hasMetrics && answer.split(/\s+/).length > 40) {
        issues.push('The response does not include measurable outcomes');
        suggestions.push('Add scope or outcome details such as time saved, percentage change, latency, scale, or team size where relevant.');
    }
    if (foundFillers.length === 0 && foundHedges.length <= 1 && assertiveCount > 0) {
        if (hasMetrics) {
            suggestions.push('Language is direct. Continue supporting key points with measurable evidence.');
        } else {
            suggestions.push('Language is direct. Adding a small amount of measurable evidence would make the response more concrete.');
        }
    }

    const shortAnswerPenalty = answer.split(/\s+/).length < 15 ? 2 : 0;
    const rawScore = 8
        - foundFillers.length * 1.5
        - foundHedges.length * 1.2
        - shortAnswerPenalty
        + assertiveCount * 0.7
        + (hasMetrics ? 1 : 0);
    const confidence_score = Math.round(Math.min(10, Math.max(2, rawScore)));

    return { confidence_score, issues, suggestions };
}

/**
 * Score how well the answer addresses the question by checking keyword overlap,
 * specificity signals, and structural completeness.
 */
function _analyzeAnswerContent(question, answer) {
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
function _analyzeSTARContent(question, answer) {
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
function _analyzeConfidenceContent(answer) {
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

// Rate-limit cooldown: timestamp-based so it auto-recovers after 5 minutes
let aiRateLimitedUntil = 0
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000  // 5 minutes

function isAiRateLimited() {
  if (aiRateLimitedUntil === 0) return false
  if (Date.now() >= aiRateLimitedUntil) {
    console.log('[AI] Rate-limit cooldown expired, re-enabling AI calls')
    aiRateLimitedUntil = 0
    return false
  }
  return true
}

async function callAI(prompt, retries = 3, options = {}) {
  const apiKey = process.env.HF_API_KEY || process.env.HF_TOKEN

  if (!apiKey) {
    console.warn('[AI] No HF_API_KEY set — using fallback')
    return null
  }
  if (isAiRateLimited()) {
    console.warn('[AI] Rate-limited, cooldown active — using fallback')
    return null
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[AI] Attempt ${attempt}/${retries} — calling HuggingFace...`)
      const bypassBrokenProxy = shouldBypassBrokenProxy()
      if (bypassBrokenProxy) {
        console.warn('[AI] Ignoring invalid local proxy configuration (127.0.0.1:9)')
      }

      const response = await axios.post(
        HF_ROUTER_URL,
        {
          model: HF_MODEL,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: options.maxTokens || 1000,
          ...(options.responseFormat ? { response_format: options.responseFormat } : {})
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 60000,
          proxy: bypassBrokenProxy ? false : undefined
        }
      )

      const text = response.data?.choices?.[0]?.message?.content || ""
      const parsed = extractJsonPayload(text)
      if (!parsed) return null

      console.log('[AI] Successfully parsed AI response')
      return parsed
    } catch (err) {
      const status = err.response?.status
      const code = err.code  // e.g. ECONNRESET, ETIMEDOUT

      // 410 Gone = model removed from HuggingFace free tier — no point retrying
      if (status === 410 || status === 404) {
        console.error(`[AI] Model endpoint returned ${status} — model may be removed. Update HF_MODEL URL. Using fallback.`)
        return null
      }

      if (status === 400 || status === 401 || status === 403) {
        console.error(`[AI] Hugging Face request failed with status ${status} â€” check token permissions and model access.`)
        return null
      }

      if (status === 503 || status === 429) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 2000
          console.warn(`[AI] Rate limited (${status}). Retrying in ${delay}ms...`)
          await sleep(delay)
          continue
        }

        console.warn(`[AI] API unavailable (${status}), entering cooldown for ${RATE_LIMIT_COOLDOWN_MS / 1000}s`)
        aiRateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
        return null
      }

      // Handle network errors (ECONNRESET, ETIMEDOUT, etc.) — retry if possible
      if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
        console.warn(`[AI] Network error (${code}) on attempt ${attempt}/${retries}`)
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1500
          await sleep(delay)
          continue
        }
        console.warn('[AI] Network errors exhausted retries — using fallback')
        return null
      }

      console.error("[AI Error]", err.response?.data || err.message)
      return null
    }
  }

  return null
}

// ─── Public service functions ─────────────────────────────────────────────

async function generateQuestions(role, difficulty) {
    const roleGuardrails = buildRoleQuestionGuardrails(role);
    const prompt = `You are a strict, senior technical interviewer at a top tech company. Generate exactly 5 interview questions specifically and exclusively for a "${role}" position at the "${difficulty}" level.

CRITICAL INSTRUCTION: All generated questions MUST be highly relevant to the specific domain, tools, and daily tasks of a "${role}". Do NOT ask generic programming or generic behavioral questions unless they are framed specifically around scenarios a ${role} would realistically face.

${roleGuardrails}

Requirements:
- 3 deep technical questions highly specific to ${role} technologies, system design, or domain-specific problem solving.
- 2 behavioral questions using exactly the "Tell me about a time..." or "Describe a time..." format, framed entirely around situations a ${role} would encounter.
- Questions should be challenging but fair for ${difficulty} level.
- Make questions open-ended and scenario-based.
- Never ask broad questions like "Tell me about yourself", "What are your strengths", or anything that could be reused unchanged for another role.

Return ONLY this exact JSON, no markdown, no explanation:
{"questions": ["question1","question2","question3","question4","question5"]}`;

    const result = await callAI(prompt, 3, { responseFormat: { type: 'json_object' } });
    const normalized = normalizeGeneratedQuestions(role, difficulty, result?.questions);
    if (!normalized._fallback) return normalized;

    console.log('[AI Fallback] Using curated questions for', role, difficulty);
    return normalized;
}

async function evaluateAnswer(question, answer) {
    // Hybrid Architecture: Evaluation is handled entirely by the robust Local Evaluation Engine.
    // This reduces AI dependency, lowers latency, and ensures consistent grading logic.
    return analyzeAnswerContentV2(question, answer);
}

async function analyzeSTAR(question, answer) {
    // Hybrid Architecture: STAR component breakdown is parsed purely via the
    // Local Evaluation Engine utilizing regex temporal and role markers.
    return analyzeSTARContentV2(answer);
}

async function analyzeConfidence(answer) {
    // Hybrid Architecture: Confidence is scored logically via the Local Engine
    // by evaluating filler words, hedging phrases, assertive counts, and metrics.
    return analyzeConfidenceContentV2(answer);
}

async function generateFollowUp(question, _answer) {
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
    const roleGuardrails = buildRoleQuestionGuardrails(role);
    const prompt = `You are conducting a live, role-specific adaptive interview for a "${role}" position.

CRITICAL INSTRUCTION: The next question MUST be highly relevant to the specific domain and daily tasks of a "${role}". Do NOT ask generic questions.

${roleGuardrails}

PREVIOUS QUESTION: ${prevQuestion}
CANDIDATE'S ANSWER: ${prevAnswer}
SCORE: ${score}/10

Rules for next question:
- Score > 7: Go harder — deeper technical follow-up or a new harder topic specifically related to being a ${role}.
- Score 4-7: Same level — different technical or behavioral topic area intrinsic to the ${role} role.
- Score < 4: Ease up — simpler core concept question for a ${role}.

Do NOT repeat the same topic as the previous question.
Make it a fresh, standalone question (not "following up on...").
Never use generic interview prompts that would work for any role.

Return ONLY this JSON, no markdown:
{"question":"..."}`;

    const result = await callAI(prompt, 3, { responseFormat: { type: 'json_object' } });
    if (result && isValidRoleQuestion(role, result.question)) return result;

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

    If the topic IS valid, create exactly 3 modules (materials). For each module, provide a title and concise markdown content of roughly 120-180 words explaining the concepts clearly with examples.

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

    const result = await callAI(prompt, 3, {
        responseFormat: COURSE_RESPONSE_FORMAT,
        maxTokens: 2200,
    });
    return normalizeCourseResult(result, topic, difficulty);
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

    const result = await callAI(prompt, 3, { responseFormat: { type: 'json_object' } });
    if (result && result.mcqs && result.mcqs.length === 5) return result;

    return buildFallbackMcqs(courseTitle);
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

    const result = await callAI(prompt, 2, { responseFormat: { type: 'json_object' } });
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

    const result = await callAI(prompt, 1, { responseFormat: { type: 'json_object' } });
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
