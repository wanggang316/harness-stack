// Test fixture: an sdk adapter factory that returns a deterministic runner.
export function createHsLlmAdapter({ providerName, environment }) {
  return {
    async runTask({ agent, request }) {
      return {
        agentId: agent.agent.id,
        providerModel: agent.model.id,
        text: `SDK[${providerName}|${environment.SDK_TEST_MARKER ?? "no-marker"}]: ${request.prompt}`,
        finishReason: "stop",
        latencyMs: 0,
        reasoningApplied: false
      };
    }
  };
}
