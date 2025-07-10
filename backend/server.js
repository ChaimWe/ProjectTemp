import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  WAFV2Client,
  ListWebACLsCommand,
  GetWebACLCommand,
  GetRuleGroupCommand
} from "@aws-sdk/client-wafv2";

// FIX: Use default import for ELBv2Client and DescribeLoadBalancersCommand
import elbv2Pkg from "@aws-sdk/client-elastic-load-balancing-v2";
const { ELBv2Client, DescribeLoadBalancersCommand } = elbv2Pkg;

dotenv.config();
const app = express();
app.use(cors());


app.get("/api/waf-acls-names/region/:region", async (req, res) => {
  try {
    const regionParam = req.params.region;
    console.log(`Fetching WAF ACLs for region: ${regionParam}`);

    const scope = regionParam.toUpperCase() === "CLOUDFRONT" || regionParam.toUpperCase() === "GLOBAL"
      ? "CLOUDFRONT"
      : "REGIONAL";

    const clientConfig = scope === "CLOUDFRONT"
      ? { region: process.env.AWS_REGION || "us-east-1" }
      : { region: regionParam };

    const wafClientForRegion = new WAFV2Client(clientConfig);

    const command = new ListWebACLsCommand({ Scope: scope });
    const response = await wafClientForRegion.send(command);
    const acls = response.WebACLs || [];

    const aclNames = acls.map(acl => acl.Name);

    res.json(aclNames);
  } catch (error) {
    console.error("Error fetching WAF ACLs for region:", error);
    res.status(500).json({ error: "Error fetching WAF ACLs" });
  }
});


app.get("/api/waf-acl-details/region/:region/name/:name", async (req, res) => {
  try {
    const { region, name } = req.params;
    console.log(`🚀 Fetching ACL details for region: ${region}, name: ${name}`);

    const scope =
      region.toUpperCase() === "CLOUDFRONT" || region.toUpperCase() === "GLOBAL"
        ? "CLOUDFRONT"
        : "REGIONAL";

    const clientConfig =
      scope === "CLOUDFRONT"
        ? { region: process.env.AWS_REGION || "us-east-1" } 
        : { region };
    const wafClientForRegion = new WAFV2Client(clientConfig);

    const listCommand = new ListWebACLsCommand({ Scope: scope });
    const listResponse = await wafClientForRegion.send(listCommand);
    const acls = listResponse.WebACLs || [];

    const acl = acls.find(item => item.Name === name);
    if (!acl) {
      return res.status(404).json({ error: `ACL with name ${name} not found in region ${region}` });
    }

    const getCommand = new GetWebACLCommand({
      Id: acl.Id,
      Name: acl.Name,
      Scope: scope
    });
    const aclDetailsResponse = await wafClientForRegion.send(getCommand);
    let details = aclDetailsResponse.WebACL;
    if (!details) {
      return res.status(404).json({ error: `ACL details for ${name} not found` });
    }

    if (details.Rules) {
      details.Rules = await Promise.all(details.Rules.map(async rule => {
        if (rule.Statement?.RuleGroupReferenceStatement) {
          const rgArn = rule.Statement.RuleGroupReferenceStatement.ARN;
          try {
            const rgCommand = new GetRuleGroupCommand({
              ARN: rgArn,
              Scope: scope
            });
            const rgResponse = await wafClientForRegion.send(rgCommand);
            rule.RuleGroup = rgResponse.RuleGroup;
          } catch (error) {
            console.error(`❌ Error fetching rule group for ARN ${rgArn}:`, error);
          }
        }
        return rule;
      }));
    }

    res.json(details);
  } catch (error) {
    console.error("❌ Error in /api/waf-acl-details:", error);
    res.status(500).json({ error: "Error fetching ACL details" });
  }
});

// Mock ALB data
const mockAlbs = [
  { id: '1', name: 'ALB-1', region: 'us-east-1', attachedAcls: ['acl-1', 'acl-2'] },
  { id: '2', name: 'ALB-2', region: 'us-west-2', attachedAcls: ['acl-3'] },
];

// Mock ACL data
const mockAcls = [
  { id: 'acl-1', name: 'ACL-1', rules: [] },
  { id: 'acl-2', name: 'ACL-2', rules: [] },
  { id: 'acl-3', name: 'ACL-3', rules: [] },
];

// Helper to fetch ALB from AWS
async function fetchAlbFromAws(albId) {
  const client = new ELBv2Client({ region: process.env.AWS_REGION });
  const command = new DescribeLoadBalancersCommand({ LoadBalancerArns: [albId] });
  const response = await client.send(command);
  if (response.LoadBalancers && response.LoadBalancers.length > 0) {
    const alb = response.LoadBalancers[0];
    return {
      id: alb.LoadBalancerArn,
      name: alb.LoadBalancerName,
      region: process.env.AWS_REGION,
      dnsName: alb.DNSName,
      type: alb.Type,
      scheme: alb.Scheme,
      state: alb.State?.Code,
      vpcId: alb.VpcId,
      // attachedAcls: [] // You can add logic to fetch attached ACLs if needed
    };
  }
  return null;
}

// Endpoint for ALB details (real AWS)
app.get('/api/alb/:albId', async (req, res) => {
  const { albId } = req.params;
  try {
    const alb = await fetchAlbFromAws(albId);
    if (!alb) {
      return res.status(404).json({ error: `ALB with id ${albId} not found in AWS` });
    }
    res.json(alb);
  } catch (err) {
    console.error('Error fetching ALB from AWS:', err);
    // Fallback to mock data if AWS call fails
    const alb = mockAlbs.find(a => a.id === albId);
    if (alb) {
      return res.json(alb);
    }
    res.status(500).json({ error: 'Error fetching ALB from AWS and no mock data available.' });
  }
});

// Endpoint for ALB+ACL details (real AWS for ALB, mock for ACL)
app.get('/api/alb-acl/:albId/:aclId', async (req, res) => {
  const { albId, aclId } = req.params;
  try {
    const alb = await fetchAlbFromAws(albId);
    const acl = mockAcls.find(a => a.id === aclId); // Replace with real ACL fetch if needed
    if (!alb || !acl) {
      return res.status(404).json({ error: `ALB or ACL not found` });
    }
    res.json({ alb, acl });
  } catch (err) {
    console.error('Error fetching ALB+ACL from AWS:', err);
    // Fallback to mock data if AWS call fails
    const fallbackAlb = mockAlbs.find(a => a.id === albId);
    const fallbackAcl = mockAcls.find(a => a.id === aclId);
    if (fallbackAlb && fallbackAcl) {
      return res.json({ alb: fallbackAlb, acl: fallbackAcl });
    }
    res.status(500).json({ error: 'Error fetching ALB+ACL from AWS and no mock data available.' });
  }
});

// Endpoint to check if AWS credentials are present
app.get('/api/aws-credentials-status', (req, res) => {
  const hasCredentials = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION);
  res.json({ hasCredentials });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});