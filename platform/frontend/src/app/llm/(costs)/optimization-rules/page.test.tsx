import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OptimizationRulesPage from "./page";

const mockSetCostsAction = vi.fn();
const mockUseOptimizationRules = vi.fn();

vi.mock("@/app/llm/(costs)/layout", () => ({
  useSetCostsAction: () => mockSetCostsAction,
}));

vi.mock("@/lib/optimization-rule.query", () => ({
  useOptimizationRules: () => mockUseOptimizationRules(),
  useCreateOptimizationRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateOptimizationRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteOptimizationRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/teams/team.query", () => ({
  useTeams: () => ({ data: [{ id: "team-1", name: "Finance" }] }),
}));

vi.mock("@/lib/agent.query", () => ({
  useProfiles: () => ({
    data: [
      {
        id: "agent-1",
        name: "Research Agent",
        agentType: "agent",
        description: null,
      },
    ],
  }),
}));

vi.mock("@/lib/organization.query", () => ({
  useOrganization: () => ({ data: { id: "org-1" } }),
}));

vi.mock("@/lib/llm-models.query", () => ({
  useModelsWithApiKeys: () => ({
    data: [
      {
        modelId: "gpt-4o-mini",
        provider: "openai",
        pricePerMillionInput: "0.15",
        pricePerMillionOutput: "0.60",
      },
    ],
  }),
}));

vi.mock("@/lib/hooks/use-data-table-query-params", () => ({
  useDataTableQueryParams: () => ({
    searchParams: new URLSearchParams(),
    updateQueryParams: vi.fn(),
  }),
}));

vi.mock("@/components/loading", () => ({
  LoadingSpinner: () => <div>Loading</div>,
  LoadingWrapper: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      accessorKey?: string;
      cell?: (info: {
        row: { original: Record<string, unknown> };
      }) => React.ReactNode;
    }>;
  }) => (
    <div>
      {data.map((row) => (
        <div key={String(row.id)} data-testid={`rule-row-${String(row.id)}`}>
          {columns.map((column, index) => (
            <span key={column.accessorKey ?? index}>
              {column.cell
                ? column.cell({ row: { original: row } })
                : column.accessorKey
                  ? String(row[column.accessorKey])
                  : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/permission-button", () => ({
  PermissionButton: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/llm-model-select", () => ({
  LlmModelSearchableSelect: () => <div>Model filter</div>,
}));

vi.mock("@/components/llm-provider-select-items", () => ({
  LlmProviderOptionLabel: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("@/components/form-dialog", () => ({
  FormDialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
}));

vi.mock("@/components/delete-confirm-dialog", () => ({
  DeleteConfirmDialog: () => null,
}));

vi.mock("@/components/table-row-actions", () => ({
  TableRowActions: () => null,
}));

describe("OptimizationRulesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOptimizationRules.mockReturnValue({
      data: [],
      isPending: false,
    });
  });

  it("shows agent as an applied-to filter option", () => {
    render(<OptimizationRulesPage />);

    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("shows agent name in table for agent-scoped rules", () => {
    mockUseOptimizationRules.mockReturnValue({
      data: [
        {
          id: "rule-agent",
          entityType: "agent",
          entityId: "agent-1",
          conditions: [{ maxLength: 1000 }],
          provider: "openai",
          targetModel: "gpt-4o-mini",
          enabled: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      ],
      isPending: false,
    });

    render(<OptimizationRulesPage />);

    const row = screen.getByTestId("rule-row-rule-agent");
    expect(row).toHaveTextContent("Research Agent");
    expect(row).not.toHaveTextContent("Unknown team");
  });
});
