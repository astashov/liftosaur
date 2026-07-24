---
name: writing-style
description: Writing style guide for prose content - program descriptions, technique pages, blog posts, and any user-facing text. Use when writing or editing descriptive content.
disable-model-invocation: true
---

# Writing Style Guide

Apply these rules when writing any prose content for Liftosaur - program descriptions, technique pages, FAQ answers, whatsnew entries, blog posts, or any user-facing text.

## Voice & Tone

Write like a knowledgeable training partner explaining something over coffee - conversational, honest, and encouraging. Not like an academic paper, a marketing brochure, or a corporate changelog.

Key traits of the Liftosaur voice:

1. **Personal and first-person.** Use "I" for the developer's perspective. Use "you" when addressing the reader directly. This isn't a faceless product - it's built by a person who lifts.
2. **Encouraging without being patronizing.** Normalize struggles and failure. "If you miss and chose a weight that is too heavy - that's okay! Record the weight and reps, and move on." Not "failure is an expected part of the training process."
3. **Honest about trade-offs.** Acknowledge downsides and limitations directly. Don't sell - inform. "Sessions can take 90+ minutes" is better than omitting it.
4. **Transparent about decisions.** Explain WHY choices were made, not just what was chosen. Frame features by the problem they solve: "A lot of users found it weird you can only adjust 1RM during a workout. So now there's a separate Exercises screen."

## Plain Language

Use simple, common words. Prefer casual phrasing where it fits naturally.

- "use" not "utilize" or "leverage"
- "help" not "facilitate"
- "best" not "optimal"
- "enough" not "sufficient"
- "about" not "approximately"
- "start" not "initiate" or "commence"
- "need" not "necessitate" or "require" (when "need" works)
- "shows" not "demonstrates" or "illustrates"
- "improves" not "enhances"
- "works well for" not "is particularly well-suited for"
- "way harder" not "significantly more difficult"
- "pretty nice" not "quite satisfactory"

Don't go overboard - this isn't ELI5. Technical gym terms (periodization, progressive overload, AMRAP, RPE) are fine because the audience knows them. The goal is to avoid unnecessarily fancy phrasing where a simpler one says the same thing.

Bad (overwritten):
> This methodology leverages undulating periodization to facilitate optimal neuromuscular adaptations across multiple training variables.

Bad (too dumbed down):
> This program changes things up so your muscles keep growing.

Good (plain but precise):
> The program uses undulating periodization - rep ranges change each session. Heavy one day, moderate the next, light after that. This keeps progress going longer than repeating the same sets and reps every workout.

## Core Principles

1. **Be direct and specific.** Lead with the answer, not the reasoning. "Add 5lb to bench press every successful session" - not "progressively increase the weight over time."
2. **Use concrete numbers.** Sets, reps, percentages, pounds. Vague descriptions waste the reader's time.
3. **Don't pad.** If a section has 2 bullet points of real content, that's fine. Don't stretch it to 5.
4. **Write for gym-literate readers.** Assume they know sets, reps, 1RM, AMRAP. Don't explain basics. But don't assume they know the specific program or technique you're describing.

## Sentence Rhythm

**Vary sentence length deliberately.** Same-length sentences are boring and hard to scan.

Mix short sentences (3-8 words) with longer ones that add detail. Use fragments where they feel natural. This makes text easier to skim - readers grab key points from short sentences and read longer ones when they want more.

Bad (monotonous):
> This program uses linear progression for the main lifts. You will add weight to the bar each session. The rep scheme is based on 5 sets of 5 reps. You should rest 3-5 minutes between sets.

Good (varied rhythm):
> Linear progression on the main lifts. Add 5lb to upper body and 10lb to lower body each session - simple and effective. Rest 3-5 minutes between heavy sets. The 5x5 scheme builds both strength and technique through volume at moderate intensity.

## Conversational Patterns

Use these naturally - don't force them, but don't avoid them either:

- **Dashes for asides** - parenthetical context that adds nuance without breaking flow
- **"Turns out" / "it turns out"** for discovery language when revealing non-obvious facts
- **"So," at sentence starts** to connect thoughts conversationally
- **"Pretty" as a softener** - "pretty straightforward", "pretty hard to mess up"
- **"Way" as an intensifier** - "way harder", "way more clear"
- **Short emphatic fragments** - "That's it." "Simple and effective."
- **Questions as headers** - "What the heck is RPE?" reads better than "RPE Explained"
- **Direct reassurance** - "Don't be afraid to choose lighter weights" instead of "It is advisable to err on the side of caution with initial load selection"

## Problem-Solution Framing

When describing features or changes, lead with the problem users had, then show the solution. This makes the reader immediately understand WHY something exists.

Bad:
> Added a new Exercises screen with 1RM editing capabilities.

Good:
> A lot of users found it weird you can only adjust 1RM during a workout. So now there's a separate Exercises screen where you can change it anytime.

Bad:
> Implemented weight rounding visualization with strikethrough formatting.

Good:
> It's confusing when the app rounds your weights to available plates - looks like a bug. So now it shows strikethrough on the original weight, making it clear what happened.

## Specificity Over Vagueness

Bad:
- "Well-balanced program"
- "Can be complex"
- "Good for hypertrophy"
- "Progressively increase the weight over time"

Good:
- "High frequency on main lifts (squat/bench 2x/week) builds technique fast"
- "Sessions can take 90+ minutes due to 9 working sets of T1"
- "Adds volume to isolation exercises without making sessions longer"
- "Add 5lb each session you complete all reps"

## Handling Complexity

When something sounds complicated, acknowledge it and then show it's manageable:

> "It sounds pretty complicated, but should be way more clear when you look at the example below."

Concrete walkthrough examples beat abstract explanations. Show specific numbers:

> "For instance, if you can do 5 reps (and no more) with 100 kg, then your 5 rep max is 100 kg. Let's say you guessed your 10RM for Bench Press is 185lb. So, you do: 5 reps with empty bar, 5 reps with 95lb, 3 reps with 135lb, 10 reps with 185lb."

## Pros & Cons

When writing pros and cons, every item must be **concrete and actionable**.

- State the specific advantage or disadvantage
- Include numbers where relevant (session length, frequency, weight increments)
- Explain WHY it's a pro or con, not just WHAT it is

Do NOT list "lack of exercise variety" as a con. Repeating the same exercises builds technique, enables progressive overload tracking, and is how every proven program works.

## Explanations

When explaining WHY something is done, keep it to 1-2 sentences. Don't lecture. The reader wants the reason, not a textbook chapter.

## FAQ Style

- Questions should sound like real Google searches: "Is GZCLP good for beginners?" - not "Suitability for novice trainees"
- Answers: 2-4 sentences, direct and specific
- Don't repeat information word-for-word from the main description - rephrase and summarize
- Include the program/technique name in at least 2-3 questions for SEO

## Whatsnew / Changelog Style

- Lead with what changed, not "We're excited to announce"
- Frame features by the user problem they solve
- Be honest when changes might break things: "This is a breaking change! If you use this feature, you likely would need to change your program"
- Invite bug reports directly: "Could be bugs - don't hesitate to email me"
- Thank contributors by name when applicable
- Keep entries scannable with bullet points for multi-part updates

## What to Avoid

- Filler words and preamble ("We're excited to announce", "We're thrilled")
- Restating what the reader already knows
- Generic advice that applies to everything ("listen to your body", "consistency is key")
- Overly academic or marketing tone
- Corporate "we" - use "I" for the developer voice, or just describe the feature directly
- Fancy words where simple ones work ("utilize" -> "use", "facilitate" -> "help")
- Emojis (unless the user explicitly requests them)
- Fancy Unicode characters - no emdashes, curly quotes, bullet dots, or other non-ASCII punctuation. Use plain ASCII: hyphens (-), straight quotes (""), asterisks (*) for lists, etc.
- Double hyphens (`--`) for dashes - use a single hyphen (`-`) instead. "Linear progression on the main lifts - simple and effective" not "Linear progression on the main lifts -- simple and effective".
