# 🚀 AI Interview Coach

An AI-powered interview preparation platform designed to help candidates practice, refine, and master technical and behavioral interviews.

### 🌐 Live Demo
*   **Web Portal:** [https://interview-ai-lovat-one.vercel.app](https://interview-ai-lovat-one.vercel.app)
*   **API Health:** [https://interview-ai-g6fw.onrender.com/api/health](https://interview-ai-g6fw.onrender.com/api/health)

## Features

- **Hybrid AI Architecture**: Utilizes Gemini and HuggingFace for intelligent parsing, alongside robust offline fallback engines and PostgreSQL caching.
- **Role-Specific Coaching**: Tailored interview questions across multiple disciplines (Software Engineer, Product Manager, Data Scientist, etc).
- **Nuanced Feedback Matrix**: Answers are evaluated on Relevance, Clarity, Depth, Structure, and Confidence.
- **Secure Authentication**: Fully fledged JWT email-only authentication flow.
- **Dynamic Session Handling**: Real-time progress tracking and performance analytics.
  
## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/prajwal-manjunath20/interview-AI.git
   cd ai-interview-coach
   ```

2. **Setup the Backend**
   ```bash
   cd server
   npm install
   # Copy the environment example and populate your secrets, database URLs, and API keys
   cp .env.example .env
   # Start the backend server
   npm run dev
   ```

3. **Setup the Frontend**
   ```bash
   # From the root directory
   npm install
   # Start the frontend Vite server
   npm run dev
   ```

## Tech Stack
- Frontend: React 19, Vite, Tailwind CSS, Recharts
- Backend: Express, Node.js, PG, Zod
- AI Integrations: Gemini API, HuggingFace Inference API

## License
MIT
