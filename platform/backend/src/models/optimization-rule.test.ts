import { beforeEach, describe, expect, test } from "@/test";
import type { OptimizationRule } from "@/types";
import AgentModel from "./agent";
import OptimizationRuleModel from "./optimization-rule";

describe("OptimizationRuleModel.matchByRules", () => {
  let organizationId: string;

  beforeEach(async ({ makeOrganization }) => {
    const org = await makeOrganization();
    organizationId = org.id;
  });

  test("matches rule when all conditions are met", async () => {
    const rules: OptimizationRule[] = [
      {
        id: "test-rule-1",
        entityType: "organization",
        entityId: organizationId,
        conditions: [{ maxLength: 1000 }, { hasTools: false }],
        provider: "openai",
        targetModel: "gpt-4o-mini",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const context = {
      tokenCount: 500,
      hasTools: false,
    };

    const result = OptimizationRuleModel.matchByRules(rules, context);

    expect(result).toBe("gpt-4o-mini");
  });

  test("does not match rule when conditions are not met", async () => {
    const rules: OptimizationRule[] = [
      {
        id: "test-rule-1",
        entityType: "organization",
        entityId: organizationId,
        conditions: [{ maxLength: 1000 }, { hasTools: false }],
        provider: "openai",
        targetModel: "gpt-4o-mini",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Token count exceeds maxLength
    const context = {
      tokenCount: 1500,
      hasTools: false,
    };

    const result = OptimizationRuleModel.matchByRules(rules, context);

    expect(result).toBeNull();
  });

  test("does not match when hasTools condition fails", async () => {
    const rules: OptimizationRule[] = [
      {
        id: "test-rule-1",
        entityType: "organization",
        entityId: organizationId,
        conditions: [{ hasTools: false }],
        provider: "openai",
        targetModel: "gpt-4o-mini",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // hasTools doesn't match
    const context = {
      tokenCount: 500,
      hasTools: true,
    };

    const result = OptimizationRuleModel.matchByRules(rules, context);

    expect(result).toBeNull();
  });

  test("returns first matching rule when multiple rules exist", async () => {
    const rules: OptimizationRule[] = [
      {
        id: "test-rule-1",
        entityType: "organization",
        entityId: organizationId,
        conditions: [{ maxLength: 1000 }],
        provider: "openai",
        targetModel: "gpt-4o-mini",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "test-rule-2",
        entityType: "organization",
        entityId: organizationId,
        conditions: [{ maxLength: 2000 }],
        provider: "openai",
        targetModel: "gpt-4o",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const context = {
      tokenCount: 500,
      hasTools: false,
    };

    const result = OptimizationRuleModel.matchByRules(rules, context);

    // Should return the first matching rule
    expect(result).toBe("gpt-4o-mini");
  });

  test("skips disabled rules", async () => {
    const rules: OptimizationRule[] = [
      {
        id: "test-rule-1",
        entityType: "organization",
        entityId: organizationId,
        conditions: [{ maxLength: 1000 }],
        provider: "openai",
        targetModel: "gpt-4o-mini",
        enabled: false, // Disabled
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const context = {
      tokenCount: 500,
      hasTools: false,
    };

    const result = OptimizationRuleModel.matchByRules(rules, context);

    expect(result).toBeNull();
  });
});

describe("OptimizationRuleModel.findEnabledApplicableToAgent", () => {
  test("returns only enabled provider rules applicable to the agent, ordered by specificity", async ({
    makeAgent,
    makeOrganization,
    makeTeam,
    makeUser,
  }) => {
    const org = await makeOrganization();
    const otherOrg = await makeOrganization();
    const user = await makeUser();
    const team = await makeTeam(org.id, user.id);
    const otherTeam = await makeTeam(org.id, user.id);
    const agent = await makeAgent({
      organizationId: org.id,
      scope: "team",
      teams: [team.id],
    });
    const otherAgent = await makeAgent({ organizationId: org.id });

    const organizationRule = await OptimizationRuleModel.create({
      entityType: "organization",
      entityId: org.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "org-model",
      enabled: true,
    });
    const teamRule = await OptimizationRuleModel.create({
      entityType: "team",
      entityId: team.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "team-model",
      enabled: true,
    });
    const agentRule = await OptimizationRuleModel.create({
      entityType: "agent",
      entityId: agent.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "agent-model",
      enabled: true,
    });

    await OptimizationRuleModel.create({
      entityType: "team",
      entityId: otherTeam.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "other-team-model",
      enabled: true,
    });
    await OptimizationRuleModel.create({
      entityType: "agent",
      entityId: otherAgent.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "other-agent-model",
      enabled: true,
    });
    await OptimizationRuleModel.create({
      entityType: "organization",
      entityId: otherOrg.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "other-org-model",
      enabled: true,
    });
    await OptimizationRuleModel.create({
      entityType: "organization",
      entityId: org.id,
      conditions: [{ maxLength: 1000 }],
      provider: "anthropic",
      targetModel: "wrong-provider-model",
      enabled: true,
    });
    await OptimizationRuleModel.create({
      entityType: "organization",
      entityId: org.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "disabled-model",
      enabled: false,
    });

    const rules = await OptimizationRuleModel.findEnabledApplicableToAgent({
      organizationId: org.id,
      agentId: agent.id,
      teamIds: [team.id],
      provider: "openai",
    });

    expect(rules.map((rule) => rule.id)).toEqual([
      agentRule.id,
      teamRule.id,
      organizationRule.id,
    ]);
  });

  test("ignores team rules for cross-organization agent-team assignments", async ({
    makeAgent,
    makeOrganization,
    makeTeam,
    makeUser,
  }) => {
    const agentOrg = await makeOrganization();
    const foreignOrg = await makeOrganization();
    const user = await makeUser();
    const foreignTeam = await makeTeam(foreignOrg.id, user.id);
    const agent = await makeAgent({
      organizationId: agentOrg.id,
      scope: "team",
      teams: [foreignTeam.id],
    });
    const organizationRule = await OptimizationRuleModel.create({
      entityType: "organization",
      entityId: agentOrg.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "agent-org-model",
      enabled: true,
    });

    await OptimizationRuleModel.create({
      entityType: "team",
      entityId: foreignTeam.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "foreign-team-model",
      enabled: true,
    });

    const rules = await OptimizationRuleModel.findEnabledApplicableToAgent({
      organizationId: agentOrg.id,
      agentId: agent.id,
      teamIds: [foreignTeam.id],
      provider: "openai",
    });

    expect(rules.map((rule) => rule.id)).toEqual([organizationRule.id]);
  });
});

describe("OptimizationRuleModel soft-deleted agents", () => {
  test("excludes agent rules whose target agent is deleted", async ({
    makeAgent,
    makeOrganization,
  }) => {
    const org = await makeOrganization();
    const activeAgent = await makeAgent({ organizationId: org.id });
    const deletedAgent = await makeAgent({ organizationId: org.id });
    const activeRule = await OptimizationRuleModel.create({
      entityType: "agent",
      entityId: activeAgent.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "gpt-4o-mini",
      enabled: true,
    });
    const deletedRule = await OptimizationRuleModel.create({
      entityType: "agent",
      entityId: deletedAgent.id,
      conditions: [{ maxLength: 1000 }],
      provider: "openai",
      targetModel: "gpt-4o-mini",
      enabled: true,
    });

    await AgentModel.delete(deletedAgent.id);

    await expect(
      OptimizationRuleModel.entityBelongsToOrganization(
        "agent",
        deletedAgent.id,
        org.id,
      ),
    ).resolves.toBe(false);

    const rules = await OptimizationRuleModel.findByOrganizationId(org.id);
    expect(rules.map((rule) => rule.id)).toEqual([activeRule.id]);

    await expect(
      OptimizationRuleModel.findByIdForOrganization(deletedRule.id, org.id),
    ).resolves.toBeNull();
    await expect(
      OptimizationRuleModel.findByIdForAudit(deletedRule.id, org.id),
    ).resolves.toBeNull();
  });
});
