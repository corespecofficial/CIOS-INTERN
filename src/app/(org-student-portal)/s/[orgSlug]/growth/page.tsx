import { redirect } from "next/navigation";
import { getGrowthDashboard } from "@/app/actions/org-growth";
import { GrowthWorkspace } from "@/components/org-operations/growth-workspace";
export const dynamic = "force-dynamic";
export default async function InternGrowthPage({params}:{params:Promise<{orgSlug:string}>}) { const {orgSlug}=await params; const result=await getGrowthDashboard(orgSlug); if(!result.ok) redirect(`/s/${orgSlug}`); return <div style={{maxWidth:1180}}><h1 style={{margin:"0 0 4px",fontSize:26}}>Growth Workspace</h1><p style={{color:"#8892A4",marginTop:0}}>Record verifiable prospects, outreach and assigned content work.</p><GrowthWorkspace orgSlug={orgSlug} {...result.data}/></div> }
