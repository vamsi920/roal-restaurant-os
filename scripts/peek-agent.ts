import { getConvaiAgent } from "../lib/elevenlabs";

void (async () => {
  const id = process.env.ELEVENLABS_AGENT_ID?.trim();
  if (!id) throw new Error("ELEVENLABS_AGENT_ID");
  const a = (await getConvaiAgent(id)) as Record<string, unknown>;
  const cc = a.conversation_config as Record<string, unknown> | undefined;
  const agent = cc?.agent as Record<string, unknown> | undefined;
  const pr = agent?.prompt as Record<string, unknown> | undefined;
  const wf = a.workflow as { nodes?: unknown[] } | undefined;
  const asr = cc?.asr;
  const conv = cc?.conversation;
  const turn = cc?.turn;
  console.log("asr_slice", JSON.stringify(asr)?.slice(0, 600));
  console.log("conversation_slice", JSON.stringify(conv)?.slice(0, 900));
  console.log("turn_slice", JSON.stringify(turn)?.slice(0, 1200));
  console.log(
    JSON.stringify(
      {
        topKeys: Object.keys(a),
        conversationConfigKeys: cc ? Object.keys(cc) : [],
        hasWorkflowObject: "workflow" in a && !!a.workflow,
        workflowNodeCount: wf?.nodes?.length ?? 0,
        promptKeys: pr ? Object.keys(pr) : [],
        toolIdCount: Array.isArray(pr?.tool_ids) ? pr.tool_ids.length : 0,
        agentKeys: agent ? Object.keys(agent) : [],
        llm: pr?.llm,
        built_in_tools: pr?.built_in_tools,
        knowledge_base: pr?.knowledge_base,
        first_message_preview:
          typeof agent?.first_message === "string"
            ? agent.first_message.slice(0, 120)
            : agent?.first_message,
      },
      null,
      2
    )
  );
})();
