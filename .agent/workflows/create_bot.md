---
description: Workflow for creating a new bot from scratch, including profile, personality, greetings, and export.
---

# Creating a New Bot from Scratch

1. **Click "New Bot"**
   - Use the `ChatbotManager.createChatbot` API or click the "New Bot" button in UI.

2. **Fill Basic Profile**
   - Name: "Alex" (or user choice)
   - Category: Educational Character
   - Avatar: Upload image
   - Description: "Curious student who loves science"

3. **Build Personality (PromptWaffle)**
   - Add traits (e.g., "Curious")
   - Add custom backstory
   - Compile system prompt
   - Verify token count (approx 450)

4. **Add Greetings**
   - Write default greeting
   - Add scenario variants (e.g. "scenario_science")
   - Preview how they read

5. **Create Example Dialogues**
   - Add 5 conversation examples
   - Tag by scenario type
   - Show personality consistency

6. **Configure Settings**
   - Select model: GPT-4
   - Set temperature: 0.8
   - Define memory approach: WindowBuffer
   - Save as preset

7. **Validate & Review**
   - Run quality check (ensure required fields and minimal examples)
   - Fix any warnings
   - Preview full character sheet

8. **Save & Export**
   - Save as v1.0 "Initial Release"
   - Export as Character.AI PNG (Requires `png-chunk-text` or similar)
   - Export markdown doc for reference
   - Tag: #complete #educational #tested
