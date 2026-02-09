/**
 * Railway deploy trigger. Requires RAILWAY_API_TOKEN and RAILWAY_SERVICE_ID.
 * Optionally RAILWAY_PROJECT_ID and RAILWAY_ENVIRONMENT_ID for variable upsert.
 * Triggers a new deployment for the service with the given env vars (container receives them).
 */

const RAILWAY_GRAPHQL = "https://backboard.railway.com/graphql/v2";

export interface RailwayDeployParams {
  jobId: string;
  name: string;
  linkerUrl: string;
  deploySecret: string;
  gatewayToken: string;
  appUrl: string;
}

/**
 * Trigger a Railway deployment for the configured service with env vars for this deploy job.
 * The container (clawbot launcher) will receive DEPLOY_JOB_ID, etc., and call /ready when up.
 */
export async function triggerRailwayDeploy(params: RailwayDeployParams): Promise<{ deploymentId?: string }> {
  const token = process.env.RAILWAY_API_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  if (!token || !serviceId) {
    return {};
  }

  const env = process.env.RAILWAY_ENVIRONMENT_ID;
  const variables = [
    { name: "DEPLOY_JOB_ID", value: params.jobId },
    { name: "LINKER_URL", value: params.linkerUrl },
    { name: "NEXT_PUBLIC_APP_URL", value: params.appUrl },
    { name: "DEPLOY_SECRET", value: params.deploySecret },
    { name: "BOT_NAME", value: params.name },
    { name: "GATEWAY_TOKEN", value: params.gatewayToken },
    { name: "IDENTITY_PUBLIC_URL", value: "" },
    { name: "GATEWAY_PUBLIC_URL", value: "" },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (env) {
    try {
      const upsertRes = await fetch(RAILWAY_GRAPHQL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: `
            mutation VariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
              variableCollectionUpsert(input: $input)
            }
          `,
          variables: {
            input: {
              projectId: process.env.RAILWAY_PROJECT_ID,
              environmentId: env,
              serviceId,
              variables: variables.map((v) => ({ name: v.name, value: v.value })),
            },
          },
        }),
      });
      if (!upsertRes.ok) {
        console.warn("Railway variable upsert failed:", await upsertRes.text());
      }
    } catch (e) {
      console.warn("Railway variable upsert error:", e);
    }
  }

  try {
    const deployRes = await fetch(RAILWAY_GRAPHQL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `
          mutation DeploymentTrigger($input: DeploymentTriggerInput!) {
            deploymentTrigger(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: { serviceId },
        },
      }),
    });

    if (!deployRes.ok) {
      const text = await deployRes.text();
      throw new Error(`Railway deploy failed: ${deployRes.status} ${text}`);
    }

    const json = (await deployRes.json()) as {
      data?: { deploymentTrigger?: { id: string } };
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }
    const deploymentId = json.data?.deploymentTrigger?.id;
    return { deploymentId };
  } catch (e) {
    console.error("Railway trigger error:", e);
    throw e;
  }
}

export function isRailwayConfigured(): boolean {
  return Boolean(process.env.RAILWAY_API_TOKEN?.trim() && process.env.RAILWAY_SERVICE_ID?.trim());
}
