import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptimizationRuleForm } from "./rule";

vi.mock("@/components/llm-model-picker", () => ({
  LlmModelPicker: () => <div>Model picker</div>,
}));

describe("OptimizationRuleForm", () => {
  it("shows the selected agent for agent-scoped rules", () => {
    render(
      <OptimizationRuleForm
        enabled
        entityType="agent"
        entityId="agent-1"
        conditions={[{ maxLength: 1000 }]}
        provider="openai"
        targetModel="gpt-4o-mini"
        tokenPrices={[]}
        teams={[]}
        agents={[
          {
            id: "agent-1",
            name: "Research Agent",
            description: null,
          },
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Research Agent")).toBeInTheDocument();
  });
});
