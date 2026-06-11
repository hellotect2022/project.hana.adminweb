import privateApi from "./api";

export const SOP_TEMPLATES_QUERY_KEY = ["sop", "templates"];
export const sopTemplateKey = (templateId) => ["sop", "templates", templateId];

export async function fetchSopTemplates(activeOnly = false) {
  const { data } = await privateApi.get("/sop/templates", {
    params: { activeOnly },
  });
  return data?.data ?? [];
}

export async function fetchSopTemplate(templateId) {
  const { data } = await privateApi.get(`/sop/templates/${templateId}`);
  return data?.data;
}

export async function createSopTemplate(body) {
  const { data } = await privateApi.post("/sop/templates", body);
  return data?.data ?? data;
}

export async function updateSopTemplate(templateId, body) {
  const { data } = await privateApi.put(`/sop/templates/${templateId}`, body);
  return data;
}

export async function saveSopTemplateStructure(templateId, structure) {
  const { data } = await privateApi.put(`/sop/templates/${templateId}/structure`, structure);
  return data?.data;
}

export async function fetchEventInstances(limit = 10) {
  const { data } = await privateApi.get("/events/instances", { params: { limit } });
  return data?.data ?? [];
}

export async function createEventInstance(body) {
  const { data } = await privateApi.post("/events/instances", body);
  return data;
}

export async function fetchEventDisplay(eventId) {
  const { data } = await privateApi.get(`/events/instances/${eventId}/display`);
  return data?.data;
}

export async function clickSopButton(instanceId, buttonKey, body = {}) {
  const { data } = await privateApi.post(
    `/sop/instances/${instanceId}/buttons/${buttonKey}/click`,
    body
  );
  return data?.data;
}
