# Northstar

Northstar is an AI-powered product management workspace, a "Cursor for Product Managers."

This first version includes a dark Next.js MVP with:

- Project sidebar and new project creation
- Cursor/Codex-style PM chat workspace
- Orchestrator context-gathering flow
- Specialist agents for Strategy, PRD, Metrics, Design, Risk, and Engineering
- Visible orchestration phases and inter-agent collaboration updates
- One consolidated PRD preview document
- PRD refinement through chat comments
- Markdown copy support for generated artifacts

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn-inspired local UI styling
- Supabase client placeholder
- OpenAI client placeholder

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` and fill in keys when wiring storage and real model calls.
