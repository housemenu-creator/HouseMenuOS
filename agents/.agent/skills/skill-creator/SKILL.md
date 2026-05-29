---
name: skill-creator
description: Meta-skill to design and create new Antigravity skills from scratch
version: 1.0.0
author: Antigravity System
---

# Skill Creator - Meta Skill

> **Purpose**: This is a "meta-skill" that guides the creation of new, high-quality Antigravity skills. Use it whenever you need to teach Claude how to perform a specialized task consistently.

---

## 🎯 When to Use This Skill

Invoke this skill when:
1. A task is **repetitive** and would benefit from standardization
2. A task requires **specialized knowledge** that Claude doesn't have by default
3. You want to **encode best practices** for a specific domain (e.g., "React Native App Creation")
4. You need **custom scripts or templates** to accelerate a workflow

---

## 📁 Skill Anatomy

Every skill lives in `.agent/skills/<skill-name>/` and contains:

```
.agent/skills/<skill-name>/
├── SKILL.md              # REQUIRED: Main instruction file (this is what Claude reads)
├── scripts/              # Optional: Helper scripts (Python, Bash, Node, etc.)
│   └── validate.py
├── templates/            # Optional: Starter files for projects
│   └── component.tsx.template
├── examples/             # Optional: Reference implementations
│   └── good_example.ts
└── resources/            # Optional: Additional assets (configs, data files)
    └── defaults.json
```

---

## 📝 SKILL.md Structure

The `SKILL.md` file is the brain of the skill. It MUST follow this structure:

```yaml
---
name: <skill-name>           # kebab-case, unique identifier
description: <one-liner>     # What the skill does (shown in skill listings)
version: <semver>            # e.g., 1.0.0
author: <name>               # Optional
---
```

After the frontmatter, use Markdown with these sections:

### Required Sections

1. **Purpose** - One paragraph explaining the skill's goal
2. **When to Use** - Bullet list of scenarios that trigger this skill
3. **Step-by-Step Instructions** - Numbered, actionable steps Claude must follow
4. **Constraints/Rules** - MUST/MUST NOT rules to prevent common errors
5. **Verification Checklist** - How to confirm the skill executed correctly

### Optional Sections

- **Scripts Reference** - How to use any helper scripts
- **Templates Reference** - How to use any templates
- **Examples** - Links to example implementations
- **Troubleshooting** - Common issues and fixes

---

## 🔧 Creating a New Skill (Step-by-Step)

### Step 1: Define the Problem
Ask yourself:
- What task am I trying to automate/standardize?
- What mistakes do I want to prevent?
- What context does Claude need?

### Step 2: Create the Directory
```bash
mkdir -p .agent/skills/<skill-name>
```

### Step 3: Write SKILL.md
Use this template:

```markdown
---
name: <skill-name>
description: <what-it-does>
version: 1.0.0
---

# <Skill Title>

## Purpose
<Explain the goal in 2-3 sentences>

## When to Use
- <Trigger condition 1>
- <Trigger condition 2>

## Instructions

### Phase 1: <Setup>
1. <Step 1>
2. <Step 2>

### Phase 2: <Execution>
1. <Step 1>
2. <Step 2>

## Rules
- **MUST**: <Required behavior>
- **MUST NOT**: <Forbidden behavior>
- **SHOULD**: <Recommended behavior>

## Verification
- [ ] <Check 1>
- [ ] <Check 2>
```

### Step 4: Add Scripts (Optional)
If the skill needs automation, add scripts:
```python
# scripts/setup.py
"""
Usage: python scripts/setup.py <arg1>
Description: Sets up the project structure
"""
```

### Step 5: Add Templates (Optional)
Create `.template` files that Claude can copy and customize:
```tsx
// templates/component.tsx.template
import React from 'react';

interface {{COMPONENT_NAME}}Props {
    // TODO: Add props
}

export function {{COMPONENT_NAME}}({}: {{COMPONENT_NAME}}Props) {
    return (
        <div>
            {/* TODO: Implement */}
        </div>
    );
}
```

### Step 6: Test the Skill
1. Start a new conversation
2. Reference the skill: "Use the `<skill-name>` skill to..."
3. Verify Claude follows all instructions correctly

---

## 📋 Skill Quality Checklist

Before finalizing a skill, verify:

- [ ] **Frontmatter is valid YAML** (name, description, version)
- [ ] **Instructions are atomic** (each step is one action)
- [ ] **Rules are explicit** (MUST/MUST NOT/SHOULD)
- [ ] **Verification steps exist** (how to know it worked)
- [ ] **Edge cases are covered** (what if X fails?)
- [ ] **Scripts are documented** (usage comments at top)
- [ ] **Templates use placeholders** (e.g., `{{NAME}}`)

---

## 🚀 Example Skills to Create

| Skill Name | Description |
|------------|-------------|
| `react-component` | Create consistent React components with tests |
| `api-endpoint` | Add new REST endpoints with validation |
| `firebase-collection` | Set up Firestore collections with rules |
| `deploy-vercel` | Deploy to Vercel with environment setup |
| `security-audit` | Audit codebase for common vulnerabilities |
| `ai-integration` | Connect to OpenAI/Anthropic APIs properly |

---

## 🛠️ Pro Tips

1. **Keep skills focused**: One skill = One job. Don't create mega-skills.
2. **Use scripts for validation**: Write Python/Bash scripts to check outputs.
3. **Version your skills**: Bump version when making breaking changes.
4. **Document failures**: Add troubleshooting sections for known issues.
5. **Test with edge cases**: Try to break the skill before shipping.

---

## 📎 Related Resources

- **Workflows** (`.agent/workflows/`) - For linear, step-by-step procedures
- **Knowledge Items** (KIs) - For persistent domain knowledge
- **Artifacts** - For conversation-specific documents

---

*This meta-skill was created to help you build an ecosystem of reusable, reliable automation around your projects.*
