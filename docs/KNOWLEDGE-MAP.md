# AgentBrowser Knowledge Map

This file maps the book collection to agent tasks. When the agent needs specific
knowledge, it searches the relevant category via `POST /api/books/search`.

## Computers — Coding & AI reference

| Agent Task | Best Books to Search | Category |
|---|---|---|
| Python coding help | python-crash-course-2nd-ed, serious-python, real-world-python, object-oriented-python, beyond-basic-stuff-python | Computers |
| AI / ML implementation | practical-deep-learning-python-intro, essential-math-for-ai-2023, big-book-data-science-2025, artificial-intelligence-insights-hbr | Computers & Math |
| Algorithms & data structures | dive-into-algorithms-python, learn-to-code-by-solving-problems, programming-logic-and-design-2024 | Computers & Math |
| System design / distributed systems | think-distributed-systems-2025, logic-for-programmers-2025 | Computers |
| Automation / scripting | automate-the-boring-stuff-2nd-ed, impractical-python-projects | Computers |
| Prompt engineering / AI agents | artificial-intelligence-insights-hbr, chatgpt-bard-business-automation | Computers & Business |
| Security / ethical hacking | (advanced cybersecurity course in Computers folder) | Computers |

## Math — Algorithm & ML foundations

| Agent Task | Best Books to Search | Category |
|---|---|---|
| ML math foundations | essential-math-for-data-science, essential-math-for-ai-2023, math-for-digital-science-2025 | Math |
| Calculus | calculus-with-applications-to-economics-2025 | Math |
| Linear algebra / matrix ops | mathematical-physics-and-matrix-representations-2025 | Math |
| Statistics / probability | art-of-statistics, risk-and-predictive-analytics-business-r-2025 | Math & financial |
| Logic / proofs | logic-for-programmers-2025, programming-logic-and-design-2024 | Computers & Math |

## Business — Strategy & management

| Agent Task | Best Books to Search | Category |
|---|---|---|
| Decision-making frameworks | thinking-fast-and-slow, 50-business-classics | Business & financial |
| Influence / negotiation | how-to-win-friends, 48-laws-of-power | Business & financial |
| Learning / productivity | limitless-jim-kwik | Business |
| Business analytics | risk-predictive-analytics-business-r-2025, python-for-business-analytics | financial |
| Trading / markets | how-to-day-trade, technical-analysis-financial-markets, the-psychology-of-money | financial |
| Startup / entrepreneurship | 50-business-classics, the-millionaire-fastlane, the-entrepreneurs-blueprint | Business & financial |
| Statistics for business | art-of-statistics, risk-and-predictive-analytics-business-r-2025 | financial & Math |

## financial — Finance & investing

| Agent Task | Best Books to Search | Category |
|---|---|---|
| Financial modeling | financial-modeling-valuation-(pignataro), applied-corporate-finance-(damodaran) | financial |
| Investment banking | investment-banking-(pearl-rosenbaum), valuation-(koller-mckinsey) | financial |
| Trading strategies | how-to-day-trade, technical-analysis-financial-markets, crypto-trader | financial |
| Risk management | risk-predictive-analytics-business-r-2025 | financial |
| Financial analysis | financial-statement-analysis-(penman), financial-shenanigans | financial |
| Options / derivatives | option-volatility-and-pricing-(natenberg), trading-options-greeks | financial |

## Quick Reference for Agent

```
Search query structure:
  POST /api/books/search
  { "query": "specific topic", "category": "Computers", "limit": 5 }

Categories: Computers | Math | financial | Business | Science |
            Analytics | Life | Health Fitness | Game Development | etc.

The agent should ALWAYS search books before answering technical questions
about Python, algorithms, system design, ML/AI, finance, or business strategy.
```
