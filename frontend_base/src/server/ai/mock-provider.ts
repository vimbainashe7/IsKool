import type { TeacherAiDraft, TeacherAiProvider, TeacherAiRequest } from "./provider"

const labels = {
  "compile-notes": "Compiled Notes",
  "create-test": "Test Paper",
  "create-assignment": "Assignment Brief",
} as const

export class MockTeacherAiProvider implements TeacherAiProvider {
  async generateDraft(input: TeacherAiRequest): Promise<TeacherAiDraft> {
    const topic = input.prompt.trim() || "the selected topic"
    const title = `${labels[input.tool]}: ${topic}`

    if (input.tool === "create-test") {
      return {
        title,
        body: [
          `# ${title}`,
          "",
          "Duration: 45 minutes",
          "Total: 30 marks",
          "Mode: Teacher-reviewed draft. Edit before publishing.",
          "",
          "## Section A: Short Answer",
          `1. Define the key terms linked to ${topic}. (4 marks)`,
          `2. Explain two classroom examples where ${topic} applies. (6 marks)`,
          `3. Identify one common mistake learners make with ${topic}. (4 marks)`,
          "",
          "## Section B: Structured Response",
          `4. Work through a full problem or scenario based on ${topic}. Show all steps. (10 marks)`,
          "",
          "## Section C: Reflection",
          `5. Write a short paragraph explaining why ${topic} matters beyond the classroom. (6 marks)`,
          "",
          "## Marking Guide",
          "- Award method marks for clear reasoning.",
          "- Award accuracy marks for correct final answers.",
          "- Give feedback on missing working, unclear definitions, and weak examples.",
          "",
          "## Publication Checklist",
          "- Confirm class, subject, due date, and time limit.",
          "- Attach any diagrams or source material.",
          "- Publish only after teacher approval.",
        ].join("\n"),
        status: "draft",
      }
    }

    if (input.tool === "create-assignment") {
      return {
        title,
        body: [
          `# ${title}`,
          "",
          "## Task",
          `Create a neat, well-explained response about ${topic}. Use class notes and at least one example of your own.`,
          "",
          "## Submission Requirements",
          "- Submit one PDF or clear photo scan.",
          "- Include your name, class, and date.",
          "- Show your working or planning where relevant.",
          "",
          "## Rubric",
          "- Understanding: 10 marks",
          "- Accuracy and evidence: 10 marks",
          "- Presentation: 5 marks",
          "- Reflection: 5 marks",
          "",
          "## Teacher Review Notes",
          "Check that the due date, class level, and rubric match the lesson plan before publishing.",
        "",
        "## Publication Checklist",
        "- Confirm class, subject, and deadline.",
        "- Attach teacher materials if needed.",
        "- Publish to enrolled learners only.",
        ].join("\n"),
        status: "draft",
      }
    }

    return {
      title,
      body: [
        `# ${title}`,
        "",
        "## Learning Objectives",
        `- Understand the main ideas behind ${topic}.`,
        `- Apply ${topic} to classroom examples.`,
        "- Identify common errors and correct them.",
        "",
        "## Teacher Notes",
        `Introduce ${topic} with a short recap of prior knowledge. Use one worked example, then ask learners to explain each step in pairs.`,
        "",
        "## Key Points",
        `- Start with the definition or core rule for ${topic}.`,
        "- Model one simple example before increasing difficulty.",
        "- Ask learners to justify answers, not only give final responses.",
        "",
        "## Class Activity",
        `Learners complete three practice questions on ${topic}, then compare answers with a partner.`,
        "",
        "## Exit Ticket",
        `Write one thing you understand about ${topic} and one question you still have.`,
        "",
        "## Teacher Review Notes",
        "- Add school-specific examples.",
        "- Attach diagrams or source extracts where useful.",
        "- Publish as notes only after review.",
      ].join("\n"),
      status: "draft",
    }
  }
}
