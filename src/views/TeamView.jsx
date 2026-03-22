import { useState, useEffect } from "react";
import T from '../lib/theme';
import { CopyButton } from '../components/ui';

export default function TeamView({ supabase, userId, profile }) {
    const [teamData,setTeamData]=useState(null);
    const [teamLoading,setTeamLoading]=useState(true);
    const [teamDesc,setTeamDesc]=useState("");
    const [teamValueProp,setTeamValueProp]=useState("");
    const [teamGrowthGoal,setTeamGrowthGoal]=useState("");
    const [contentPrefs,setContentPrefs]=useState({success_stories:false,culture:false,training:false,commission_info:false,recruiting_tips:false});
    const [teamSaving,setTeamSaving]=useState(false);
    const [teamSaved,setTeamSaved]=useState(false);
    const [inviteOpen,setInviteOpen]=useState(false);
    const [inviteEmail,setInviteEmail]=useState("");
    const [inviteRole,setInviteRole]=useState("member");
    const [inviteSending,setInviteSending]=useState(false);
    const [inviteMsg,setInviteMsg]=useState("");
    const [pendingInvites,setPendingInvites]=useState([]);
    useEffect(()=>{
      if(!profile?.team_id) return;
      (async()=>{
        setTeamLoading(true);
        const {data}=await supabase.from('teams').select('*').eq('id',profile.team_id).single();
        if(data){
          const {data:mbrs}=await supabase.from('team_members').select('*').eq('team_id',data.id);
          const mIds=(mbrs||[]).map(m=>m.user_id);
          let mProfs=[];
          if(mIds.length>0){const {data:pp}=await supabase.from('profiles').select('id,full_name,email').in('id',mIds);mProfs=pp||[];}
          data.team_members=(mbrs||[]).map(m=>({...m,profiles:mProfs.find(p=>p.id===m.user_id)||{}}));
          setTeamData(data);
          setTeamDesc(data.description||"");
          setTeamValueProp(data.team_info?.value_prop||"");
          setTeamGrowthGoal(data.team_info?.growth_goal||"");
          if(data.team_info?.content_preferences){
            setContentPrefs(prev=>({...prev,...data.team_info.content_preferences}));
          }
          // Load pending invites
          const {data:invites}=await supabase.from('team_invites').select('*').eq('team_id',data.id).eq('status','pending');
          setPendingInvites(invites||[]);
        }
        setTeamLoading(false);
      })();
    },[profile?.team_id]);
    const sendInvite=async()=>{
      if(!inviteEmail.trim()||!teamData) return;
      setInviteSending(true);
      setInviteMsg("");
      try{
        const {error}=await supabase.from('team_invites').insert({team_id:teamData.id,invited_by:userId,email:inviteEmail.trim().toLowerCase(),role:inviteRole,status:'pending'});
        if(error) throw error;
        setInviteMsg(`Invite sent to ${inviteEmail.trim()}`);
        setInviteEmail("");setInviteRole("member");
        const {data:invites}=await supabase.from('team_invites').select('*').eq('team_id',teamData.id).eq('status','pending');
        setPendingInvites(invites||[]);
        setTimeout(()=>{setInviteMsg("");setInviteOpen(false);},2000);
      }catch(err){
        setInviteMsg("Failed to send invite. "+((err)?.message||""));
      }
      setInviteSending(false);
    };
    const cancelInvite=async(inviteId)=>{
      try{
        const {error}=await supabase.from('team_invites').delete().eq('id',inviteId);
        if(error) throw error;
        setPendingInvites(prev=>prev.filter(i=>i.id!==inviteId));
      }catch(err){
        console.error('Cancel invite failed:',err);
      }
    };
    const saveTeamInfo=async()=>{
      if(!teamData) return;
      setTeamSaving(true);
      try{
        const {error}=await supabase.from('teams').update({description:teamDesc,team_info:{...teamData.team_info,value_prop:teamValueProp,content_preferences:contentPrefs,growth_goal:teamGrowthGoal}}).eq('id',teamData.id);
        if(error) throw error;
        setTeamSaved(true);setTimeout(()=>setTeamSaved(false),3000);
      }catch(err){
        console.error('Save team info failed:',err);
      }
      setTeamSaving(false);
    };
    if(teamLoading) return <div style={{textAlign:"center",padding:60,color:T.m}}>Loading team...</div>;
    if(!teamData) return <div style={{textAlign:"center",padding:60,color:T.m}}>No team found. Contact support to set up your team.</div>;
    const members=teamData.team_members||[];
    return (
      <div style={{maxWidth:800,margin:"0 auto"}}>
        {/* Team Header */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24,marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontSize:22,fontWeight:800,color:T.t}}>{teamData.name}</div>
              <div style={{fontSize:13,color:T.s,marginTop:4}}>{teamData.brokerage||""} {teamData.market?"· "+teamData.market:""}</div>
            </div>
            <div style={{padding:"6px 14px",borderRadius:8,background:T.a+"15",color:T.a,fontSize:13,fontWeight:700}}>{members.length}/5 seats</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:T.d,borderRadius:8}}>
            <span style={{fontSize:13,color:T.s}}>Team Blog:</span>
            <a href={`https://rkrt.in/${teamData.slug}`} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:T.bl,fontWeight:600,textDecoration:"none",fontFamily:"monospace"}}>rkrt.in/{teamData.slug}</a>
            <CopyButton text={`https://rkrt.in/${teamData.slug}`} label="Copy"/>
          </div>
        </div>

        {/* Team Info */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24,marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:16}}>Team Info</div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <div style={{fontSize:12,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>DESCRIPTION</div>
              <textarea value={teamDesc} onChange={e=>setTeamDesc(e.target.value)} rows={3} placeholder="Describe your team..." style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:12,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>WHAT MAKES YOUR TEAM SPECIAL</div>
              <textarea value={teamValueProp} onChange={e=>setTeamValueProp(e.target.value)} rows={3} placeholder="Your team's value proposition..." style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:12,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>CONTENT PREFERENCES</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {[["success_stories","Success Stories"],["culture","Team Culture"],["training","Training"],["commission_info","Commission Info"],["recruiting_tips","Recruiting Tips"]].map(([k,label])=>(
                  <div key={k} onClick={()=>setContentPrefs(p=>({...p,[k]:!p[k]}))} style={{padding:"8px 14px",borderRadius:8,background:contentPrefs[k]?T.a+"18":T.d,border:`1px solid ${contentPrefs[k]?T.a+"40":T.b}`,color:contentPrefs[k]?T.a:T.m,fontSize:13,fontWeight:600,cursor:"pointer"}}>{label}</div>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:12,color:T.m,letterSpacing:1.2,fontWeight:700,marginBottom:6}}>GROWTH GOAL</div>
              <input value={teamGrowthGoal} onChange={e=>setTeamGrowthGoal(e.target.value)} placeholder="e.g., Recruit 10 agents this quarter" style={{width:"100%",padding:"12px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div onClick={saveTeamInfo} style={{padding:"12px 24px",borderRadius:8,background:teamSaving?T.m:T.a,color:"#000",fontSize:14,fontWeight:700,cursor:teamSaving?"default":"pointer"}}>{teamSaving?"Saving...":"Save Team Info"}</div>
              {teamSaved&&<span style={{fontSize:13,color:T.a,fontWeight:600}}>Saved!</span>}
            </div>
          </div>
        </div>

        {/* Members */}
        <div style={{background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:700,color:T.t}}>Members</div>
            <div onClick={()=>setInviteOpen(true)} style={{padding:"8px 16px",borderRadius:8,background:T.a+"18",border:`1px solid ${T.a}40`,color:T.a,fontSize:13,fontWeight:600,cursor:"pointer"}}>Invite Member</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {members.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:T.d,borderRadius:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:T.t}}>{m.profiles?.full_name||"Unknown"}</div>
                  <div style={{fontSize:12,color:T.s}}>{m.profiles?.email||""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{padding:"4px 10px",borderRadius:6,background:m.role==="leader"?T.a+"18":T.d,color:m.role==="leader"?T.a:T.m,fontSize:11,fontWeight:700,textTransform:"capitalize"}}>{m.role||"member"}</span>
                  <span style={{fontSize:11,color:T.m}}>{m.joined_at?new Date(m.joined_at).toLocaleDateString():""}</span>
                </div>
              </div>
            ))}
            {/* Pending invites */}
            {pendingInvites.map(inv=>(
              <div key={inv.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:T.d,borderRadius:8,border:"1px dashed #F59E0B40"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:T.t}}>{inv.email}</div>
                  <div style={{fontSize:12,color:T.m}}>Invited {new Date(inv.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{padding:"4px 10px",borderRadius:6,background:"#F59E0B18",color:"#F59E0B",fontSize:11,fontWeight:700}}>Pending</span>
                  <span onClick={()=>cancelInvite(inv.id)} style={{fontSize:11,color:"#F85149",cursor:"pointer",fontWeight:600}}>Cancel</span>
                </div>
              </div>
            ))}
            {members.length===0&&pendingInvites.length===0&&<div style={{textAlign:"center",padding:20,color:T.m,fontSize:13}}>No members yet</div>}
          </div>
        </div>

        {/* Invite Modal */}
        {inviteOpen&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setInviteOpen(false)}>
            <div style={{width:"100%",maxWidth:420,background:T.card,border:`1px solid ${T.b}`,borderRadius:12,padding:24}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:16,fontWeight:700,color:T.t,marginBottom:16}}>Invite Team Member</div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:T.m,fontWeight:700,letterSpacing:1,marginBottom:6}}>EMAIL</div>
                <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="colleague@email.com" style={{width:"100%",padding:"10px 14px",borderRadius:8,background:T.d,border:`1px solid ${T.b}`,color:T.t,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,color:T.m,fontWeight:700,letterSpacing:1,marginBottom:6}}>ROLE</div>
                <div style={{display:"flex",gap:8}}>
                  {["member","admin"].map(r=>(
                    <div key={r} onClick={()=>setInviteRole(r)} style={{padding:"8px 18px",borderRadius:8,background:inviteRole===r?T.a+"20":"transparent",border:`1px solid ${inviteRole===r?T.a:T.b}`,color:inviteRole===r?T.a:T.s,fontSize:13,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{r}</div>
                  ))}
                </div>
              </div>
              {inviteMsg&&<div style={{fontSize:13,color:inviteMsg.startsWith("Failed")?T.r:T.a,marginBottom:12,fontWeight:600}}>{inviteMsg}</div>}
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <div onClick={()=>setInviteOpen(false)} style={{padding:"10px 18px",borderRadius:8,background:T.d,color:T.s,fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancel</div>
                <div onClick={sendInvite} style={{padding:"10px 18px",borderRadius:8,background:inviteEmail.trim()&&!inviteSending?T.a:"#333",color:inviteEmail.trim()&&!inviteSending?"#000":T.m,fontSize:13,fontWeight:700,cursor:inviteEmail.trim()&&!inviteSending?"pointer":"default"}}>{inviteSending?"Sending...":"Send Invite"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}
