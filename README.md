# AI Interview Coach

An AI-powered interview preparation platform designed to help candidates practice, refine, and master technical and behavioral interviews. 

## Features

- **Hybrid AI Architecture**: Utilizes Gemini and HuggingFace for intelligent parsing, alongside robust offline fallback engines and PostgreSQL caching to ensure high performance and lower API costs.
- **Role-Specific Coaching**: Tailored interview questions and evaluation criteria across multiple disciplines (Software Engineer, Product Manager, Data Scientist, etc).
- **Nuanced Feedback Matrix**: Answers are evaluated on Relevance, Clarity, Depth, Structure, and Confidence rather than simple word counts.
- **Secure Authentication**: Fully fledged JWT email-only authentication flow.
- **Full Stack Setup**: 
  - **Frontend**: React + Vite + TailwindCSS.
  - **Backend**: Node.js + Express.
  - **Database**: PostgreSQL.
  
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
